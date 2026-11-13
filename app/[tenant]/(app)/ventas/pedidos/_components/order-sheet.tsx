"use client";

import Link from "next/link";
import { Check, MapPin, MessageCircle } from "lucide-react";
import { Alert } from "@/components/molecules/alert";
import { Badge } from "@/components/atoms/badge";
import { buttonVariants } from "@/components/atoms/button-variants";
import { CustomerAvatar } from "@/components/atoms/customer-avatar";
import { Select } from "@/components/atoms/select";
import { ResponsiveSheet } from "@/components/organisms/responsive-sheet";
import { CHANNEL_LABELS, type OrderChannel } from "@/lib/business/store/cart";
import { FULFILLMENT_TEXT, allowedNext, isFinal, type Fulfillment } from "@/lib/business/store/fulfillment";
import type { OrderRow } from "@/lib/business/store/store-db";
import { formatCurrency, formatRelativeTime } from "@/lib/foundation/format";
import { cn } from "@/lib/utils";
import { PAY, PRIMARY, VERB, flowOf, type MoveOrder } from "./order-meta";

const eyebrow = "text-2xs font-semibold uppercase tracking-[0.08em] text-muted-foreground";
const soft = "rounded-xl bg-surface-muted px-3.5 py-3";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-2">
      <h3 className={eyebrow}>{title}</h3>
      {children}
    </section>
  );
}

/**
 * Panel lateral de un pedido: el recorrido (dónde va y qué falta), quién lo pidió, la entrega, los productos con su valor, las notas y el pago.
 * Abajo, fijos, el total y las acciones: cancelar y el paso siguiente. Lo que pide datos (enviar, entregar) lo resuelve la lista con su
 * diálogo, así que el panel solo avisa qué paso se quiere. Sin permiso de dinero no hay precios, total, pago ni cancelar.
 */
