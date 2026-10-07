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
      <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-500">
              Activas
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-emerald-600 sm:text-3xl">
              {metrics.activeCount}
            </p>
          </div>
          <span
            aria-hidden="true"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-600"
          >
            <CheckCircle2 className="h-5 w-5" />
          </span>
        </div>
        <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
          Con más de 3 días de vigencia
        </p>
      </article>

      {/* Por vencer */}
      <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-500">
              Por vencer
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-amber-600 sm:text-3xl">
              {metrics.expiringCount}
            </p>
          </div>
          <span
            aria-hidden="true"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-600"
          >
            <Clock className="h-5 w-5" />
          </span>
        </div>
        <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
          Vencen en los próximos 3 días
        </p>
      </article>

      {/* Vencidas */}
      <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-500">
              Vencidas
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-rose-600 sm:text-3xl">
              {metrics.expiredCount}
            </p>
          </div>
          <span
            aria-hidden="true"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-rose-50 text-rose-600"
          >
            <AlertTriangle className="h-5 w-5" />
          </span>
        </div>
        <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
          Pendientes de renovación
        </p>
      </article>

      {/* Proyección de renovaciones */}
      <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-500">
              Renovaciones del mes
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-indigo-600 sm:text-3xl">
              {formatCurrency(metrics.renewalRevenueProjection)}
            </p>
          </div>
          <span
            aria-hidden="true"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-indigo-50 text-indigo-600"
          >
            <TrendingUp className="h-5 w-5" />
          </span>
        </div>
        <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
          Precio de membresías que vencen este mes
        </p>
      </article>
    </section>
  );
}
