"use client";

import { MoneyInput } from "@/components/molecules/money-input";
import Link from "next/link";
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
import { AdaptiveTable } from "@/components/organisms/adaptive-table";
import { paySupplierAction, receivePaymentAction } from "@/app/[tenant]/(app)/finanzas/cartera/actions";
import { formatCurrency } from "@/lib/foundation/format";
import { PAYMENT_METHODS } from "@/lib/foundation/kernel/payment-vocabulary";
import { BUCKETS, BUCKET_LABELS } from "@/lib/foundation/kernel/aging";
import type { Cartera, CarteraRow } from "@/lib/domains/finance/receivables/receivables-db";

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
        <p className="text-ui text-muted-foreground">{word.total}</p>
        <p className="font-mono text-2xl font-semibold tabular-nums">{formatCurrency(cartera.aging.total)}</p>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {BUCKETS.map((b) => (
            <li key={b} className="rounded-md bg-surface-muted px-3 py-2">
              <span className="block text-xs text-muted-foreground">{BUCKET_LABELS[b]}</span>
              <b className="font-mono text-ui tabular-nums">{formatCurrency(cartera.aging.buckets[b].amount)}</b>
            </li>
          ))}
        </ul>
      </section>

      {cartera.rows.length === 0 ? (
        <EmptyState mark="page" remember={side === "in"} title={side === "in" ? "Nadie te debe" : "No debes nada"} description={side === "in" ? "Las cuentas de cobro emitidas con saldo aparecerán aquí." : "Las facturas de proveedor registradas con saldo aparecerán aquí."} />
      ) : (
        <AdaptiveTable
          caption={`Cuentas ${word.total.toLowerCase()} con su saldo y vencimiento`}
          rows={cartera.rows}
          getRowId={(r) => r.id}
          columns={[
            { key: "party", header: word.party, role: "primary", cell: (r) => r.party },
            { key: "number", header: "Documento", role: "secondary", cell: (r) => <span className="font-mono">{r.number}</span> },
            {
              key: "due",
              header: "Vence",
              role: "detail",
              cell: (r) => (
                <>
                  {r.dueDate ?? "Sin fecha"}
                  {r.daysOverdue > 0 ? <Badge variant={r.daysOverdue > 60 ? "destructive" : "warning"} className="ml-2">{r.daysOverdue} días de mora</Badge> : null}
                </>
              ),
            },
            { key: "total", header: "Total", role: "detail", align: "right", cell: (r) => <span className="font-mono tabular-nums">{formatCurrency(r.total)}</span> },
            { key: "balance", header: "Saldo", role: "figure", cell: (r) => <span className="font-mono font-semibold">{formatCurrency(r.balance)}</span> },
            {
              key: "actions",
              header: "Acciones",
              role: "action",
              cell: (r) =>
                // Un pedido o una membresía se cobra desde su propia pantalla; solo las cuentas se abonan aquí.
                r.origin === "STORE_ORDER" || r.origin === "MEMBERSHIP" ? (
                  <Link href={`/${slug}/${r.origin === "STORE_ORDER" ? "orders" : "memberships"}`} aria-label={`Ver ${r.origin === "STORE_ORDER" ? "pedido" : "membresía"} · ${r.party} ${r.number}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                    {r.origin === "STORE_ORDER" ? "Ver pedido" : "Ver membresía"}
                  </Link>
                ) : (
                  <button type="button" onClick={() => setPaying(r)} aria-label={`${word.action} · ${r.party} ${r.number}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                    {word.action}
                  </button>
                ),
            },
          ]}
        />
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
              {(c) => <MoneyInput {...c} name="amount" defaultValue={paying ? paying.balance : null} />}
            </Field>
            <Field label="Medio de pago" required>
              {(c) => (
                <Select {...c} name="method" defaultValue="CASH">
                  {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </Select>
              )}
            </Field>
            {side === "out" ? <Field label="Nota" optional>{(c) => <input {...c} name="note" autoComplete="off" maxLength={200} className={inputClasses} placeholder="Medio de pago" />}</Field> : null}
          </div>
        )}
      </FormDialog>
    </div>
  );
}
