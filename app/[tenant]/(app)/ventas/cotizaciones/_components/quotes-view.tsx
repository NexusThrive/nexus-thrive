"use client";

import { MoneyInput } from "@/components/molecules/money-input";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/atoms/badge";
import { buttonVariants } from "@/components/atoms/button-variants";
import { inputClasses } from "@/components/atoms/input";
import { Select } from "@/components/atoms/select";
import { DateInput } from "@/components/molecules/date-input";
import { EmptyState } from "@/components/molecules/empty-state";
import { Field } from "@/components/molecules/field";
import { useToast } from "@/components/molecules/toast";
import { FormDrawer, FormDialog } from "@/components/organisms/form-sheet";
import { approveQuoteAction, createQuoteAction, rejectQuoteAction, sendQuoteAction, type QuoteResult } from "@/app/[tenant]/(app)/ventas/cotizaciones/actions";
import { QUOTE_STATUS_TEXT, isQuoteExpired, quoteCode, splitDeposit } from "@/lib/business/sales/sales-quotes";
import type { QuoteRow } from "@/lib/business/sales/sales-quotes-db";
import { formatCurrency } from "@/lib/foundation/format";

type Line = { productId: string; quantity: number; unitPrice: number };
const TONE = { DRAFT: "secondary", SENT: "warning", APPROVED: "success", REJECTED: "destructive" } as const;

