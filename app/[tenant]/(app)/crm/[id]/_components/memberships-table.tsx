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
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
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
          <tbody className="divide-y divide-slate-100">
            {memberships.map((membership) => (
              <tr key={membership.id} className="hover:bg-slate-50">
                <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
                  {typeLabel(membership.type)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                  {formatDateShort(membership.startDate)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                  {formatDateShort(membership.endDate)}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <MembershipStatusPill status={membership.status} />
                </td>
                <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-900">
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