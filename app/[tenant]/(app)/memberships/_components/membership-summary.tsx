import { Clock, CreditCard, RefreshCw, XCircle } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { KpiCard } from "@/components/brand/kpi-card";
import type { MembershipMetrics } from "@/lib/tenant-db";

/**
 * Resumen del módulo (Server Component). Métricas reales, sin números de
 * color: Activas / Por vencer / Vencidas / Renovaciones del mes.
 */
export default function MembershipSummary({
  metrics,
}: {
  metrics: MembershipMetrics;
}) {
  return (
    <section
      aria-label="Resumen de membresías"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      <KpiCard
        compact
        label="Activas"
        value={String(metrics.activeCount)}
        hint="Con más de 3 días de vigencia"
        icon={CreditCard}
      />
      <KpiCard
        compact
        label="Por vencer"
        value={String(metrics.expiringCount)}
        hint="Vencen en los próximos 3 días"
        icon={Clock}
      />
      <KpiCard
        compact
        label="Vencidas"
        value={String(metrics.expiredCount)}
        hint="Pendientes de renovación"
        icon={XCircle}
        alert={metrics.expiredCount > 0}
      />
      <KpiCard
        compact
        label="Renovaciones del mes"
        value={formatCurrency(metrics.renewalRevenueProjection)}
        hint="Precio de membresías que vencen este mes"
        icon={RefreshCw}
      />
    </section>
  );
}
