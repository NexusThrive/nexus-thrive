import { Activity, BadgeCheck, CalendarDays, Receipt } from "lucide-react";
import type {
  Customer360Membership,
  Customer360Metrics,
  Customer360Profile,
} from "@/lib/tenant-db";
import type { VerticalTerms } from "@/lib/vertical-terms";
import { formatDateTime, formatDateShort } from "@/lib/format";
import { typeLabel } from "@/lib/memberships";
import { AccountStatusPill } from "./status-pills";

/**
 * Resumen lateral de la cuenta (columna derecha del tab Resumen):
 * datos reales, sin inventar nada.
 */
export default function AccountSummaryCard({
  customer,
  metrics,
  paymentsTotal,
  approvedCount,
  latestActiveMembership,
  showMemberships,
  terms,
}: {
  customer: Customer360Profile;
  metrics: Customer360Metrics;
  paymentsTotal: number;
  approvedCount: number;
  latestActiveMembership: Customer360Membership | null;
  showMemberships: boolean;
  terms: VerticalTerms;
}) {
  return (
    <aside className="rounded-lg border border-border bg-card p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Resumen de la cuenta
      </h2>
      <dl className="mt-4 space-y-4 text-sm">
        <div className="flex items-start justify-between gap-3">
          <dt className="flex items-center gap-2 text-muted-foreground">
            <Activity aria-hidden="true" className="h-4 w-4" />
            Estado de cuenta
          </dt>
          <dd>
            <AccountStatusPill status={metrics.accountStatus} />
          </dd>
        </div>

        <div className="flex items-start justify-between gap-3">
          <dt className="flex items-center gap-2 text-muted-foreground">
            <CalendarDays aria-hidden="true" className="h-4 w-4" />
            {terms.customer} desde
          </dt>
          <dd className="text-right font-medium text-foreground">
            {formatDateShort(customer.createdAt)}
          </dd>
        </div>

        <div className="flex items-start justify-between gap-3">
          <dt className="flex items-center gap-2 text-muted-foreground">
            <Activity aria-hidden="true" className="h-4 w-4" />
            Última actividad
          </dt>
          <dd className="text-right font-medium text-foreground">
            {metrics.lastActivityDate
              ? formatDateTime(metrics.lastActivityDate)
              : "Sin actividad"}
          </dd>
        </div>

        <div className="flex items-start justify-between gap-3">
          <dt className="flex items-center gap-2 text-muted-foreground">
            <Receipt aria-hidden="true" className="h-4 w-4" />
            Pagos
          </dt>
          <dd className="text-right font-medium text-foreground">
            {paymentsTotal} registrados
            <span className="block text-xs font-normal text-muted-foreground">
              {approvedCount} aprobados
            </span>
          </dd>
        </div>

        {showMemberships ? (
          <div className="flex items-start justify-between gap-3">
            <dt className="flex items-center gap-2 text-muted-foreground">
              <BadgeCheck aria-hidden="true" className="h-4 w-4" />
              {terms.items}
            </dt>
            <dd className="text-right font-medium text-foreground">
              {latestActiveMembership ? (
                <>
                  {typeLabel(latestActiveMembership.type)}
                  <span className="block text-xs font-normal text-muted-foreground">
                    hasta {formatDateShort(latestActiveMembership.endDate)}
                  </span>
                </>
              ) : (
                <span className="text-muted-foreground">Sin {terms.items.toLowerCase()}</span>
              )}
            </dd>
          </div>
        ) : null}
      </dl>
    </aside>
  );
}
