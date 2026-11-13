"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SearchField } from "@/components/molecules/search-field";
import { SegmentedControl } from "@/components/molecules/segmented-control";
import { buttonVariants } from "@/components/atoms/button-variants";
import { Select } from "@/components/atoms/select";
import { inputClasses } from "@/components/atoms/input";
import { DateInput } from "@/components/molecules/date-input";
import { Field } from "@/components/molecules/field";
import { FormDialog } from "@/components/organisms/form-sheet";
import { EmptyState } from "@/components/molecules/empty-state";
import { useToast } from "@/components/molecules/toast";
import { useConfirm } from "@/components/organisms/confirm-dialog";
import { confirmDeliveryAction, dispatchOrderAction, advanceOrderAction, type OrderResult } from "@/app/[tenant]/(app)/ventas/pedidos/actions";
import { FULFILLMENT_TEXT, type Fulfillment } from "@/lib/business/store/fulfillment";
import type { OrderRow } from "@/lib/business/store/store-db";
import { cn } from "@/lib/utils";
import { OrderCard } from "./order-card";
import { OrderSheet } from "./order-sheet";

/** Pedidos por página: tres columnas de cuatro filas en PC. */
const PAGE_SIZE = 12;
const FILTERS = ["all", "RECEIVED", "CONFIRMED", "IN_PRODUCTION", "READY", "SHIPPED", "DELIVERED", "CANCELED"] as const;
type Filter = (typeof FILTERS)[number];

/** Números de página con puntos suspensivos cuando hay muchas: 1 … 4 5 6 … 12. */
function pageNumbers(page: number, pages: number): (number | "…")[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const around = [page - 1, page, page + 1].filter((n) => n > 1 && n < pages);
  return [1, ...(around[0]! > 2 ? (["…"] as const) : []), ...around, ...(around[around.length - 1]! < pages - 1 ? (["…"] as const) : []), pages];
}

/**
 * Pedidos por cumplimiento, en tarjetas: filtro por paso, búsqueda, paginación y, al abrir uno, su panel lateral. La acción siguiente va a un toque en
 * la tarjeta y el resto en el panel. El pago no se mezcla con el cumplimiento.
 */
