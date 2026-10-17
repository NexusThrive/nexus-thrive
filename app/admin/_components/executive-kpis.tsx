import { Activity, Building2, CircleDollarSign, Clock } from "lucide-react";
import { Delta } from "@/components/atoms/delta";
import { Alert } from "@/components/molecules/alert";
import { KpiCard } from "@/components/molecules/kpi-card";
import type { ExecutiveKpis as ExecutiveKpisData } from "@/lib/admin-db";

/**
 * KPIs ejecutivos del CEO con datos reales de la base (ver `lib/admin-db.ts`):
 * volumen de pagos con su variación, altas de negocios con tendencia diaria,
 * onboarding y actividad real. Las alertas operativas van debajo en un aviso.
 */
export default function ExecutiveKpis({ metrics }: { metrics: ExecutiveKpisData }) {
  const { revenue, newTenants, onboarding, realActivity, alerts } = metrics;
  const series = newTenants.series.map((point) => point.count);

  return (
    <div className="space-y-3.5">
      <div className="grid grid-cols-2 gap-3.5 xl:grid-cols-4">
        <KpiCard
          index={0}
          icon={CircleDollarSign}
          label={`Pagos de los negocios (${revenue.windowDays} d)`}
          value={revenue.total}
          format="cop"
          delta={revenue.changePct == null ? undefined : <Delta value={revenue.changePct} />}
          hint={revenue.changePct == null ? "Sin periodo previo para comparar" : "vs. periodo anterior"}
        >
          No es el MRR de NEXUS: aún no hay modelo de suscripciones.
        </KpiCard>
        <KpiCard
          index={1}
          icon={Building2}
          label="Nuevos negocios"
          value={newTenants.week}
          hint={`esta semana · ${newTenants.month} en 30 días`}
          trend={series.length > 1 ? series : undefined}
        />
        <KpiCard
          index={2}
          icon={Clock}
          label="Onboarding pendiente"
          value={onboarding.pending}
          alert={onboarding.stalled > 0}
          hint={
            onboarding.stalled > 0
              ? `${onboarding.stalled} detenidos hace más de 7 días`
              : `${onboarding.completed} completos · ninguno detenido`
          }
        />
        <KpiCard
          index={3}
          icon={Activity}
          label="Actividad real"
          value={realActivity.activeTenants}
          hint={`negocios con movimientos en ${realActivity.windowDays} días`}
        />
      </div>

      {alerts.total === 0 ? (
        <Alert tone="success">Sin alertas operativas.</Alert>
      ) : (
        <Alert tone="danger" title={`${alerts.total} alertas operativas`}>
          <span className="text-muted-foreground">
            Pagos rechazados <b className="tabular-nums text-foreground">{alerts.failedPayments}</b> · Onboarding detenido{" "}
            <b className="tabular-nums text-foreground">{alerts.stalledOnboarding}</b> · Negocios suspendidos{" "}
            <b className="tabular-nums text-foreground">{alerts.suspendedTenants}</b>
          </span>
        </Alert>
      )}
    </div>
  );
}
