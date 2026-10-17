import { formatCurrency } from "@/lib/format";
import { StatTile } from "@/components/molecules/stat-tile";
import type { MembershipMetrics } from "@/lib/tenant-db";

/**
 * Resumen de membresías (Server Component, datos reales): Activas, Por vencer
 * (el punto late: esperan acción), Vencidas y Renovaciones del mes.
 */
export default function MembershipSummary({ metrics }: { metrics: MembershipMetrics }) {
  return (
    <section aria-label="Resumen de membresías" className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
      <StatTile index={0} label="Activas" value={metrics.activeCount} tone="success" note="Con más de 3 días de vigencia" />
      <StatTile index={1} label="Por vencer" value={metrics.expiringCount} tone="warning" pulse={metrics.expiringCount > 0} note="En los próximos 3 días" />
      <StatTile index={2} label="Vencidas" value={metrics.expiredCount} tone="danger" note="Pendientes de renovación" />
      <StatTile index={3} label="Renovaciones" value={formatCurrency(metrics.renewalRevenueProjection)} note="Valor por cobrar este mes" />
    </section>
  );
}
