"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/molecules/alert";
import { Badge } from "@/components/atoms/badge";
import { CHANNEL_LABELS, type OrderChannel } from "@/lib/business/store/cart";
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
import { FULFILLMENT_TEXT, allowedNext, isFinal, type Fulfillment } from "@/lib/business/store/fulfillment";
import type { OrderRow } from "@/lib/business/store/store-db";
import { formatCurrency } from "@/lib/foundation/format";

const PAY = { PENDING_PAYMENT: { label: "Esperando pago", tone: "warning" }, PAID: { label: "Pagado", tone: "success" }, ABANDONED: { label: "Sin pagar", tone: "secondary" }, CANCELED: { label: "Cancelado", tone: "secondary" } } as const;
/** Acción principal de cada estado: el siguiente paso más común, a un toque. */
const PRIMARY: Partial<Record<Fulfillment, Fulfillment>> = { RECEIVED: "CONFIRMED", CONFIRMED: "IN_PRODUCTION", IN_PRODUCTION: "READY", READY: "DELIVERED", SHIPPED: "DELIVERED" };
const VERB: Record<string, string> = { CONFIRMED: "Confirmar", IN_PRODUCTION: "A producción", READY: "Marcar listo", SHIPPED: "Marcar enviado", DELIVERED: "Marcar entregado", CANCELED: "Cancelar" };

