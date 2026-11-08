"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Clock, Maximize2, Minimize2, Minus, Package, Pencil, Plus, Search, Store, Trash2, UserRound } from "lucide-react";
import { Alert } from "@/components/molecules/alert";
import { buttonVariants } from "@/components/atoms/button-variants";
import { inputClasses } from "@/components/atoms/input";
import { Select } from "@/components/atoms/select";
import { Textarea } from "@/components/atoms/textarea";
import { Field } from "@/components/molecules/field";
import { MoneyInput } from "@/components/molecules/money-input";
import { useToast } from "@/components/molecules/toast";
import { FormDialog } from "@/components/organisms/form-sheet";
import { useCurrentUserName } from "@/components/providers/current-user";
import ReturnDialog from "./return-dialog";
import { closeTurnAction, posPricingAction, scanBarcodeAction, sellAction } from "@/app/[tenant]/(app)/pos/actions";
import { isNetworkFailure } from "@/lib/business/pos/offline-queue";
import { newSaleId, useOfflineSales } from "./use-offline-sales";
import { cartTotals, MAX_CUSTOM_NOTE, settlePayments, tipFor } from "@/lib/business/pos/cart";
import { tierPrice } from "@/lib/business/catalog/pricing";
import type { ListPricing } from "@/lib/business/catalog/pricing-db";
import { formatMoneyInput, parseMoney } from "@/lib/business/sales/money";
import { formatCurrency } from "@/lib/foundation/format";
import type { PaymentMethodOption } from "@/lib/business/sales/payment-methods";
import { cn } from "@/lib/utils";

export type PosProduct = { id: string; name: string; price: number; stock: number | null; sku: string | null; taxRatePct: number; imageUrl?: string | null; categoryId?: string | null; customizable?: boolean; favorite?: boolean };
export type PosCategory = { id: string; name: string; parentId: string | null };
export type PosCustomer = { id: string; name: string };
type Line = { productId: string; quantity: number; discountPct: number; note?: string; unitPrice?: number };
type Pay = { methodId: string; amount: string };

/** Foto del producto o su icono, dentro de una caja `relative` con tamaño propio (la foto nunca la ensancha). */
function Photo({ src }: { src?: string | null }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element -- archivo del negocio servido por /api/files (con sesión)
    <img src={src} alt="" loading="lazy" className="absolute inset-0 size-full max-w-none object-cover" />
  ) : (
    <span aria-hidden="true" className="absolute inset-0 grid place-items-center bg-accent-subtle text-accent-text">
      <Package className="size-1/2 max-h-8 max-w-8" strokeWidth={1.5} />
    </span>
  );
}

/** Hora de Bogotá, «3:42 p. m.», que avanza sola (se pinta al montar: el servidor no sabe la hora del cajero). */
function useClock(): string {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const timer = window.setInterval(tick, 15_000);
    return () => window.clearInterval(timer);
  }, []);
  return now ? new Intl.DateTimeFormat("es-CO", { hour: "numeric", minute: "2-digit", timeZone: "America/Bogota" }).format(now) : "";
}

/** Pantalla completa del navegador (como F11), para dejar el punto de venta abierto todo el día. */
function useFullscreen() {
  const on = useSyncExternalStore(
    (notify) => {
      document.addEventListener("fullscreenchange", notify);
      return () => document.removeEventListener("fullscreenchange", notify);
    },
    () => Boolean(document.fullscreenElement),
    () => false,
  );
  // Si el navegador no permite pantalla completa (o el servidor aún no lo sabe), el botón no se ofrece.
  const available = useSyncExternalStore(() => () => {}, () => document.fullscreenEnabled, () => false);
  // Al salir del punto de venta (Inicio, otra app o cerrar el turno) el navegador no se queda en pantalla completa.
  useEffect(
    () => () => {
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    },
    [],
  );
  const toggle = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen().catch(() => {});
  }, []);
  return { on, available, toggle };
}

/**
 * La venta: catálogo con foto y categorías a la izquierda; a la derecha el cliente (opcional), lo seleccionado con su foto, subtotal,
 * impuestos, total y el botón Cobrar (F4). Arriba, la caja, quién atiende y la hora; con «Pantalla completa» queda para trabajar todo
 * el día. Un producto marcado como personalizable se vende «a medida»: nota de lo pedido y precio acordado en su renglón.
 */