export default function OrdersView({ slug, orders, canCharge = true }: { slug: string; orders: OrderRow[]; /** Quien produce no maneja dinero: sin cobros, sin cancelar y sin totales. */ canCharge?: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const [confirm, confirmDialog] = useConfirm();
  const [dialog, setDialog] = useState<{ order: OrderRow; kind: "dispatch" | "receive" } | null>(null);
  const [method, setMethod] = useState("COURIER");
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const count = (f: Fulfillment) => orders.filter((o) => o.fulfillment === f).length;
  const needle = query.trim().toLocaleLowerCase("es");
  const list = orders
    .filter((o) => filter === "all" || o.fulfillment === filter)
    .filter((o) => !needle || [o.code, o.customerName, o.phone, ...o.lines.map((l) => l.name)].some((t) => t.toLocaleLowerCase("es").includes(needle)));
  const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const visible = list.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  // El panel lee el pedido de la lista (que se refresca tras cada paso): así siempre muestra su estado vigente.
  const selected = orders.find((o) => o.id === selectedId) ?? null;

  const move = async (orderId: string, to: Fulfillment) => {
    const o = orders.find((x) => x.id === orderId);
    if (!o) return;
    // Enviar y entregar piden datos (guía, quién recibió): se resuelven en su diálogo, con el panel cerrado para no apilar capas.
    if (to === "SHIPPED" || to === "DELIVERED") {
      setSheetOpen(false);
      return setDialog({ order: o, kind: to === "SHIPPED" ? "dispatch" : "receive" });
    }
    if (to === "CANCELED" && !(await confirm({ title: `¿Cancelar el pedido ${o.code}?`, description: o.status === "PAID" ? "El pedido ya está pagado: cancelarlo no devuelve el dinero, eso se hace desde Cobros en línea." : "Se anula su cobro pendiente.", confirmLabel: "Cancelar pedido", tone: "danger" }))) return;
    const r: OrderResult = await advanceOrderAction(slug, o.id, to);
    toast(r.message, r.ok ? "success" : "error");
    if (r.ok) router.refresh();
  };

  if (orders.length === 0) return <EmptyState mark="page" title="Aún no hay pedidos" description="Cuando un cliente pida desde tu sitio, o apruebes una cotización, el pedido aparece aquí." />;
  return (
    <div className="grid min-w-0 grid-cols-1 gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 max-w-full overflow-x-auto pb-1">
          <SegmentedControl
            ariaLabel="Filtrar por cumplimiento"
            size="sm"
            value={filter}
            onChange={(f) => {
              setFilter(f);
              setPage(1);
            }}
            options={FILTERS.map((f) => ({ value: f, label: f === "all" ? "Todos" : FULFILLMENT_TEXT[f], count: f === "all" ? orders.length : count(f) }))}
          />
        </div>
        <SearchField
          aria-label="Buscar pedidos"
          placeholder="Buscar por cliente, código o producto"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
          containerClassName="max-w-sm"
        />
      </div>

      {list.length === 0 ? <EmptyState mark="page" remember={false} title={needle ? "Ningún pedido coincide" : "Nada en este paso"} description={needle ? "Prueba con otro nombre, código o producto." : "Cambia el filtro para ver los demás pedidos."} /> : null}

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((o) => (
          <li key={o.id} className="grid min-w-0">
            <OrderCard
              order={o}
              canCharge={canCharge}
              onOpen={(id) => {
                setSelectedId(id);
                setSheetOpen(true);
              }}
              onMove={move}
            />
          </li>
        ))}
      </ul>

      {list.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-surface-muted px-4 py-2.5">
          <p className="text-ui text-muted-foreground" aria-live="polite">
            Mostrando {(current - 1) * PAGE_SIZE + 1}–{Math.min(current * PAGE_SIZE, list.length)} de {list.length} {list.length === 1 ? "pedido" : "pedidos"}
          </p>
          {pages > 1 ? (
            <nav aria-label="Páginas de pedidos" className="flex items-center gap-1">
              <button type="button" aria-label="Página anterior" disabled={current === 1} onClick={() => setPage(current - 1)} className={buttonVariants({ variant: "ghost", size: "icon-sm" })}>
                ‹
              </button>
              {pageNumbers(current, pages).map((n, i) =>
                n === "…" ? (
                  <span key={`gap-${i}`} aria-hidden="true" className="px-1 text-muted-foreground">
                    …
                  </span>
                ) : (
                  <button key={n} type="button" aria-label={`Página ${n}`} aria-current={n === current ? "page" : undefined} onClick={() => setPage(n)} className={cn(buttonVariants({ variant: n === current ? "primary" : "ghost", size: "icon-sm" }), "rounded-full tabular-nums")}>
                    {n}
                  </button>
                ),
              )}
              <button type="button" aria-label="Página siguiente" disabled={current === pages} onClick={() => setPage(current + 1)} className={buttonVariants({ variant: "ghost", size: "icon-sm" })}>
                ›
              </button>
            </nav>
          ) : null}
        </div>
      ) : null}

      <OrderSheet order={selected} open={sheetOpen} onOpenChange={setSheetOpen} slug={slug} canCharge={canCharge} onMove={move} />
      <FormDialog
        open={dialog?.kind === "dispatch"}
        onOpenChange={(v) => !v && setDialog(null)}
        title={`Enviar ${dialog?.order.code ?? ""}`}
        description="Anota cómo sale el pedido. El cliente puede ver la guía en su aviso."
        submitLabel="Marcar enviado"
        pendingLabel="Guardando…"
        onSubmit={async (d) => {
          const r = await dispatchOrderAction(slug, dialog!.order.id, { method: String(d.get("method") ?? ""), carrier: String(d.get("carrier") ?? ""), trackingCode: String(d.get("trackingCode") ?? ""), scheduledFor: String(d.get("scheduledFor") ?? ""), note: String(d.get("note") ?? "") });
          return r.ok ? { ok: true, message: r.message } : { ok: false, message: r.message, fieldErrors: r.fields ?? {} };
        }}
        onSuccess={({ message }) => { if (message) toast(message, "success"); setDialog(null); router.refresh(); }}
      >
        {({ fieldErrors }) => (
          <div className="grid gap-3">
            <Field label="Cómo se envía" required error={fieldErrors.method}>
              {(c) => (
                <Select {...c} name="method" value={method} onChange={(e) => setMethod(e.target.value)}>
                  <option value="COURIER">Transportadora</option>
                  <option value="OWN">Reparto propio</option>
                </Select>
              )}
            </Field>
            {method === "COURIER" ? (
              <>
                <Field label="Transportadora" required error={fieldErrors.carrier}>{(c) => <input {...c} name="carrier" autoComplete="off" className={inputClasses} />}</Field>
                <Field label="Número de guía" required error={fieldErrors.trackingCode}>{(c) => <input {...c} name="trackingCode" autoComplete="off" className={inputClasses} />}</Field>
              </>
            ) : null}
            <Field label="Fecha prometida" error={fieldErrors.scheduledFor}>{(c) => <DateInput {...c} name="scheduledFor" className={inputClasses} />}</Field>
            <Field label="Nota">{(c) => <input {...c} name="note" maxLength={200} autoComplete="off" className={inputClasses} />}</Field>
          </div>
        )}
      </FormDialog>
      <FormDialog
        open={dialog?.kind === "receive"}
        onOpenChange={(v) => !v && setDialog(null)}
        title={`Confirmar entrega de ${dialog?.order.code ?? ""}`}
        description={dialog && dialog.order.status !== "PAID" ? "Este pedido aún no está pagado: al entregar te recordaremos el saldo por cobrar." : "Deja constancia de quién recibió el pedido."}
        submitLabel="Marcar entregado"
        pendingLabel="Guardando…"
        onSubmit={async (d) => {
          const r = await confirmDeliveryAction(slug, dialog!.order.id, String(d.get("receivedBy") ?? ""));
          return r.ok ? { ok: true, message: r.message } : { ok: false, message: r.message, fieldErrors: {} };
        }}
        onSuccess={({ message }) => { if (message) toast(message, "success"); setDialog(null); router.refresh(); }}
      >
        {({ fieldErrors }) => (
          <Field label="Quién recibió" error={fieldErrors.receivedBy} hint="Opcional.">{(c) => <input {...c} name="receivedBy" autoComplete="off" className={inputClasses} />}</Field>
        )}
      </FormDialog>
      {confirmDialog}
    </div>
  );
}