export function OrderSheet({
  order: o,
  open,
  onOpenChange,
  slug,
  canCharge,
  onMove,
}: {
  order: OrderRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slug: string;
  canCharge: boolean;
  onMove: MoveOrder;
}) {
  if (!o) return null;
  const state = o.fulfillment as Fulfillment;
  const final = isFinal(state);
  const next = allowedNext(state);
  const primary = PRIMARY[state];
  const others = next.filter((s) => s !== primary && s !== "CANCELED" && s !== "SHIPPED");
  const flow = flowOf(state);
  const at = flow.indexOf(state);
  const pay = PAY[o.status as keyof typeof PAY];
  const channel = o.channel && o.channel !== "WEB" ? (CHANNEL_LABELS[o.channel as OrderChannel] ?? o.channel) : null;
  const wa = `https://wa.me/${o.phone.replace(/\D/g, "")}`;

  return (
    <ResponsiveSheet
      drawer
      size="lg"
      open={open}
      onOpenChange={onOpenChange}
      title={`Pedido ${o.code}`}
      description={`${FULFILLMENT_TEXT[state] ?? o.fulfillment} · ${formatRelativeTime(o.createdAt)}`}
      unsavedGuard={false}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="grid gap-0.5">
            <span className={eyebrow}>{canCharge ? "Total del pedido" : "Productos"}</span>
            {canCharge ? <b className="font-display text-2xl font-semibold tabular-nums">{formatCurrency(o.total)}</b> : <b className="text-lg font-semibold tabular-nums">{o.lines.reduce((n, l) => n + l.quantity, 0)}</b>}
          </div>
          {!final ? (
            <div className="flex flex-wrap items-center gap-2">
              {canCharge && next.includes("CANCELED") ? (
                <button type="button" onClick={() => onMove(o.id, "CANCELED")} className={buttonVariants({ variant: "secondary" })}>
                  Cancelar pedido
                </button>
              ) : null}
              {primary ? (
                <button type="button" onClick={() => onMove(o.id, primary)} className={buttonVariants()}>
                  {VERB[primary]}
                </button>
              ) : null}
            </div>
          ) : (
            <p className="flex items-center gap-1.5 text-ui text-muted-foreground">
              <Check aria-hidden="true" className="size-4" /> {state === "DELIVERED" ? "Pedido entregado" : "Pedido cancelado"}
            </p>
          )}
        </div>
      }
    >
      <div className="grid gap-6">
        {state === "CANCELED" ? (
          <Alert tone="danger" title="Pedido cancelado">
            Ya no sigue su recorrido.
          </Alert>
        ) : (
          <Section title="Recorrido">
            <ol aria-label="Recorrido del pedido" className="flex flex-wrap gap-1.5">
              {flow.map((step, i) => {
                const done = i < at;
                const current = i === at;
                return (
                  <li
                    key={step}
                    aria-current={current ? "step" : undefined}
                    className={cn("flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-ui", current ? "border-accent bg-accent-subtle font-medium text-foreground" : done ? "border-border bg-surface-muted text-muted-foreground" : "border-border text-muted-foreground")}
                  >
                    {done ? <Check aria-hidden="true" className="size-3.5" /> : null}
                    {FULFILLMENT_TEXT[step]}
                  </li>
                );
              })}
            </ol>
          </Section>
        )}

        {canCharge && o.review ? <Alert tone="warning">{o.review}</Alert> : null}

        <Section title="Cliente">
          <div className={cn(soft, "flex items-center gap-3")}>
            <CustomerAvatar identity={{ name: o.customerName, email: o.email ?? undefined }} className="size-10 shrink-0 rounded-full" />
            <div className="grid min-w-0 flex-1 gap-0.5">
              <b className="break-words text-sm font-semibold">{o.customerName}</b>
              {o.email ? <span className="break-all text-xs text-muted-foreground">{o.email}</span> : null}
            </div>
            <a href={wa} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "outline", size: "sm" })}>
              <MessageCircle aria-hidden="true" className="size-4" />
              <span className="sr-only">Escribir por WhatsApp a {o.customerName}: </span>
              {o.phone}
            </a>
          </div>
        </Section>

        {o.address || o.city ? (
          <Section title="Entrega">
            <p className={cn(soft, "flex items-start gap-2 break-words text-ui")}>
              <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              {[o.address, o.city].filter(Boolean).join(", ")}
            </p>
          </Section>
        ) : null}

        <Section title="Productos">
          <ul className="grid gap-1.5">
            {o.lines.map((l, i) => (
              <li key={`${l.name}-${i}`} className={cn(soft, "flex items-center justify-between gap-3")}>
                <div className="grid min-w-0 gap-0.5">
                  <span className="break-words text-ui font-medium">{l.name}</span>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {l.quantity} {canCharge ? `× ${formatCurrency(l.unitPrice)}` : l.quantity === 1 ? "unidad" : "unidades"}
                  </span>
                </div>
                {canCharge ? <b className="shrink-0 text-ui font-semibold tabular-nums">{formatCurrency(l.quantity * l.unitPrice)}</b> : null}
              </li>
            ))}
          </ul>
        </Section>

        {o.notes ? (
          <Section title="Notas">
            <p className={cn(soft, "whitespace-pre-line break-words text-ui")}>{o.notes}</p>
          </Section>
        ) : null}

        <Section title="Origen y pago">
          <div className={cn(soft, "flex flex-wrap items-center gap-2")}>
            {channel ? <Badge variant="outline">{channel}{o.externalId ? ` · ${o.externalId}` : ""}</Badge> : <Badge variant="outline">Tienda web</Badge>}
            {o.fromQuote ? <Badge variant="outline">De cotización</Badge> : null}
            {canCharge ? <Badge variant={pay?.tone ?? "secondary"}>{pay?.label ?? o.status}</Badge> : null}
            {o.opportunityId ? (
              <Link href={`/${slug}/crm/oportunidades/${o.opportunityId}`} className="text-xs font-medium text-accent-text underline-offset-2 hover:underline">
                Ver oportunidad
              </Link>
            ) : null}
            {canCharge && (o.status === "PENDING_PAYMENT" || o.status === "ABANDONED") ? (
              <Link href={`/${slug}/ventas/cobros`} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "ml-auto")}>
                Confirmar pago
              </Link>
            ) : null}
          </div>
        </Section>

        {!final && (state === "READY" || others.length > 0) ? (
          <Section title="Otro paso">
            <div className="flex flex-wrap items-center gap-2">
              {state === "READY" ? (
                <button type="button" onClick={() => onMove(o.id, "SHIPPED")} className={buttonVariants({ variant: "outline", size: "sm" })}>
                  Enviar
                </button>
              ) : null}
              {others.length > 0 ? (
                <Select aria-label={`Mover ${o.code} a otro paso`} value="" onChange={(e) => e.target.value && onMove(o.id, e.target.value as Fulfillment)}>
                  <option value="">Mover a…</option>
                  {others.map((s) => (
                    <option key={s} value={s}>
                      {FULFILLMENT_TEXT[s]}
                    </option>
                  ))}
                </Select>
              ) : null}
            </div>
          </Section>
        ) : null}
      </div>
    </ResponsiveSheet>
  );
}