export default function Sale({ slug, turn, products, categories, customers, methods }: { slug: string; turn: { sessionId: string; terminalName: string; openingAmount: number }; products: PosProduct[]; categories: PosCategory[]; customers: PosCustomer[]; methods: PaymentMethodOption[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const cashier = useCurrentUserName();
  const clock = useClock();
  const fullscreen = useFullscreen();
  // Modo pantalla completa del negocio (sin barra superior, a todo el ancho): solo mientras la venta está montada.
  useEffect(() => {
    document.documentElement.dataset.kiosk = "";
    return () => {
      delete document.documentElement.dataset.kiosk;
    };
  }, []);
  const [pending, start] = useTransition();
  const offline = useOfflineSales(slug, (r) => {
    toast(`Venta sin conexión enviada: ${r.code ?? `N.º ${r.number}`} · ${formatCurrency(r.total)}`, "success");
    router.refresh();
  });
  const [q, setQ] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  // Precios de la lista del cliente (la predeterminada si no hay cliente): se vuelven a pedir al cambiar de cliente; el servidor los recalcula al cobrar.
  const [pricing, setPricing] = useState<Record<string, ListPricing>>({});
  const [tipPct, setTipPct] = useState(0);
  const firstMethod = (methods.find((m) => m.kind === "CASH") ?? methods[0])?.id ?? "";
  const [pays, setPays] = useState<Pay[]>([{ methodId: firstMethod, amount: "" }]);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ id: string; number: number; code?: string; total: number; tip: number; change: number } | null>(null);
  const [returning, setReturning] = useState(false);
  const [closing, setClosing] = useState(false);
  const [customizing, setCustomizing] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [agreed, setAgreed] = useState<number | null>(null);
  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const topCategories = categories.filter((c) => !c.parentId);
  const inCategory = useMemo(() => (categoryId ? new Set([categoryId, ...categories.filter((c) => c.parentId === categoryId).map((c) => c.id)]) : null), [categoryId, categories]);
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return products
      .filter((p) => !inCategory || (p.categoryId && inCategory.has(p.categoryId)))
      .filter((p) => !t || p.name.toLowerCase().includes(t) || p.sku?.toLowerCase() === t)
      .slice(0, 120);
  }, [products, q, inCategory]);

  const priceOf = (l: Line) => l.unitPrice ?? tierPrice(byId.get(l.productId)!.price, pricing[l.productId]?.list, pricing[l.productId]?.tiers, l.quantity);
  const docLines = lines.map((l) => ({ description: byId.get(l.productId)!.name, quantity: l.quantity, unitPrice: priceOf(l), discountPct: l.discountPct, taxRatePct: byId.get(l.productId)!.taxRatePct }));
  const totals = cartTotals(docLines);
  const tip = tipFor({ pct: tipPct }, totals);
  const due = totals.total + tip;
  const methodOf = (id: string) => methods.find((m) => m.id === id);
  const payNums = pays.map((p) => ({ method: methodOf(p.methodId)?.kind ?? "CASH", methodId: p.methodId, amount: Number(p.amount.replace(",", ".")) || 0 }));
  const settled = settlePayments(due, payNums);
  // A crédito la venta debe quedar a nombre de alguien: lo que se debe pasa a su cartera.
  const needsCustomer = !customerId && payNums.some((p) => p.method === "CREDIT" && p.amount > 0);
  const canCharge = !pending && lines.length > 0 && !("error" in settled) && !needsCustomer;

  useEffect(() => {
    let alive = true;
    void posPricingAction(slug, customerId || null).then((r) => {
      if (alive) setPricing(r.ok ? r.pricing : {});
    });
    return () => {
      alive = false;
    };
  }, [slug, customerId]);

  const add = (id: string) => setLines((ls) => (ls.some((l) => l.productId === id) ? ls.map((l) => (l.productId === id ? { ...l, quantity: l.quantity + 1 } : l)) : [...ls, { productId: id, quantity: 1, discountPct: 0 }]));
  const patch = (id: string, change: Partial<Line>) => setLines((ls) => ls.map((l) => (l.productId === id ? { ...l, ...change } : l)).filter((l) => l.quantity > 0));

  const charge = () =>
    start(async () => {
      setError(null);
      const input = { lines: lines.map((l) => ({ productId: l.productId, quantity: l.quantity, discountPct: l.discountPct, note: l.note, unitPrice: l.unitPrice })), tip: { pct: tipPct }, payments: payNums, customerId: customerId || null, clientSaleId: newSaleId() };
      const clearSale = () => {
        setLines([]);
        setPays([{ methodId: firstMethod, amount: "" }]);
        setTipPct(0);
        setCustomerId("");
      };
      // Sin internet: la venta se guarda en este dispositivo y se envía sola al volver la conexión (el servidor no la repite).
      const saveOffline = () => {
        if (payNums.some((p) => p.method === "CREDIT" && p.amount > 0)) return setError("Sin conexión no se puede vender a crédito: la venta necesita validar al cliente. Cobra con otro medio o espera la conexión.");
        const label = `${lines.reduce((n, l) => n + l.quantity, 0)} u. · ${formatCurrency(due)}`;
        if (!offline.save({ id: input.clientSaleId, at: new Date().toISOString(), label, input })) return setError("Hay demasiadas ventas sin enviar. Espera la conexión antes de seguir vendiendo.");
        clearSale();
        toast("Sin conexión: la venta quedó guardada y se enviará sola", "info");
      };
      if (typeof navigator !== "undefined" && navigator.onLine === false) return saveOffline();
      let r;
      try {
        r = await sellAction(slug, input);
      } catch (e) {
        if (isNetworkFailure(e)) return saveOffline();
        throw e;
      }
      if (!r.ok) return setError(r.message);
      setDone({ id: r.documentId, number: r.number, code: r.code, total: r.total, tip: r.tip, change: r.change });
      clearSale();
      toast(`Venta ${r.code ?? `N.º ${r.number}`} registrada`, "success");
      router.refresh();
    });

  // F4 cobra, como en una caja registradora. La función vigente se guarda en una referencia para no volver a suscribir el atajo.
  const chargeRef = useRef<() => void>(() => {});
  useEffect(() => {
    chargeRef.current = canCharge ? charge : () => {};
  });
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "F4") return;
      event.preventDefault();
      chargeRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const openCustomize = (l: Line) => {
    setNote(l.note ?? "");
    setAgreed(l.unitPrice ?? null);
    setCustomizing(l.productId);
  };
  const customProduct = customizing ? byId.get(customizing) : null;

  return (
    <div className="grid gap-2 lg:h-[calc(100dvh-16px)] lg:grid-rows-[auto_minmax(0,1fr)]">
      <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-2 text-ui">
        <a href={`/${slug}`} className={buttonVariants({ variant: "ghost", size: "sm" })}><ArrowLeft aria-hidden="true" className="size-4" />Inicio</a>
        <span className="inline-flex items-center gap-1.5 rounded-md bg-surface-muted px-2.5 py-1 font-medium"><Store aria-hidden="true" className="size-4 text-accent-text" />{turn.terminalName}</span>
        {cashier ? <span className="inline-flex items-center gap-1.5 text-muted-foreground"><UserRound aria-hidden="true" className="size-4" /><span className="sr-only">Cajero: </span>{cashier}</span> : null}
        {clock ? <span className="inline-flex items-center gap-1.5 tabular-nums text-muted-foreground"><Clock aria-hidden="true" className="size-4" /><span className="sr-only">Hora: </span>{clock}</span> : null}
        <span className="text-muted-foreground max-md:hidden">Turno con {formatCurrency(turn.openingAmount)} de apertura</span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {fullscreen.available ? (
            <button type="button" aria-pressed={fullscreen.on} onClick={fullscreen.toggle} className={buttonVariants({ variant: "outline", size: "sm" })}>
              {fullscreen.on ? <Minimize2 aria-hidden="true" className="size-4" /> : <Maximize2 aria-hidden="true" className="size-4" />}
              {fullscreen.on ? "Salir de pantalla completa" : "Pantalla completa"}
            </button>
          ) : null}
          <button type="button" onClick={() => setReturning(true)} className={buttonVariants({ variant: "outline", size: "sm" })}>Devolución</button>
          <button type="button" onClick={() => setClosing(true)} className={buttonVariants({ variant: "outline", size: "sm" })}>Cerrar turno</button>
        </div>
      </div>
      {done ? (
        <Alert tone="success">
          Venta {done.code ?? `N.º ${done.number}`} · {formatCurrency(done.total)}
          {done.tip ? ` + propina ${formatCurrency(done.tip)}` : ""}
          {done.change ? ` · Cambio ${formatCurrency(done.change)}` : ""}
          {" · "}
          <a href={`/${slug}/pos/receipt/${done.id}`} target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-2">Imprimir tiquete</a>
        </Alert>
      ) : null}
      {offline.queue.length > 0 ? (
        <Alert tone="warning">
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <b>{offline.queue.length} {offline.queue.length === 1 ? "venta sin enviar" : "ventas sin enviar"}</b>
            <span>{offline.queue.some((q) => q.error) ? "Algunas no pasaron: revísalas." : "Se enviarán solas al volver la conexión."}</span>
            <button type="button" disabled={offline.sending} onClick={() => void offline.flush()} className="font-semibold underline underline-offset-2 disabled:opacity-60">{offline.sending ? "Enviando…" : "Enviar ahora"}</button>
          </span>
          {offline.queue.filter((q) => q.error).map((q) => (
            <span key={q.id} className="mt-1 flex flex-wrap items-center gap-2 text-ui"><span>{q.label}: {q.error}</span><button type="button" onClick={() => offline.discard(q.id)} className="font-semibold underline underline-offset-2">Descartar</button></span>
          ))}
        </Alert>
      ) : null}
      </div>
      <div className="grid min-h-0 gap-3 lg:grid-cols-[minmax(0,1fr)_400px]">
        <section aria-label="Productos" className="flex min-h-0 min-w-0 flex-col gap-3">
          <div className="relative">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              aria-label="Buscar producto o escanear código"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={async (e) => {
                // Un escáner teclea el código y manda Enter: se busca por código de barras.
                if (e.key !== "Enter" || !/^\d{6,}$/.test(q.trim())) return;
                e.preventDefault();
                const r = await scanBarcodeAction(slug, q.trim());
                if (r.ok) {
                  add(r.productId);
                  setQ("");
                  setError(null);
                } else setError(r.message);
              }}
              placeholder="Buscar producto o escanear código de barras"
              className={cn(inputClasses, "pl-9")}
            />
          </div>
          {topCategories.length > 0 ? (
            <div role="group" aria-label="Categorías" className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
              {[{ id: "", name: "Todas" }, ...topCategories].map((c) => (
                <button key={c.id || "todas"} type="button" aria-pressed={categoryId === c.id} onClick={() => setCategoryId(c.id)} className={cn("shrink-0 rounded-full border px-3 py-1 text-ui outline-none transition-colors focus-visible:outline-2 focus-visible:outline-ring pointer-coarse:min-h-11", categoryId === c.id ? "border-accent bg-accent-subtle font-medium text-accent-text" : "border-border-input text-foreground/80 hover:border-border-input-hover")}>
                  {c.name}
                </button>
              ))}
            </div>
          ) : null}
          {shown.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-ui text-muted-foreground">{products.length === 0 ? "Aún no hay productos para vender. Créalos en el catálogo." : "Ningún producto coincide con la búsqueda."}</p>
          ) : (
            <ul className="grid min-h-0 flex-1 grid-cols-2 content-start gap-2 overflow-y-auto sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {shown.map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => add(p.id)} disabled={p.stock !== null && p.stock <= 0} className="grid w-full overflow-hidden rounded-lg border border-border bg-surface text-left outline-none transition-colors hover:border-border-strong focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-45">
                    <span className="relative block aspect-[4/3] w-full overflow-hidden bg-surface-muted"><Photo src={p.imageUrl} /></span>
                    <span className="grid gap-0.5 p-2.5">
                      <span className="line-clamp-2 text-ui font-medium leading-snug">{p.name}</span>
                      <span className="font-mono text-xs text-muted-foreground">{formatCurrency(tierPrice(p.price, pricing[p.id]?.list, undefined, 1))}{p.stock !== null ? ` · ${p.stock} u.` : ""}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-label="Venta" className="flex min-h-0 min-w-0 flex-col gap-3 rounded-lg border border-border bg-surface p-4">
          <Select aria-label="Cliente (opcional)" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">Venta sin cliente</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {lines.length === 0 ? <p className="text-ui text-muted-foreground">Toca un producto para agregarlo.</p> : (
              <ul className="grid gap-2">
                {lines.map((l) => {
                  const p = byId.get(l.productId)!;
                  return (
                    <li key={l.productId} className="grid gap-1 border-b border-border pb-2 text-ui">
                      <div className="flex items-center gap-2">
                        <span className="relative block size-9 shrink-0 overflow-hidden rounded-md"><Photo src={p.imageUrl} /></span>
                        <span className="min-w-0 flex-1"><span className="block truncate font-medium">{p.name}</span><span className="block font-mono text-xs text-muted-foreground">{formatCurrency(priceOf(l))}</span></span>
                        <button type="button" aria-label={`Menos ${p.name}`} onClick={() => patch(l.productId, { quantity: l.quantity - 1 })} className={buttonVariants({ variant: "outline", size: "icon" })}><Minus aria-hidden="true" className="size-3.5" /></button>
                        <b className="w-6 text-center font-mono">{l.quantity}</b>
                        <button type="button" aria-label={`Más ${p.name}`} onClick={() => patch(l.productId, { quantity: l.quantity + 1 })} className={buttonVariants({ variant: "outline", size: "icon" })}><Plus aria-hidden="true" className="size-3.5" /></button>
                        <button type="button" aria-label={`Quitar ${p.name}`} onClick={() => patch(l.productId, { quantity: 0 })} className={buttonVariants({ variant: "ghost", size: "icon" })}><Trash2 aria-hidden="true" className="size-3.5" /></button>
                      </div>
                      {l.note ? <p className="ps-11 text-xs text-muted-foreground">{l.note}</p> : null}
                      <div className="flex items-center gap-3 ps-11">
                        <label className="flex items-center gap-2 text-xs text-muted-foreground">
                          Descuento %
                          <input aria-label={`Descuento de ${p.name}`} inputMode="decimal" value={l.discountPct || ""} onChange={(e) => patch(l.productId, { discountPct: Math.min(100, Number(e.target.value.replace(",", ".")) || 0) })} className={`${inputClasses} h-7 w-16 px-2 text-right`} />
                        </label>
                        {p.customizable ? (
                          <button type="button" aria-label={`Personalizar ${p.name}`} onClick={() => openCustomize(l)} className="inline-flex items-center gap-1 text-xs font-medium text-accent-text underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-ring"><Pencil aria-hidden="true" className="size-3" />{l.note || l.unitPrice != null ? "Editar a medida" : "Personalizar"}</button>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <div className="grid gap-3 border-t border-border pt-3">
            <dl className="grid gap-1 text-ui">
              <div className="flex justify-between"><dt>Subtotal</dt><dd className="font-mono tabular-nums">{formatCurrency(totals.subtotal - totals.discountTotal)}</dd></div>
              <div className="flex justify-between"><dt>Impuestos</dt><dd className="font-mono tabular-nums">{formatCurrency(totals.taxTotal)}</dd></div>
              <div className="flex items-center justify-between gap-2">
                <dt><label htmlFor="pos-tip">Propina %</label></dt>
                <dd className="flex items-center gap-2"><input id="pos-tip" inputMode="decimal" value={tipPct || ""} onChange={(e) => setTipPct(Math.max(0, Math.min(100, Number(e.target.value.replace(",", ".")) || 0)))} className={`${inputClasses} h-7 w-16 px-2 text-right`} />{tip ? <span className="font-mono tabular-nums">{formatCurrency(tip)}</span> : null}</dd>
              </div>
              <div className="flex justify-between border-t border-border pt-1.5 text-base font-semibold"><dt>Total a cobrar</dt><dd className="font-mono tabular-nums">{formatCurrency(due)}</dd></div>
            </dl>
            <div className="grid gap-2">
              {pays.map((p, i) => (
                <div key={i} className="flex gap-2">
                  <Select aria-label={`Medio de pago ${i + 1}`} value={p.methodId} onChange={(e) => setPays((ps) => ps.map((x, j) => (j === i ? { ...x, methodId: e.target.value } : x)))} className="w-44">
                    {methods.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </Select>
                  <MoneyInput aria-label={`Valor del pago ${i + 1}`} value={parseMoney(p.amount)} onValueChange={(v) => setPays((ps) => ps.map((x, j) => (j === i ? { ...x, amount: v == null ? "" : String(v) } : x)))} placeholder={i === 0 ? formatMoneyInput(due) : ""} />
                </div>
              ))}
              {pays.map((p, i) => (methodOf(p.methodId)?.instructions ? <p key={`i${i}`} className="rounded-md bg-surface-muted px-3 py-2 text-xs text-muted-foreground">{methodOf(p.methodId)!.instructions}</p> : null))}
              <button type="button" onClick={() => setPays((ps) => [...ps, { methodId: (methods.find((m) => m.kind === "TRANSFER") ?? methods[0])?.id ?? "", amount: "" }])} className={buttonVariants({ variant: "ghost", size: "sm", className: "justify-self-start" })}>Agregar otro pago</button>
              {needsCustomer ? <p className="text-xs text-danger">Para vender a crédito elige el cliente: lo que debe queda en su cartera.</p> : null}
              {"error" in settled && lines.length > 0 && payNums.some((x) => x.amount > 0) ? <p className="text-xs text-muted-foreground">{settled.error}</p> : null}
              {!("error" in settled) && settled.change > 0 ? <p className="text-ui font-medium">Cambio: {formatCurrency(settled.change)}</p> : null}
            </div>
            {error ? <Alert tone="danger">{error}</Alert> : null}
            <button type="button" disabled={!canCharge} onClick={charge} className={buttonVariants({ size: "lg" })}>
              {pending ? "Cobrando…" : <>Cobrar <kbd className="ms-1 rounded border border-current/30 px-1.5 text-xs font-normal opacity-80">F4</kbd></>}
            </button>
          </div>
        </section>
      </div>
      <ReturnDialog slug={slug} open={returning} onClose={() => setReturning(false)} />
      <FormDialog
        open={customizing !== null}
        onOpenChange={(open) => !open && setCustomizing(null)}
        title={customProduct ? `A medida: ${customProduct.name}` : "A medida"}
        description="Lo que pidió el cliente y, si lo acordaron, el precio. Sale en la factura."
        submitLabel="Aplicar"
        onSubmit={() => {
          if (customizing) patch(customizing, { note: note.trim().slice(0, MAX_CUSTOM_NOTE) || undefined, unitPrice: agreed ?? undefined });
          return { ok: true };
        }}
      >
        <Field label="Qué se pidió" hint="Texto, arte, talla, color… lo que haga falta para producirlo.">{(c) => <Textarea {...c} value={note} maxLength={MAX_CUSTOM_NOTE} onChange={(e) => setNote(e.target.value)} />}</Field>
        <Field label="Precio acordado" optional hint={customProduct ? `Si lo dejas vacío se cobra ${formatCurrency(customProduct.price)}.` : undefined}>{(c) => <MoneyInput id={c.id} aria-describedby={c["aria-describedby"]} value={agreed} onValueChange={setAgreed} />}</Field>
      </FormDialog>
      <FormDialog
        open={closing}
        onOpenChange={setClosing}
        title="Cerrar turno"
        description="Cuenta el efectivo de la caja y escríbelo; el sistema calcula la diferencia."
        submitLabel="Cerrar turno"
        pendingLabel="Cerrando…"
        destructive
        onSubmit={async (d) => {
          const raw = String(d.get("counted") ?? "").trim();
          const counted = Number(raw.replace(",", "."));
          if (!raw || !(counted >= 0)) return { ok: false, message: "Revisa los campos marcados.", fieldErrors: { counted: "Escribe el efectivo contado." } };
          const r = await closeTurnAction(slug, turn.sessionId, counted, String(d.get("notes") ?? ""));
          return r.ok ? { ok: true, message: r.message } : { ok: false, message: r.message };
        }}
        onSuccess={({ message }) => {
          if (message) toast(message, "success");
          router.refresh();
        }}
      >
        {({ fieldErrors }) => (
          <div className="grid gap-3">
            <Field label="Efectivo contado" required error={fieldErrors.counted}>{(c) => <MoneyInput {...c} name="counted" />}</Field>
            <Field label="Notas" optional>{(c) => <input {...c} name="notes" autoComplete="off" maxLength={300} className={inputClasses} />}</Field>
          </div>
        )}
      </FormDialog>
    </div>
  );
}