/** Cotizaciones comerciales: armar con el catálogo, enviar y aprobar (nace el pedido con su anticipo) o rechazar con motivo. */
export default function QuotesView({ slug, quotes, customers, products, today, initialCustomerId }: { initialCustomerId?: string; slug: string; quotes: QuoteRow[]; customers: { id: string; name: string }[]; products: { id: string; name: string; price: number }[]; today: string }) {
  // `?nuevo=1&cliente=` (desde la ficha del cliente) abre la cotización con el cliente elegido.
  const [creating, setCreating] = useState(Boolean(initialCustomerId));
  const [rejecting, setRejecting] = useState<QuoteRow | null>(null);
  const [lines, setLines] = useState<Line[]>([{ productId: products[0]?.id ?? "", quantity: 1, unitPrice: products[0]?.price ?? 0 }]);
  const [deposit, setDeposit] = useState(50);
  const router = useRouter();
  const { toast } = useToast();
  const total = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  const split = splitDeposit(total, deposit);
  const act = async (fn: () => Promise<QuoteResult>) => {
    const r = await fn();
    toast(r.message, r.ok ? "success" : "error");
    if (r.ok) router.refresh();
  };
  const done = (message?: string) => {
    if (message) toast(message, "success");
    router.refresh();
  };
  const setLine = (i: number, patch: Partial<Line>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  return (
    <div className="grid gap-4">
      <div className="flex">
        <button type="button" onClick={() => setCreating(true)} className={buttonVariants({ className: "ml-auto" })}>
          <Plus aria-hidden="true" className="size-4" /> Nueva cotización
        </button>
      </div>

      {quotes.length === 0 ? (
        <EmptyState mark="page" title="Aún no hay cotizaciones" description="Arma una con tu catálogo, envíala y, cuando el cliente la apruebe, nace el pedido con su anticipo." />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
          {quotes.map((q) => {
            const expired = (q.status === "DRAFT" || q.status === "SENT") && isQuoteExpired(q.validUntil, today);
            return (
              <li key={q.id} className="grid gap-2 px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{quoteCode(q.number)}</span>
                  <b className="min-w-0 break-words text-ui font-medium">{q.title}</b>
                  <Badge variant={TONE[q.status]}>{QUOTE_STATUS_TEXT[q.status]}</Badge>
                  {expired ? <Badge variant="destructive">Vencida</Badge> : null}
                  <span className="ml-auto font-mono text-ui font-semibold tabular-nums">{formatCurrency(q.total)}</span>
                </div>
                <p className="break-words text-xs text-muted-foreground">
                  {q.customerName} · {q.lines.map((l) => `${l.quantity} × ${l.name}`).join(", ")}
                  {q.validUntil ? ` · vigente hasta ${q.validUntil}` : ""} · anticipo {q.depositPct}%
                  {q.decisionNote ? ` · ${q.decisionNote}` : ""}
                </p>
                {q.status === "DRAFT" || q.status === "SENT" ? (
                  <div className="flex flex-wrap gap-2">
                    {q.status === "DRAFT" ? <button type="button" onClick={() => act(() => sendQuoteAction(slug, q.id))} className={buttonVariants({ variant: "outline", size: "sm" })}>Marcar enviada</button> : null}
                    <button type="button" disabled={expired} onClick={() => act(() => approveQuoteAction(slug, q.id))} className={buttonVariants({ variant: "outline", size: "sm" })}>Aprobar</button>
                    <button type="button" onClick={() => setRejecting(q)} className={buttonVariants({ variant: "ghost", size: "sm" })}>Rechazar</button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <FormDrawer
        open={creating}
        onOpenChange={setCreating}
        title="Nueva cotización"
        description="Elige el cliente y los productos del catálogo. El anticipo se pide al aprobarla."
        submitLabel="Crear cotización"
        pendingLabel="Creando…"
        onSubmit={async (d) => {
          const r = await createQuoteAction(slug, { customerId: String(d.get("customerId") ?? ""), title: String(d.get("title") ?? ""), depositPct: deposit, validUntil: String(d.get("validUntil") ?? ""), lines });
          return r.ok ? { ok: true, message: r.message } : { ok: false, message: r.message, fieldErrors: { title: r.message } };
        }}
        onSuccess={({ message }) => done(message)}
      >
        {({ fieldErrors }) => (
          <div className="grid gap-3">
            <Field label="Cliente" required>
              {(c) => (
                <Select {...c} name="customerId" defaultValue={initialCustomerId && customers.some((c) => c.id === initialCustomerId) ? initialCustomerId : customers[0]?.id}>
                  {customers.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                </Select>
              )}
            </Field>
            <Field label="De qué trata" required error={fieldErrors.title}>{(c) => <input {...c} name="title" autoComplete="off" maxLength={160} className={inputClasses} placeholder="Ej.: Camisetas con logo para el evento" />}</Field>
            <fieldset className="grid gap-2">
              <legend className="text-ui font-medium">Productos y servicios</legend>
              {lines.map((l, i) => (
                <div key={i} className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2 rounded-md border border-border p-2">
                  <Field label={`Concepto ${i + 1}`}>
                    {(c) => (
                      <Select {...c} value={l.productId} onChange={(e) => setLine(i, { productId: e.target.value, unitPrice: products.find((p) => p.id === e.target.value)?.price ?? 0 })}>
                        {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </Select>
                    )}
                  </Field>
                  <button type="button" onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))} disabled={lines.length === 1} aria-label={`Quitar el concepto ${i + 1}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                    <Trash2 aria-hidden="true" className="size-4" />
                  </button>
                  <Field label="Cantidad">{(c) => <input {...c} inputMode="numeric" value={l.quantity} onChange={(e) => setLine(i, { quantity: Math.max(0, Math.round(Number(e.target.value) || 0)) })} className={inputClasses} />}</Field>
                  <Field label="Valor unitario (COP)">{(c) => <MoneyInput id={c.id} aria-describedby={c["aria-describedby"]} value={l.unitPrice} onValueChange={(v) => setLine(i, { unitPrice: Math.max(0, v ?? 0) })} />}</Field>
                </div>
              ))}
              <button type="button" onClick={() => setLines((ls) => [...ls, { productId: products[0]?.id ?? "", quantity: 1, unitPrice: products[0]?.price ?? 0 }])} className={buttonVariants({ variant: "outline", size: "sm", className: "justify-self-start" })}>
                <Plus aria-hidden="true" className="size-4" /> Agregar concepto
              </button>
            </fieldset>
            <Field label="Anticipo al aprobar (%)" hint={`Anticipo ${formatCurrency(split.deposit)} · saldo ${formatCurrency(split.balance)}`}>
              {(c) => <input {...c} inputMode="numeric" value={deposit} onChange={(e) => setDeposit(Math.min(100, Math.max(0, Number(e.target.value) || 0)))} className={inputClasses} />}
            </Field>
            <Field label="Vigente hasta">{(c) => <DateInput {...c} name="validUntil" defaultValue="" />}</Field>
            <p className="text-ui">Total sin impuestos: <b className="font-mono tabular-nums">{formatCurrency(total)}</b></p>
          </div>
        )}
      </FormDrawer>

      <FormDialog
        open={rejecting !== null}
        onOpenChange={(o) => !o && setRejecting(null)}
        title="Rechazar cotización"
        description={rejecting ? `${quoteCode(rejecting.number)} · ${rejecting.title}` : undefined}
        submitLabel="Rechazar"
        pendingLabel="Guardando…"
        destructive
        onSubmit={async (d) => {
          const r = await rejectQuoteAction(slug, rejecting!.id, String(d.get("note") ?? ""));
          return r.ok ? { ok: true, message: r.message } : { ok: false, message: r.message, fieldErrors: { note: r.message } };
        }}
        onSuccess={({ message }) => done(message)}
      >
        {({ fieldErrors }) => <Field label="Por qué la rechazó el cliente" required error={fieldErrors.note}>{(c) => <input {...c} name="note" autoComplete="off" maxLength={300} className={inputClasses} />}</Field>}
      </FormDialog>
    </div>
  );
}
