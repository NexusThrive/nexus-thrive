import type { Customer360Membership } from "@/lib/tenant-db";
import { formatCurrency, formatDateShort } from "@/lib/format";
import { typeLabel } from "@/lib/memberships";
import type { VerticalTerms } from "@/lib/vertical-terms";
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
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-muted text-left text-xs font-semibold text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-3">
                Plan
              </th>
              <th scope="col" className="px-4 py-3">
                Inicio
              </th>
              <th scope="col" className="px-4 py-3">
                Vencimiento
              </th>
              <th scope="col" className="px-4 py-3">
                Estado
              </th>
              <th scope="col" className="px-4 py-3">
                Precio
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {memberships.map((membership) => (
              <tr key={membership.id} className="hover:bg-muted">
                <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">
                  {typeLabel(membership.type)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                  {formatDateShort(membership.startDate)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                  {formatDateShort(membership.endDate)}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <MembershipStatusPill status={membership.status} />
                </td>
                <td className="whitespace-nowrap px-4 py-3 font-semibold text-foreground">
                  {formatCurrency(membership.price)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
