"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, Trash2 } from "lucide-react";
import { Alert } from "@/components/molecules/alert";
import { buttonVariants } from "@/components/atoms/button-variants";
import { inputClasses } from "@/components/atoms/input";
import { Select } from "@/components/atoms/select";
import { Field } from "@/components/molecules/field";
import { useToast } from "@/components/molecules/toast";
import { FormDialog } from "@/components/organisms/form-sheet";
import { closeTurnAction, createTerminalAction, openTurnAction, sellAction } from "@/app/[tenant]/(app)/pos/actions";
import { cartTotals, settlePayments, tipFor } from "@/lib/pos/cart";
import { formatCurrency } from "@/lib/format";
import { PAYMENT_METHODS } from "@/lib/finance";

export type PosProduct = { id: string; name: string; price: number; stock: number | null; sku: string | null; taxRatePct: number };
export type PosTerminalOption = { id: string; name: string; busy: boolean };
type Line = { productId: string; quantity: number; discountPct: number };
type Pay = { method: string; amount: string };

export default function PosView({ slug, canManage, terminals, turn, products }: { slug: string; canManage: boolean; terminals: PosTerminalOption[]; turn: { sessionId: string; terminalName: string; openingAmount: number } | null; products: PosProduct[] }) {
  return turn ? <Sale slug={slug} turn={turn} products={products} /> : <NoTurn slug={slug} canManage={canManage} terminals={terminals} />;
}