/** Lista de pedidos por cumplimiento, con la acción siguiente a un toque y el resto en un selector. El pago no se mezcla con el cumplimiento. */
export default function OrdersView({ slug, orders, canCharge = true }: { slug: string; orders: OrderRow[]; /** Quien produce no maneja dinero: sin cobros, sin cancelar y sin totales. */ canCharge?: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const [confirm, confirmDialog] = useConfirm();
  const [dialog, setDialog] = useState<{ order: OrderRow; kind: "dispatch" | "receive" } | null>(null);
  const [method, setMethod] = useState("COURIER");
  const [filter, setFilter] = useState<"all" | Fulfillment>("all");
  const count = (f: Fulfillment) => orders.filter((o) => o.fulfillment === f).length;
  const list = orders.filter((o) => filter === "all" || o.fulfillment === filter);

  const move = async (o: OrderRow, to: Fulfillment) => {
    // Enviar y entregar piden datos (guía, quién recibió): se resuelven en su diálogo.
    if (to === "SHIPPED" || to === "DELIVERED") return setDialog({ order: o, kind: to === "SHIPPED" ? "dispatch" : "receive" });
    if (to === "CANCELED" && !(await confirm({ title: `¿Cancelar el pedido ${o.code}?`, description: o.status === "PAID" ? "El pedido ya está pagado: cancelarlo no devuelve el dinero, eso se hace desde Cobros en línea." : "Se anula su cobro pendiente.", confirmLabel: "Cancelar pedido", tone: "danger" }))) return;
    const r: OrderResult = await advanceOrderAction(slug, o.id, to);
    toast(r.message, r.ok ? "success" : "error");
    if (r.ok) router.refresh();
  };

  if (orders.length === 0) return <EmptyState mark="page" title="Aún no hay pedidos" description="Cuando un cliente pida desde tu sitio, o apruebes una cotización, el pedido aparece aquí." />;
  return (
    <div className="grid gap-3">
      <div className="max-w-full overflow-x-auto pb-1">
        <div className="flex w-max gap-2" role="group" aria-label="Filtrar por cumplimiento">
          {(["all", "RECEIVED", "CONFIRMED", "IN_PRODUCTION", "READY", "SHIPPED", "DELIVERED"] as const).map((f) => (
            <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)} className={buttonVariants({ variant: filter === f ? "default" : "outline", size: "sm" })}>
              {f === "all" ? `Todos (${orders.length})` : `${FULFILLMENT_TEXT[f]} (${count(f)})`}
            </button>
          ))}
        </div>
      </div>
      {list.length === 0 ? <EmptyState mark="page" remember={false} title="Nada en este paso" description="Cambia el filtro para ver los demás pedidos." /> : null}
      <ul className="grid gap-3">
        {list.map((o) => {
          const next = allowedNext(o.fulfillment);
          const primary = PRIMARY[o.fulfillment as Fulfillment];
          const others = next.filter((s) => s !== primary && s !== "CANCELED" && s !== "SHIPPED");
          return (
            <li key={o.id} className="grid gap-2 rounded-lg border border-border bg-surface p-4">
              <div className="flex flex-wrap items-center gap-2">
                <b className="font-mono">{o.code}</b>
                <Badge variant={o.fulfillment === "DELIVERED" ? "success" : o.fulfillment === "CANCELED" ? "secondary" : "default"}>{FULFILLMENT_TEXT[o.fulfillment as Fulfillment] ?? o.fulfillment}</Badge>
                {canCharge ? <Badge variant={PAY[o.status as keyof typeof PAY]?.tone ?? "secondary"}>{PAY[o.status as keyof typeof PAY]?.label ?? o.status}</Badge> : null}
                {o.channel && o.channel !== "WEB" ? <Badge variant="outline">{CHANNEL_LABELS[o.channel as OrderChannel] ?? o.channel}{o.externalId ? ` · ${o.externalId}` : ""}</Badge> : null}
                {o.fromQuote ? <Badge variant="outline">De cotización</Badge> : null}
                {o.opportunityId ? (
                  <Link href={`/${slug}/crm/oportunidades/${o.opportunityId}`} className="text-xs font-medium text-accent-text underline-offset-2 hover:underline">
                    Ver oportunidad
                  </Link>
                ) : null}
                {canCharge ? <b className="ml-auto font-mono tabular-nums">{formatCurrency(o.total)}</b> : null}
              </div>
              <p className="break-words text-ui"><b>{o.customerName}</b> · <a href={`https://wa.me/${o.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{o.phone}</a></p>
              <ul className="text-ui text-muted-foreground">
                {o.lines.map((l) => <li key={l.name} className="break-words">{l.quantity} × {l.name}</li>)}
              </ul>
              {o.address || o.city ? <p className="break-words text-ui text-muted-foreground">Entrega: {[o.address, o.city].filter(Boolean).join(", ")}</p> : null}
              {o.notes ? <p className="break-words text-ui text-muted-foreground">Nota: {o.notes}</p> : null}
              {canCharge && o.review ? <Alert tone="warning">{o.review}</Alert> : null}
              {!isFinal(o.fulfillment) ? (
                <div className="flex flex-wrap items-center gap-2">
                  {primary ? <button type="button" onClick={() => move(o, primary)} className={buttonVariants({ size: "sm" })}>{VERB[primary]}</button> : null}
                  {o.fulfillment === "READY" ? <button type="button" onClick={() => move(o, "SHIPPED")} className={buttonVariants({ variant: "outline", size: "sm" })}>Enviar</button> : null}
                  {others.length > 0 ? (
                    <Select aria-label={`Mover ${o.code} a otro paso`} value="" onChange={(e) => e.target.value && move(o, e.target.value as Fulfillment)}>
                      <option value="">Otro paso…</option>
                      {others.map((s) => <option key={s} value={s}>{FULFILLMENT_TEXT[s]}</option>)}
                    </Select>
                  ) : null}
                  {canCharge && (o.status === "PENDING_PAYMENT" || o.status === "ABANDONED") ? <Link href={`/${slug}/ventas/cobros`} className={buttonVariants({ variant: "outline", size: "sm" })}>Confirmar pago</Link> : null}
                  {canCharge && next.includes("CANCELED") ? <button type="button" aria-label={`Cancelar el pedido ${o.code}`} onClick={() => move(o, "CANCELED")} className={buttonVariants({ variant: "ghost", size: "sm" })}>Cancelar</button> : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
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

