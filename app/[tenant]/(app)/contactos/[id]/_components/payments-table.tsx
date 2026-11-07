"use client";

import type { Customer360Payment } from "@/lib/core/tenancy/db";
import { formatCurrency, formatDateTime } from "@/lib/foundation/format";
import { paymentMethodLabel } from "@/lib/foundation/kernel/payment-vocabulary";
import { AdaptiveTable } from "@/components/organisms/adaptive-table";
import { PaymentStatusPill } from "./status-pills";

/** Pestaña de cobros: historial limitado a los más recientes (acotado). */
export default function PaymentsTable({
  payments,
  total,
}: {
  payments: Customer360Payment[];
  total: number;
}) {
  if (payments.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
        Este cliente todavía no tiene cobros registrados.
      </div>
    );
  }

  const truncated = total > payments.length;

  return (
    <div className="rounded-lg border border-border bg-card">
      <AdaptiveTable
        className="rounded-none border-0"
        caption="Cobros del cliente"
        rows={payments}
        getRowId={(p) => p.id}
        columns={[
          { key: "date", header: "Fecha", role: "secondary", cell: (p) => <span className="text-muted-foreground">{formatDateTime(p.createdAt)}</span> },
          { key: "amount", header: "Monto", role: "figure", align: "right", cell: (p) => <span className="font-semibold text-foreground">{formatCurrency(p.amount)}</span> },
          { key: "method", header: "Método", role: "primary", cell: (p) => paymentMethodLabel(p.provider) },
          { key: "status", header: "Estado", role: "status", cell: (p) => <PaymentStatusPill status={p.status} /> },
          { key: "ref", header: "Referencia", role: "detail", cell: (p) => p.providerRefId || <span className="text-muted-foreground/50">—</span> },
          { key: "desc", header: "Descripción", role: "detail", cell: (p) => p.description || <span className="text-muted-foreground/50">—</span> },
        ]}
      />
      {truncated ? (
        <p className="border-t border-border/70 px-4 py-2.5 text-xs text-muted-foreground">
          Mostrando los {payments.length} cobros más recientes de {total}.
        </p>
      ) : null}
    </div>
  );
}
