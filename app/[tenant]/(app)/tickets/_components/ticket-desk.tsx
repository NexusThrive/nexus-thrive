"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Minus, Plus, Ticket } from "lucide-react";
import { Badge } from "@/components/atoms/badge";
import { buttonVariants } from "@/components/atoms/button-variants";
import { inputClasses } from "@/components/atoms/input";
import { ProgressBar } from "@/components/atoms/progress-bar";
import { Field } from "@/components/molecules/field";
import { useToast } from "@/components/molecules/toast";
import { useConfirm } from "@/components/organisms/confirm-dialog";
import { ResponsiveSheet } from "@/components/organisms/responsive-sheet";
import { SALE_KINDS, saleKindLabel, type SlotLoad } from "@/lib/business/museum";
import type { TicketSaleRow } from "@/lib/business/museum-db";
import { PAYMENT_METHODS } from "@/lib/finance";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { payTicketsAction, sellTicketsAction, voidTicketsAction, type TicketResult } from "../actions";
import { Select } from "@/components/atoms/select";

type TicketType = { id: string; name: string; price: number };
type Customer = { id: string; name: string };

const STATUS: Record<string, { label: string; tone: "success" | "warning" | "muted" }> = {
  PAID: { label: "Pagada", tone: "success" },
  RESERVED: { label: "Reservada", tone: "warning" },
  VOID: { label: "Anulada", tone: "muted" },
};

