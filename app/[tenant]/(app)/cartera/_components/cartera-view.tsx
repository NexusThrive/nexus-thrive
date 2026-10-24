"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/atoms/badge";
import { buttonVariants } from "@/components/atoms/button-variants";
import { inputClasses } from "@/components/atoms/input";
import { Select } from "@/components/atoms/select";
import { EmptyState } from "@/components/molecules/empty-state";
import { Field } from "@/components/molecules/field";
import { SegmentedControl } from "@/components/molecules/segmented-control";
import { useToast } from "@/components/molecules/toast";
import { FormDialog } from "@/components/organisms/form-sheet";
import { paySupplierAction, receivePaymentAction } from "@/app/[tenant]/(app)/cartera/actions";
import { formatCurrency } from "@/lib/format";
import { PAYMENT_METHODS } from "@/lib/finance";
import { BUCKETS, BUCKET_LABELS } from "@/lib/receivables/aging";
import type { Cartera, CarteraRow } from "@/lib/receivables/receivables-db";

type Side = "in" | "out";

export default function CarteraView({ slug, receivable, payable }: { slug: string; receivable: Cartera; payable: Cartera | null }) {
  const [side, setSide] = useState<Side>("in");
  const current = side === "in" ? receivable : (payable ?? { rows: [], aging: receivable.aging });
  return (
    <div className="grid gap-4">
      {payable ? (
        <div className="max-w-full overflow-x-auto pb-1">
          <SegmentedControl
            ariaLabel="Tipo de cartera"
            value={side}
            onChange={setSide}
            options={[
              { value: "in", label: "Por cobrar", count: receivable.rows.length },
              { value: "out", label: "Por pagar", count: payable.rows.length },
            ]}
          />
        </div>
      ) : null}
      <Panel key={side} slug={slug} side={side} cartera={current} />
    </div>
  );
}

function Panel({ slug, side, cartera }: { slug: string; side: Side; cartera: Cartera }) {
  const [paying, setPaying] = useState<CarteraRow | null>(null);
  const router = useRouter();
  const { toast } = useToast();
  const word = side === "in" ? { party: "Cliente", action: "Registrar abono", total: "Por cobrar", submit: "Registrar abono" } : { party: "Proveedor", action: "Pagar", total: "Por pagar", submit: "Registrar pago" };
  return (
    <div className="grid gap-4">
      <section aria-label={`Antigüedad de la cartera ${word.total.toLowerCase()}`} className="grid gap-3 rounded-lg border border-border bg-surface p-4">
        <p className="text-[13px] text-muted-foreground">{word.total}</p>
        <p className="font-mono text-2xl font-semibold tabular-nums">{formatCurrency(cartera.aging.total)}</p>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {BUCKETS.map((b) => (
            <li key={b} className="rounded-md bg-surface-muted px-3 py-2">
              <span className="block text-xs text-muted-foreground">{BUCKET_LABELS[b]}</span>
              <b className="font-mono text-[13px] tabular-nums">{formatCurrency(cartera.aging.buckets[b].amount)}</b>
            </li>
          ))}
        </ul>
      </section>

      {cartera.rows.length === 0 ? (
        <EmptyState title={side === "in" ? "Nadie te debe" : "No debes nada"} description={side === "in" ? "Las cuentas de cobro emitidas con saldo aparecerán aquí." : "Las facturas de proveedor registradas con saldo aparecerán aquí."} />
      ) : (
        <div role="region" aria-label={`Cuentas ${word.total.toLowerCase()}`} tabIndex={0} className="overflow-x-auto rounded-lg border border-border bg-surface focus-visible:outline-2 focus-visible:outline-accent">
          <table className="w-full min-w-[760px] text-[13px]">
            <caption className="sr-only">Cuentas {word.total.toLowerCase()} con su saldo y vencimiento</caption>
            <thead className="bg-surface-muted text-left text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">{word.party}</th>
                <th scope="col" className="px-3 py-2 font-medium">Documento</th>
                <th scope="col" className="px-3 py-2 font-medium">Vence</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Total</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Saldo</th>
                <th scope="col" className="px-3 py-2"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {cartera.rows.map((r) => (
                <tr key={r.id}>
                  <th scope="row" className="px-3 py-2 text-left font-medium">{r.party}</th>
                  <td className="px-3 py-2 font-mono">{r.number}</td>
                  <td className="px-3 py-2">
                    {r.dueDate ?? "Sin fecha"}
                    {r.daysOverdue > 0 ? <Badge variant={r.daysOverdue > 60 ? "destructive" : "warning"} className="ml-2">{r.daysOverdue} días de mora</Badge> : null}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">{formatCurrency(r.total)}</td>
                  <td className="px-3 py-2 text-right font-mono font-semibold tabular-nums">{formatCurrency(r.balance)}</td>
                  <td className="px-3 py-2 text-right">
                    <button type="button" onClick={() => setPaying(r)} aria-label={`${word.action} · ${r.party} ${r.number}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                      {word.action}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <FormDialog
        open={paying !== null}
        onOpenChange={(o) => !o && setPaying(null)}
        title={side === "in" ? "Registrar abono" : "Registrar pago"}
        description={paying ? `${paying.party} · ${paying.number} · saldo ${formatCurrency(paying.balance)}` : undefined}
        submitLabel={word.submit}
        pendingLabel="Guardando…"
        onSubmit={async (d) => {
          if (!paying) return { ok: false, message: "No hay documento seleccionado." };
          const amount = Number(String(d.get("amount") ?? "").replace(/[^\d.,]/g, "").replace(",", "."));
          const method = String(d.get("method") ?? "");
          if (!(amount > 0)) return { ok: false, message: "Revisa los campos marcados.", fieldErrors: { amount: "Escribe un valor mayor que cero." } };
          if (amount > paying.balance) return { ok: false, message: "Revisa los campos marcados.", fieldErrors: { amount: "No puede ser mayor que el saldo." } };
          const r = side === "in" ? await receivePaymentAction(slug, paying.id, { amount, method }) : await paySupplierAction(slug, paying.id, { amount, method, note: String(d.get("note") ?? "") });
          return r.ok ? { ok: true, message: r.message } : { ok: false, message: r.message };
        }}
        onSuccess={({ message }) => {
          if (message) toast(message, "success");
          router.refresh();
        }}
      >
        {({ fieldErrors }) => (
          <div className="grid gap-3">
            <Field label="Valor" required error={fieldErrors.amount} hint={paying ? `Máximo ${formatCurrency(paying.balance)}` : undefined}>
              {(c) => <input {...c} name="amount" inputMode="decimal" autoComplete="off" defaultValue={paying ? String(paying.balance) : ""} className={inputClasses} />}
            </Field>
            <Field label="Medio de pago" required>
              {(c) => (
                <Select {...c} name="method" defaultValue="CASH">
                  {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </Select>
              )}
            </Field>
            {side === "out" ? <Field label="Nota" optional>{(c) => <input {...c} name="note" autoComplete="off" maxLength={200} className={inputClasses} placeholder="Transferencia Bancolombia" />}</Field> : null}
          </div>
        )}
      </FormDialog>
    </div>
  );
}
