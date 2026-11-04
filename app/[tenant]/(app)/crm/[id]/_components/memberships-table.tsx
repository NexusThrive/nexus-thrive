"use client";

import type { Customer360Membership } from "@/lib/industry/gym/memberships";
import { formatCurrency, formatDateShort } from "@/lib/foundation/format";
import { typeLabel } from "@/lib/industry/gym/memberships";
import type { VerticalTerms } from "@/lib/core/sectors/terms";
import { AdaptiveTable } from "@/components/organisms/adaptive-table";
import { MembershipStatusPill } from "./status-pills";

/**
 * Pestaña del módulo Membresías (adaptada al vocabulario de la vertical):
 * plan, inicio, vencimiento, estado dinámico y precio.
 */
export default function MembershipsTable({
  memberships,
  terms,
}: {
  memberships: Customer360Membership[];
  terms: VerticalTerms;
}) {
  const emptyText = `Este ${terms.customer.toLowerCase()} todavía no tiene ${terms.items.toLowerCase()} registradas.`;

  if (memberships.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      <AdaptiveTable
        className="rounded-none border-0"
        caption={`${terms.items} del ${terms.customer.toLowerCase()}`}
        rows={memberships}
        getRowId={(m) => m.id}
        columns={[
          { key: "plan", header: "Plan", role: "primary", cell: (m) => typeLabel(m.type) },
          { key: "start", header: "Inicio", role: "detail", cell: (m) => <span className="text-muted-foreground">{formatDateShort(m.startDate)}</span> },
          { key: "end", header: "Vencimiento", role: "detail", cell: (m) => <span className="text-muted-foreground">{formatDateShort(m.endDate)}</span> },
          { key: "status", header: "Estado", role: "status", cell: (m) => <MembershipStatusPill status={m.status} /> },
          { key: "price", header: "Precio", role: "figure", cell: (m) => <span className="font-semibold text-foreground">{formatCurrency(m.price)}</span> },
        ]}
      />
    </div>
  );
}