/** Franjas del día con su ocupación, venta por franja y ventas del día. */
export default function TicketDesk({ slug, day, isPast, closed, loads, sales, types, customers, canSell, canManage }: { slug: string; day: string; isPast: boolean; closed: boolean; loads: SlotLoad[]; sales: TicketSaleRow[]; types: TicketType[]; customers: Customer[]; canSell: boolean; canManage: boolean }) {
  const [slot, setSlot] = useState<SlotLoad | null>(null);
  const [detail, setDetail] = useState<TicketSaleRow | null>(null);
  const blocked = isPast || closed || !canSell;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <section className="grid content-start gap-3">
        <h2 className="text-sm font-semibold">Franjas</h2>
        {types.length === 0 ? (
          <p className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
            Aún no tienes tipos de entrada.{" "}
            <Link href="?tab=ajustes" className="font-medium text-accent-text hover:underline">
              Créalos en Aforo y horarios
            </Link>
            .
          </p>
        ) : null}
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {loads.map((l) => {
            const used = l.sold + l.reserved;
            const full = l.left === 0;
            return (
              <li key={l.slot}>
                <button
                  type="button"
                  disabled={blocked || full || types.length === 0}
                  onClick={() => setSlot(l)}
                  className="grid w-full gap-2 rounded-lg border border-border bg-card p-3 text-left transition hover:border-border-strong disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <span className="flex items-baseline justify-between gap-2">
                    <b className="font-mono text-lg tabular-nums">{l.slot}</b>
                    <span className={cn("text-xs font-medium", full ? "text-rose-600 dark:text-rose-400" : l.left <= l.capacity * 0.2 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground")}>
                      {full ? "Lleno" : `${l.left} cupos`}
                    </span>
                  </span>
                  <ProgressBar value={used / l.capacity} tone={full ? "ink" : "gold"} label={`Ocupación ${l.slot}`} />
                  <span className="text-xs text-muted-foreground">
                    {l.sold} vendidas{l.reserved ? ` · ${l.reserved} reservadas` : ""} de {l.capacity}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {isPast ? <p className="text-xs text-muted-foreground">Día pasado: solo consulta.</p> : closed ? <p className="text-xs text-muted-foreground">El museo cierra este día.</p> : null}
      </section>

      <section className="grid content-start gap-2">
        <h2 className="text-sm font-semibold">Ventas del día</h2>
        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {sales.map((s) => (
            <li key={s.id}>
              <button type="button" onClick={() => setDetail(s)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-surface-muted">
                <span className="font-mono text-xs text-muted-foreground">{s.slot}</span>
                <span className="min-w-0 flex-1 text-sm">
                  <b className="block truncate font-medium">
                    {s.code} · {s.visitors} {s.visitors === 1 ? "visitante" : "visitantes"}
                  </b>
                  <small className="block truncate text-xs text-muted-foreground">
                    {saleKindLabel(s.kind)}
                    {s.groupName ? ` · ${s.groupName}` : ""}
                    {s.customerName ? ` · ${s.customerName}` : ""}
                  </small>
                </span>
                <span className="text-right">
                  <b className={cn("block font-mono text-sm tabular-nums", s.status === "VOID" && "line-through opacity-60")}>{formatCurrency(s.total)}</b>
                  <Badge tone={STATUS[s.status]?.tone ?? "muted"}>{STATUS[s.status]?.label ?? s.status}</Badge>
                </span>
              </button>
            </li>
          ))}
          {sales.length === 0 ? <li className="px-3 py-4 text-sm text-muted-foreground">Sin ventas para este día.</li> : null}
        </ul>
      </section>

      {slot ? <SellSheet slug={slug} day={day} load={slot} types={types} customers={customers} onClose={() => setSlot(null)} /> : null}
      {detail ? <SaleSheet slug={slug} sale={detail} canSell={canSell} canManage={canManage} onClose={() => setDetail(null)} /> : null}
    </div>
  );
}

function useRun(onDone: () => void) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const { toast } = useToast();
  const run = (p: () => Promise<TicketResult>) =>
    start(async () => {
      const r = await p();
      if (r.ok) {
        toast(r.message ?? "Listo", "success");
        router.refresh();
        onDone();
      } else toast({ title: "No se pudo", description: r.message, variant: "error" });
    });
  return { pending, run };
}

function SellSheet({ slug, day, load, types, customers, onClose }: { slug: string; day: string; load: SlotLoad; types: TicketType[]; customers: Customer[]; onClose: () => void }) {
  const [qty, setQty] = useState<Record<string, number>>({});
  const [kind, setKind] = useState("TAQUILLA");
  const [group, setGroup] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [payNow, setPayNow] = useState(true);
  const [method, setMethod] = useState("CASH");
  const { pending, run } = useRun(onClose);
  const visitors = Object.values(qty).reduce((a, b) => a + b, 0);
  const total = useMemo(() => types.reduce((a, t) => a + (qty[t.id] ?? 0) * t.price, 0), [qty, types]);
  const setQ = (id: string, n: number) => setQty((q) => ({ ...q, [id]: Math.max(0, Math.min(1000, n)) }));
  const isGroup = kind !== "TAQUILLA";

  return (
    <ResponsiveSheet open onOpenChange={(o) => !o && onClose()} title={`Franja de las ${load.slot}`} description={`${load.left} cupos disponibles`}>
      <div className="grid gap-5">
        <Field label="Modalidad">
          {(c) => (
            <Select
              {...c}
              value={kind}
              onChange={(e) => {
                setKind(e.target.value);
                if (e.target.value !== "TAQUILLA") setPayNow(false);
              }}
            >
              {SALE_KINDS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <ul className="divide-y divide-border rounded-md border border-border">
          {types.map((t) => (
            <li key={t.id} className="flex items-center gap-3 px-3 py-2">
              <span className="min-w-0 flex-1 text-sm">
                <b className="block truncate font-medium">{t.name}</b>
                <small className="text-xs text-muted-foreground">{formatCurrency(t.price)}</small>
              </span>
              <button type="button" aria-label={`Quitar una entrada ${t.name}`} onClick={() => setQ(t.id, (qty[t.id] ?? 0) - 1)} className={buttonVariants({ size: "icon-sm", variant: "outline" })}>
                <Minus aria-hidden="true" className="size-3.5" />
              </button>
              <input aria-label={`Cantidad ${t.name}`} inputMode="numeric" value={qty[t.id] ?? 0} onChange={(e) => setQ(t.id, Number(e.target.value.replace(/\D/g, "")) || 0)} className={cn(inputClasses, "w-14 text-center font-mono")} />
              <button type="button" aria-label={`Agregar una entrada ${t.name}`} onClick={() => setQ(t.id, (qty[t.id] ?? 0) + 1)} className={buttonVariants({ size: "icon-sm", variant: "outline" })}>
                <Plus aria-hidden="true" className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>

        {isGroup ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={kind === "COLEGIO" ? "Colegio y curso" : "Nombre del grupo"}>{(c) => <input {...c} value={group} onChange={(e) => setGroup(e.target.value)} placeholder={kind === "COLEGIO" ? "Colegio San José · 5°B" : "Familia Pérez"} className={inputClasses} />}</Field>
            <Field label="Responsable" hint={kind === "GUIADA" || kind === "COLEGIO" ? "Queda agendada a su nombre." : undefined}>
              {(c) => (
                <Select {...c} value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                  <option value="">Elige un cliente</option>
                  {customers.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>
        ) : null}

        <div className="grid gap-3 rounded-md bg-surface-muted p-3.5">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={payNow} onChange={(e) => setPayNow(e.target.checked)} />
            Cobrar ahora {isGroup ? "(si no, queda reservada y se cobra después)" : ""}
          </label>
          {payNow ? (
            <Field label="Medio de pago">
              {(c) => (
                <Select {...c} value={method} onChange={(e) => setMethod(e.target.value)}>
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          ) : null}
          <p className="flex items-baseline justify-between text-sm">
            <span>
              {visitors} {visitors === 1 ? "visitante" : "visitantes"}
              {visitors > load.left ? <b className="ml-2 text-rose-600">Supera el aforo</b> : null}
            </span>
            <b className="font-mono text-lg tabular-nums">{formatCurrency(total)}</b>
          </p>
        </div>

        <button
          type="button"
          disabled={pending || visitors === 0 || visitors > load.left}
          onClick={() =>
            run(() =>
              sellTicketsAction(slug, {
                day,
                slot: load.slot,
                kind,
                lines: Object.entries(qty).map(([productId, n]) => ({ productId, qty: n })),
                groupName: isGroup ? group : null,
                customerId: customerId || null,
                pay: payNow ? { method } : null,
              }),
            )
          }
          className={buttonVariants({ size: "lg" })}
        >
          <Ticket aria-hidden="true" className="size-4" /> {payNow ? "Cobrar y vender" : "Reservar"}
        </button>
      </div>
    </ResponsiveSheet>
  );
}

function SaleSheet({ slug, sale, canSell, canManage, onClose }: { slug: string; sale: TicketSaleRow; canSell: boolean; canManage: boolean; onClose: () => void }) {
  const [method, setMethod] = useState("CASH");
  const [reason, setReason] = useState("");
  const { pending, run } = useRun(onClose);
  const [confirm, confirmDialog] = useConfirm();
  return (
    <ResponsiveSheet open onOpenChange={(o) => !o && onClose()} title={`${sale.code} · ${sale.slot}`} description={`${saleKindLabel(sale.kind)}${sale.groupName ? ` · ${sale.groupName}` : ""}`}>
      <div className="grid gap-5">
        <ul className="divide-y divide-border rounded-md border border-border text-sm">
          {sale.lines.map((l) => (
            <li key={l.productId} className="flex justify-between px-3 py-2">
              <span>
                {l.qty} × {l.name}
              </span>
              <span className="font-mono tabular-nums">{formatCurrency(l.qty * l.unitPrice)}</span>
            </li>
          ))}
          <li className="flex justify-between px-3 py-2 font-semibold">
            <span>Total</span>
            <span className="font-mono tabular-nums">{formatCurrency(sale.total)}</span>
          </li>
        </ul>
        <p className="text-sm">
          Estado: <Badge tone={STATUS[sale.status]?.tone ?? "muted"}>{STATUS[sale.status]?.label ?? sale.status}</Badge>
          {sale.customerName ? <span className="ml-2 text-muted-foreground">Responsable: {sale.customerName}</span> : null}
        </p>
        {sale.bookingId ? (
          <Link href={`/${slug}/bookings`} className="text-sm font-medium text-accent-text hover:underline">
            Ver la visita en la agenda
          </Link>
        ) : null}

        {sale.status === "RESERVED" && canSell ? (
          <section className="grid gap-3 rounded-md bg-surface-muted p-3.5">
            <h3 className="text-[13px] font-semibold">Cobrar la reserva</h3>
            <Select aria-label="Medio de pago" value={method} onChange={(e) => setMethod(e.target.value)}>
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </Select>
            <button type="button" disabled={pending} onClick={() => run(() => payTicketsAction(slug, sale.id, method))} className={buttonVariants({ size: "sm" })}>
              Cobrar {formatCurrency(sale.total)}
            </button>
          </section>
        ) : null}

        {sale.status !== "VOID" && canManage ? (
          <section className="grid gap-3 border-t border-border pt-4">
            <h3 className="text-[13px] font-semibold">Anular</h3>
            <input aria-label="Motivo de la anulación" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motivo: error en la venta, el grupo canceló…" className={inputClasses} />
            <button type="button" disabled={pending || reason.trim().length < 3} onClick={async () => { const ok = await confirm({ title: "¿Anular la venta?", description: "El cupo queda libre y el cobro se anula. Queda en la bitácora con el motivo.", confirmLabel: "Anular venta" }); if (ok) run(() => voidTicketsAction(slug, sale.id, reason)); }} className={buttonVariants({ size: "sm", variant: "danger" })}>
              Anular venta
            </button>
          </section>
        ) : null}
      </div>
      {confirmDialog}
    </ResponsiveSheet>
  );
}