function NoTurn({ slug, canManage, terminals }: { slug: string; canManage: boolean; terminals: PosTerminalOption[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, start] = useTransition();
  const [terminalId, setTerminalId] = useState(terminals.find((t) => !t.busy)?.id ?? "");
  const [opening, setOpening] = useState("0");
  const [naming, setNaming] = useState(false);
  const run = (fn: () => Promise<{ ok: boolean; message: string }>) =>
    start(async () => {
      const r = await fn();
      toast(r.message, r.ok ? "success" : "error");
      if (r.ok) router.refresh();
    });
  return (
    <section aria-labelledby="pos-open" className="grid max-w-xl gap-4 rounded-lg border border-border bg-surface p-5">
      <h2 id="pos-open" className="font-display text-[15px] font-semibold">Abrir turno</h2>
      {terminals.length === 0 ? (
        <Alert tone="info">{canManage ? "Aún no hay terminales. Crea la primera para empezar a vender." : "Aún no hay terminales: pídele al dueño o a administración que cree una."}</Alert>
      ) : (
        <div className="grid gap-3">
          <Field label="Terminal" required>
            {(c) => (
              <Select {...c} value={terminalId} onChange={(e) => setTerminalId(e.target.value)}>
                {terminals.map((t) => <option key={t.id} value={t.id} disabled={t.busy}>{t.name}{t.busy ? " (en uso)" : ""}</option>)}
              </Select>
            )}
          </Field>
          <Field label="Efectivo con el que abres" required hint="Lo que hay en la caja al empezar.">
            {(c) => <input {...c} inputMode="decimal" value={opening} onChange={(e) => setOpening(e.target.value)} className={inputClasses} />}
          </Field>
          <button type="button" disabled={pending || !terminalId} onClick={() => run(() => openTurnAction(slug, terminalId, Number(opening.replace(",", ".")) || 0))} className={buttonVariants({ className: "justify-self-start" })}>
            {pending ? "Abriendo…" : "Abrir turno"}
          </button>
        </div>
      )}
      {canManage ? (
        <button type="button" onClick={() => setNaming(true)} className={buttonVariants({ variant: "outline", size: "sm", className: "justify-self-start" })}>
          <Plus aria-hidden="true" className="size-4" /> Nueva terminal
        </button>
      ) : null}
      <FormDialog
        open={naming}
        onOpenChange={setNaming}
        title="Nueva terminal"
        description="Un puesto de venta con su propia caja (mostrador, sede, tablet…)."
        submitLabel="Crear terminal"
        pendingLabel="Creando…"
        onSubmit={async (d) => {
          const r = await createTerminalAction(slug, String(d.get("name") ?? ""));
          return r.ok ? { ok: true, message: r.message } : { ok: false, message: r.message, fieldErrors: { name: r.message } };
        }}
        onSuccess={({ message }) => {
          if (message) toast(message, "success");
          router.refresh();
        }}
      >
        {({ fieldErrors }) => <Field label="Nombre" required error={fieldErrors.name}>{(c) => <input {...c} name="name" autoComplete="off" className={inputClasses} placeholder="Mostrador 1" />}</Field>}
      </FormDialog>
    </section>
  );
}

function Sale({ slug, turn, products }: { slug: string; turn: { sessionId: string; terminalName: string; openingAmount: number }; products: PosProduct[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, start] = useTransition();
  const [q, setQ] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [tipPct, setTipPct] = useState(0);
  const [pays, setPays] = useState<Pay[]>([{ method: "CASH", amount: "" }]);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ number: number; total: number; tip: number; change: number } | null>(null);
  const [closing, setClosing] = useState(false);
  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (t ? products.filter((p) => p.name.toLowerCase().includes(t) || p.sku?.toLowerCase() === t) : products).slice(0, 60);
  }, [products, q]);

  const docLines = lines.map((l) => ({ description: byId.get(l.productId)!.name, quantity: l.quantity, unitPrice: byId.get(l.productId)!.price, discountPct: l.discountPct, taxRatePct: byId.get(l.productId)!.taxRatePct }));
  const totals = cartTotals(docLines);
  const tip = tipFor({ pct: tipPct }, totals);
  const due = totals.total + tip;
  const payNums = pays.map((p) => ({ method: p.method, amount: Number(p.amount.replace(",", ".")) || 0 }));
  const settled = settlePayments(due, payNums);

  const add = (id: string) => setLines((ls) => (ls.some((l) => l.productId === id) ? ls.map((l) => (l.productId === id ? { ...l, quantity: l.quantity + 1 } : l)) : [...ls, { productId: id, quantity: 1, discountPct: 0 }]));
  const patch = (id: string, change: Partial<Line>) => setLines((ls) => ls.map((l) => (l.productId === id ? { ...l, ...change } : l)).filter((l) => l.quantity > 0));

  const charge = () =>
    start(async () => {
      setError(null);
      const r = await sellAction(slug, { lines, tip: { pct: tipPct }, payments: payNums });
      if (!r.ok) return setError(r.message);
      setDone({ number: r.number, total: r.total, tip: r.tip, change: r.change });
      setLines([]);
      setPays([{ method: "CASH", amount: "" }]);
      setTipPct(0);
      toast(`Venta N.º ${r.number} registrada`, "success");
      router.refresh();
    });

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2 text-[13px]">
        <span className="rounded-md bg-surface-muted px-2.5 py-1 font-medium">{turn.terminalName}</span>
        <span className="text-muted-foreground">Turno con {formatCurrency(turn.openingAmount)} de apertura</span>
        <button type="button" onClick={() => setClosing(true)} className={buttonVariants({ variant: "outline", size: "sm", className: "ml-auto" })}>Cerrar turno</button>
      </div>
      {done ? (
        <Alert tone="success">
          Venta N.º {done.number} · {formatCurrency(done.total)}
          {done.tip ? ` + propina ${formatCurrency(done.tip)}` : ""}
          {done.change ? ` · Cambio ${formatCurrency(done.change)}` : ""}
        </Alert>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <section aria-label="Productos" className="grid content-start gap-3">
          <input aria-label="Buscar producto o SKU" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar producto o escanear SKU" className={inputClasses} />
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {shown.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => add(p.id)} disabled={p.stock !== null && p.stock <= 0} className="grid min-h-[72px] w-full content-between rounded-md border border-border bg-surface p-3 text-left hover:border-border-input disabled:opacity-50">
                  <span className="text-[13px] font-medium leading-snug">{p.name}</span>
                  <span className="font-mono text-[12px] text-muted-foreground">{formatCurrency(p.price)}{p.stock !== null ? ` · ${p.stock} u.` : ""}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section aria-label="Venta" className="grid content-start gap-3 rounded-lg border border-border bg-surface p-4">
          {lines.length === 0 ? <p className="text-[13px] text-muted-foreground">Toca un producto para agregarlo.</p> : (
            <ul className="grid gap-2">
              {lines.map((l) => {
                const p = byId.get(l.productId)!;
                return (
                  <li key={l.productId} className="grid gap-1 border-b border-border pb-2 text-[13px]">
                    <div className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate font-medium">{p.name}</span>
                      <button type="button" aria-label={`Menos ${p.name}`} onClick={() => patch(l.productId, { quantity: l.quantity - 1 })} className={buttonVariants({ variant: "outline", size: "icon" })}><Minus aria-hidden="true" className="size-3.5" /></button>
                      <b className="w-6 text-center font-mono">{l.quantity}</b>
                      <button type="button" aria-label={`Más ${p.name}`} onClick={() => patch(l.productId, { quantity: l.quantity + 1 })} className={buttonVariants({ variant: "outline", size: "icon" })}><Plus aria-hidden="true" className="size-3.5" /></button>
                      <button type="button" aria-label={`Quitar ${p.name}`} onClick={() => patch(l.productId, { quantity: 0 })} className={buttonVariants({ variant: "ghost", size: "icon" })}><Trash2 aria-hidden="true" className="size-3.5" /></button>
                    </div>
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      Descuento %
                      <input aria-label={`Descuento de ${p.name}`} inputMode="decimal" value={l.discountPct || ""} onChange={(e) => patch(l.productId, { discountPct: Math.min(100, Number(e.target.value.replace(",", ".")) || 0) })} className={`${inputClasses} h-7 w-16 px-2 text-xs`} />
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
          <dl className="grid gap-1 text-[13px]">
            <div className="flex justify-between"><dt>Subtotal</dt><dd className="font-mono tabular-nums">{formatCurrency(totals.subtotal - totals.discountTotal)}</dd></div>
            <div className="flex justify-between"><dt>Impuestos</dt><dd className="font-mono tabular-nums">{formatCurrency(totals.taxTotal)}</dd></div>
            <div className="flex items-center justify-between gap-2">
              <dt><label htmlFor="pos-tip">Propina %</label></dt>
              <dd className="flex items-center gap-2"><input id="pos-tip" inputMode="decimal" value={tipPct || ""} onChange={(e) => setTipPct(Math.max(0, Math.min(100, Number(e.target.value.replace(",", ".")) || 0)))} className={`${inputClasses} h-7 w-16 px-2 text-xs`} /><span className="font-mono tabular-nums">{formatCurrency(tip)}</span></dd>
            </div>
            <div className="flex justify-between border-t border-border pt-1.5 text-[15px] font-semibold"><dt>Total a cobrar</dt><dd className="font-mono tabular-nums">{formatCurrency(due)}</dd></div>
          </dl>
          <div className="grid gap-2">
            {pays.map((p, i) => (
              <div key={i} className="flex gap-2">
                <Select aria-label={`Medio de pago ${i + 1}`} value={p.method} onChange={(e) => setPays((ps) => ps.map((x, j) => (j === i ? { ...x, method: e.target.value } : x)))} className="w-36">
                  {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </Select>
                <input aria-label={`Valor del pago ${i + 1}`} inputMode="decimal" value={p.amount} onChange={(e) => setPays((ps) => ps.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)))} placeholder={i === 0 ? String(due) : ""} className={inputClasses} />
              </div>
            ))}
            <button type="button" onClick={() => setPays((ps) => [...ps, { method: "NEQUI", amount: "" }])} className={buttonVariants({ variant: "ghost", size: "sm", className: "justify-self-start" })}>Agregar otro pago</button>
            {"error" in settled && lines.length > 0 && payNums.some((x) => x.amount > 0) ? <p className="text-xs text-muted-foreground">{settled.error}</p> : null}
            {!("error" in settled) && settled.change > 0 ? <p className="text-[13px] font-medium">Cambio: {formatCurrency(settled.change)}</p> : null}
          </div>
          {error ? <Alert tone="danger">{error}</Alert> : null}
          <button type="button" disabled={pending || lines.length === 0 || "error" in settled} onClick={charge} className={buttonVariants({ size: "lg" })}>
            {pending ? "Cobrando…" : "Cobrar"}
          </button>
        </section>
      </div>
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
            <Field label="Efectivo contado" required error={fieldErrors.counted}>{(c) => <input {...c} name="counted" inputMode="decimal" autoComplete="off" className={inputClasses} />}</Field>
            <Field label="Notas" optional>{(c) => <input {...c} name="notes" autoComplete="off" maxLength={300} className={inputClasses} />}</Field>
          </div>
        )}
      </FormDialog>
    </div>
  );
}
