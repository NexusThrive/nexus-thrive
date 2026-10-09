import { AlertTriangle, CheckCircle2, Clock, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import type { MembershipMetrics } from "@/lib/tenant-db";

/**
 * Resumen del módulo (Server Component). Métricas reales:
 * - Conteos por estado dinámico (active / expiring / expired).
 * - Proyección de renovaciones = suma de precios de membresías que vencen
 *   en el mes en curso (horario Bogotá).
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
      {/* Activas */}
      <article className="rounded-lg border border-border bg-card p-5 shadow-xs">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-muted-foreground">
              Activas
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-success sm:text-3xl">
              {metrics.activeCount}
            </p>
          </div>
          <span
            aria-hidden="true"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-success/10 text-success"
          >
            <CheckCircle2 className="h-5 w-5" />
          </span>
        </div>
        <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
          Con más de 3 días de vigencia
        </p>
      </article>

      {/* Por vencer */}
      <article className="rounded-lg border border-border bg-card p-5 shadow-xs">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-muted-foreground">
              Por vencer
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-warning-foreground sm:text-3xl">
              {metrics.expiringCount}
            </p>
          </div>
          <span
            aria-hidden="true"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-warning text-warning-foreground"
          >
            <Clock className="h-5 w-5" />
          </span>
        </div>
        <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
          Vencen en los próximos 3 días
        </p>
      </article>

      {/* Vencidas */}
      <article className="rounded-lg border border-border bg-card p-5 shadow-xs">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-muted-foreground">
              Vencidas
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-destructive sm:text-3xl">
              {metrics.expiredCount}
            </p>
          </div>
          <span
            aria-hidden="true"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-destructive/10 text-destructive"
          >
            <AlertTriangle className="h-5 w-5" />
          </span>
        </div>
        <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
          Pendientes de renovación
        </p>
      </article>

      {/* Proyección de renovaciones */}
      <article className="rounded-lg border border-border bg-card p-5 shadow-xs">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-muted-foreground">
              Renovaciones del mes
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-accent-text sm:text-3xl">
              {formatCurrency(metrics.renewalRevenueProjection)}
            </p>
          </div>
          <span
            aria-hidden="true"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent-subtle text-accent-text"
          >
            <TrendingUp className="h-5 w-5" />
          </span>
        </div>
        <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
          Precio de membresías que vencen este mes
        </p>
      </article>
    </section>
  );
}
