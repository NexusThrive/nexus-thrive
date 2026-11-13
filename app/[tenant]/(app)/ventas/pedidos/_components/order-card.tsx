"use client";

import { Check } from "lucide-react";
import { Badge } from "@/components/atoms/badge";
import { buttonVariants } from "@/components/atoms/button-variants";
import { CustomerAvatar } from "@/components/atoms/customer-avatar";
import { CHANNEL_LABELS, type OrderChannel } from "@/lib/business/store/cart";
import { FULFILLMENT_TEXT, allowedNext, isFinal, type Fulfillment } from "@/lib/business/store/fulfillment";
import type { OrderRow } from "@/lib/business/store/store-db";
import { formatCurrency, formatRelativeTime } from "@/lib/foundation/format";
import { cn } from "@/lib/utils";
import { FULFILLMENT_TONE, PAY, PRIMARY, VERB, type MoveOrder } from "./order-meta";

/** Cuántos productos se ven en la tarjeta; el resto se resume para que todas midan casi lo mismo. */
const VISIBLE_LINES = 3;

const dashed = "border-t border-dashed border-border";
const eyebrow = "text-2xs font-medium uppercase tracking-wide text-muted-foreground";

/**
 * Tarjeta de un pedido: quién lo pidió y en qué paso va, de dónde llegó, sus productos, el total y la acción siguiente a un toque.
 * Lo demás (enviar, otro paso, confirmar el pago, notas y entrega) vive en el panel lateral, que se abre desde el encabezado. Los pedidos
 * recién recibidos llevan un velo de oro en la base: son los que esperan una decisión. Sin permiso de dinero no hay precios, total ni cancelar.
 */
export function OrderCard({ order: o, canCharge, onOpen, onMove }: { order: OrderRow; canCharge: boolean; onOpen: (orderId: string) => void; onMove: MoveOrder }) {
  const state = o.fulfillment as Fulfillment;
  const primary = PRIMARY[state];
  const canCancel = canCharge && allowedNext(state).includes("CANCELED");
  const shown = o.lines.slice(0, VISIBLE_LINES);
  const hidden = o.lines.length - shown.length;
  const channel = o.channel && o.channel !== "WEB" ? (CHANNEL_LABELS[o.channel as OrderChannel] ?? o.channel) : o.fromQuote ? "De cotización" : "Tienda web";
  const pay = PAY[o.status as keyof typeof PAY];

  return (
    <article
      aria-label={`Pedido ${o.code}`}
      className={cn("flex flex-col gap-3 rounded-2xl border border-border/70 bg-card p-4 shadow-xs transition-shadow duration-200 hover:shadow-sm", state === "RECEIVED" && "bg-linear-to-t from-accent-subtle to-card to-35%")}
    >
      <button
        type="button"
        onClick={() => onOpen(o.id)}
        className="flex w-full items-start gap-3 rounded-xl text-left outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
      >
        <CustomerAvatar identity={{ name: o.customerName }} className="size-10 shrink-0 rounded-full" />
        <span className="grid min-w-0 flex-1 gap-0.5">
          {/* El nombre accesible lo forma lo que se ve (WCAG 2.5.3); este prefijo solo da contexto a quien usa lector de pantalla. */}
          <span className="sr-only">Ver el pedido </span>
          <b className="truncate text-sm font-semibold">{o.customerName}</b>
          <span className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
            <span className="font-mono">{o.code}</span>
            <span aria-hidden="true">·</span>
            <span>{formatRelativeTime(o.createdAt)}</span>
          </span>
        </span>
        <Badge tone={FULFILLMENT_TONE[state]} className="shrink-0">
          {FULFILLMENT_TEXT[state] ?? o.fulfillment}
        </Badge>
      </button>

      <div className={cn(dashed, "flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-3")}>
        <span className={eyebrow}>Origen</span>
        <span className="text-ui">{channel}</span>
        {canCharge ? <Badge variant={pay?.tone ?? "secondary"}>{pay?.label ?? o.status}</Badge> : null}
        {canCharge && o.review ? (
          <button type="button" onClick={() => onOpen(o.id)} className="rounded-full outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            <Badge variant="warning" tone="warning">
              <span className="sr-only">Pedido {o.code}: </span>Revisar
            </Badge>
          </button>
        ) : null}
      </div>

      <ol className="grid gap-1.5" aria-label="Productos">
        {shown.map((l, i) => (
          <li key={`${l.name}-${i}`} className="grid grid-cols-[1.25rem_minmax(0,1fr)_auto] items-baseline gap-2 text-ui">
            <span className="text-xs tabular-nums text-muted-foreground">{i + 1}</span>
            <span className="truncate">
              {l.quantity} × {l.name}
            </span>
            {canCharge ? <span className="tabular-nums text-muted-foreground">{formatCurrency(l.quantity * l.unitPrice)}</span> : null}
          </li>
        ))}
        {hidden > 0 ? (
          <li className="pl-7 text-xs text-muted-foreground">
            +{hidden} {hidden === 1 ? "producto más" : "productos más"}
          </li>
        ) : null}
      </ol>

      <div className={cn(dashed, "mt-auto flex items-baseline justify-between gap-3 pt-3")}>
        <span className={eyebrow}>{canCharge ? "Total" : "Productos"}</span>
        {canCharge ? <b className="font-display text-xl font-semibold tabular-nums">{formatCurrency(o.total)}</b> : <b className="text-sm font-semibold tabular-nums">{o.lines.reduce((n, l) => n + l.quantity, 0)}</b>}
      </div>

      {isFinal(state) ? (
        <p className="flex items-center justify-center gap-1.5 rounded-xl bg-surface-muted py-2 text-xs text-muted-foreground">
          <Check aria-hidden="true" className="size-3.5" /> {state === "DELIVERED" ? "Pedido entregado" : "Pedido cancelado"}
        </p>
      ) : (
        <div className={cn("grid gap-2", canCancel ? "grid-cols-2" : "grid-cols-1")}>
          {canCancel ? (
            <button type="button" aria-label={`Cancelar el pedido ${o.code}`} onClick={() => onMove(o.id, "CANCELED")} className={buttonVariants({ variant: "secondary", size: "sm" })}>
              Cancelar
            </button>
          ) : null}
          {primary ? (
            <button type="button" onClick={() => onMove(o.id, primary)} className={buttonVariants({ size: "sm" })}>
              {VERB[primary]}
            </button>
          ) : (
            <button type="button" onClick={() => onOpen(o.id)} className={buttonVariants({ variant: "outline", size: "sm" })}>
              Ver pedido
            </button>
          )}
        </div>
      )}
    </article>
  );
}
