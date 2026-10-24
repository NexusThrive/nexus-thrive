"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/molecules/alert";
import { Badge } from "@/components/atoms/badge";
import { buttonVariants } from "@/components/atoms/button-variants";
import { EmptyState } from "@/components/molecules/empty-state";
import { useToast } from "@/components/molecules/toast";
import { cancelOrderAction } from "@/app/[tenant]/(app)/pedidos-tienda/actions";
import type { OrderRow } from "@/lib/store/store-db";
import { formatCurrency } from "@/lib/format";

const STATUS = { PENDING_PAYMENT: { label: "Esperando pago", tone: "warning" }, PAID: { label: "Pagado", tone: "success" }, ABANDONED: { label: "Abandonado", tone: "secondary" }, CANCELED: { label: "Cancelado", tone: "secondary" } } as const;

export default function OrdersView({ slug, orders }: { slug: string; orders: OrderRow[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [filter, setFilter] = useState<"all" | keyof typeof STATUS>("all");
  const list = orders.filter((o) => filter === "all" || o.status === filter);
  if (orders.length === 0) return <EmptyState title="Aún no hay pedidos" description="Cuando un cliente haga un pedido desde tu sitio, aparecerá aquí." />;
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por estado">
        {(["all", "PENDING_PAYMENT", "PAID", "ABANDONED"] as const).map((f) => (
          <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)} className={buttonVariants({ variant: filter === f ? "default" : "outline", size: "sm" })}>{f === "all" ? "Todos" : STATUS[f].label}</button>
        ))}
      </div>
      <ul className="grid gap-3">
        {list.map((o) => (
          <li key={o.id} className="grid gap-2 rounded-lg border border-border bg-surface p-4">
            <div className="flex flex-wrap items-center gap-2">
              <b className="font-mono">{o.code}</b>
              <Badge variant={STATUS[o.status as keyof typeof STATUS]?.tone ?? "secondary"}>{STATUS[o.status as keyof typeof STATUS]?.label ?? o.status}</Badge>
              <span className="text-[13px] text-muted-foreground">{o.createdAt.slice(0, 16).replace("T", " ")}</span>
              <b className="ml-auto font-mono tabular-nums">{formatCurrency(o.total)}</b>
            </div>
            <p className="text-[13.5px]"><b>{o.customerName}</b> · <a href={`https://wa.me/${o.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{o.phone}</a>{o.email ? ` · ${o.email}` : ""}</p>
            {o.address || o.city ? <p className="text-[13px] text-muted-foreground">Entrega: {[o.address, o.city].filter(Boolean).join(", ")}</p> : null}
            <ul className="text-[13px]">
              {o.lines.map((l) => <li key={l.name}>{l.quantity} × {l.name} <span className="text-muted-foreground">({formatCurrency(l.unitPrice)})</span></li>)}
            </ul>
            {o.notes ? <p className="text-[13px] text-muted-foreground">Nota: {o.notes}</p> : null}
            {o.review ? <Alert tone="warning">{o.review}</Alert> : null}
            {o.status === "PENDING_PAYMENT" || o.status === "ABANDONED" ? (
              <div className="flex gap-2">
                <a href={`/${slug}/cobros`} className={buttonVariants({ variant: "outline", size: "sm" })}>Confirmar pago en Cobros</a>
                <button type="button" aria-label={`Cancelar el pedido ${o.code}`} onClick={async () => { const r = await cancelOrderAction(slug, o.id); toast(r.message, r.ok ? "success" : "error"); if (r.ok) router.refresh(); }} className={buttonVariants({ variant: "ghost", size: "sm" })}>Cancelar pedido</button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
