"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/molecules/alert";
import { Badge } from "@/components/atoms/badge";
import { buttonVariants } from "@/components/atoms/button-variants";
import { Select } from "@/components/atoms/select";
import { EmptyState } from "@/components/molecules/empty-state";
import { useToast } from "@/components/molecules/toast";
import { useConfirm } from "@/components/organisms/confirm-dialog";
import { advanceOrderAction, type OrderResult } from "@/app/[tenant]/(app)/orders/actions";
import { FULFILLMENT_TEXT, allowedNext, isFinal, type Fulfillment } from "@/lib/business/store/fulfillment";
import type { OrderRow } from "@/lib/business/store/store-db";
import { formatCurrency } from "@/lib/foundation/format";

const PAY = { PENDING_PAYMENT: { label: "Esperando pago", tone: "warning" }, PAID: { label: "Pagado", tone: "success" }, ABANDONED: { label: "Sin pagar", tone: "secondary" }, CANCELED: { label: "Cancelado", tone: "secondary" } } as const;
/** Acción principal de cada estado: el siguiente paso más común, a un toque. */
const PRIMARY: Partial<Record<Fulfillment, Fulfillment>> = { RECEIVED: "CONFIRMED", CONFIRMED: "IN_PRODUCTION", IN_PRODUCTION: "READY", READY: "DELIVERED", SHIPPED: "DELIVERED" };
const VERB: Record<string, string> = { CONFIRMED: "Confirmar", IN_PRODUCTION: "A producción", READY: "Marcar listo", SHIPPED: "Marcar enviado", DELIVERED: "Marcar entregado", CANCELED: "Cancelar" };

/** Lista de pedidos por cumplimiento, con la acción siguiente a un toque y el resto en un selector. El pago no se mezcla con el cumplimiento. */
export default function OrdersView({ slug, orders }: { slug: string; orders: OrderRow[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [confirm, confirmDialog] = useConfirm();
  const [filter, setFilter] = useState<"all" | Fulfillment>("all");
  const count = (f: Fulfillment) => orders.filter((o) => o.fulfillment === f).length;
  const list = orders.filter((o) => filter === "all" || o.fulfillment === filter);

  const move = async (o: OrderRow, to: Fulfillment) => {
    if (to === "CANCELED" && !(await confirm({ title: `¿Cancelar el pedido ${o.code}?`, description: o.status === "PAID" ? "El pedido ya está pagado: cancelarlo no devuelve el dinero, eso se hace desde Cobros en línea." : "Se anula su cobro pendiente.", confirmLabel: "Cancelar pedido", tone: "danger" }))) return;
    const r: OrderResult = await advanceOrderAction(slug, o.id, to);
    toast(r.message, r.ok ? "success" : "error");
    if (r.ok) router.refresh();
  };

  if (orders.length === 0) return <EmptyState title="Aún no hay pedidos" description="Cuando un cliente pida desde tu sitio, o apruebes una cotización, el pedido aparece aquí." />;
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
      {list.length === 0 ? <EmptyState title="Nada en este paso" description="Cambia el filtro para ver los demás pedidos." /> : null}
      <ul className="grid gap-3">
        {list.map((o) => {
          const next = allowedNext(o.fulfillment);
          const primary = PRIMARY[o.fulfillment as Fulfillment];
          const others = next.filter((s) => s !== primary && s !== "CANCELED");
          return (
            <li key={o.id} className="grid gap-2 rounded-lg border border-border bg-surface p-4">
              <div className="flex flex-wrap items-center gap-2">
                <b className="font-mono">{o.code}</b>
                <Badge variant={o.fulfillment === "DELIVERED" ? "success" : o.fulfillment === "CANCELED" ? "secondary" : "default"}>{FULFILLMENT_TEXT[o.fulfillment as Fulfillment] ?? o.fulfillment}</Badge>
                <Badge variant={PAY[o.status as keyof typeof PAY]?.tone ?? "secondary"}>{PAY[o.status as keyof typeof PAY]?.label ?? o.status}</Badge>
                {o.fromQuote ? <Badge variant="outline">De cotización</Badge> : null}
                <b className="ml-auto font-mono tabular-nums">{formatCurrency(o.total)}</b>
              </div>
              <p className="break-words text-ui"><b>{o.customerName}</b> · <a href={`https://wa.me/${o.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{o.phone}</a></p>
              <ul className="text-ui text-muted-foreground">
                {o.lines.map((l) => <li key={l.name} className="break-words">{l.quantity} × {l.name}</li>)}
              </ul>
              {o.address || o.city ? <p className="break-words text-ui text-muted-foreground">Entrega: {[o.address, o.city].filter(Boolean).join(", ")}</p> : null}
              {o.notes ? <p className="break-words text-ui text-muted-foreground">Nota: {o.notes}</p> : null}
              {o.review ? <Alert tone="warning">{o.review}</Alert> : null}
              {!isFinal(o.fulfillment) ? (
                <div className="flex flex-wrap items-center gap-2">
                  {primary ? <button type="button" onClick={() => move(o, primary)} className={buttonVariants({ size: "sm" })}>{VERB[primary]}</button> : null}
                  {others.length > 0 ? (
                    <Select aria-label={`Mover ${o.code} a otro paso`} value="" onChange={(e) => e.target.value && move(o, e.target.value as Fulfillment)}>
                      <option value="">Otro paso…</option>
                      {others.map((s) => <option key={s} value={s}>{FULFILLMENT_TEXT[s]}</option>)}
                    </Select>
                  ) : null}
                  {o.status === "PENDING_PAYMENT" || o.status === "ABANDONED" ? <Link href={`/${slug}/cobros`} className={buttonVariants({ variant: "outline", size: "sm" })}>Confirmar pago</Link> : null}
                  {next.includes("CANCELED") ? <button type="button" aria-label={`Cancelar el pedido ${o.code}`} onClick={() => move(o, "CANCELED")} className={buttonVariants({ variant: "ghost", size: "sm" })}>Cancelar</button> : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
      {confirmDialog}
    </div>
  );
}

