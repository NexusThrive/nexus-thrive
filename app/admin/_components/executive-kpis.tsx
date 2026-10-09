import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Building2,
  CircleDollarSign,
  Clock,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { formatCurrency } from "@/lib/format";
import type { ExecutiveKpis as ExecutiveKpisData } from "@/lib/admin-db";
import { cn } from "@/lib/utils";
import Sparkline from "./sparkline";

/**
 * KPIs ejecutivos del CEO. Todos los números salen de la base de datos real
 * (ver `lib/admin-db.ts`): nada de mocks. Cuatro tarjetas de igual altura con
 * el valor arriba y la mini gráfica/pie abajo (`margin-top:auto`); las alertas
 * van en una franja delgada a ancho completo.
 */
export default function ExecutiveKpis({
  metrics,
}: {
  metrics: ExecutiveKpisData;
}) {
  const { revenue, newTenants, onboarding, realActivity, alerts } = metrics;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={CircleDollarSign}
          label={`Ingresos registrados (${revenue.windowDays} d)`}
        >
          <p className="font-display text-2xl font-semibold tabular-nums text-foreground">
            {formatCurrency(revenue.total)}
          </p>
          <div className="mt-auto pt-3">
            {revenue.changePct === null ? (
              <p className="text-xs text-muted-foreground">
                Sin periodo previo para comparar
              </p>
            ) : (
              <p
                className={cn(
                  "inline-flex items-center gap-1 text-xs font-medium",
                  revenue.changePct >= 0 ? "text-foreground" : "text-danger",
                )}
              >
                {revenue.changePct >= 0 ? (
                  <TrendingUp aria-hidden="true" className="size-3.5" />
                ) : (
                  <TrendingDown aria-hidden="true" className="size-3.5" />
                )}
                {revenue.changePct >= 0 ? "+" : ""}
                {revenue.changePct}% vs periodo anterior
              </p>
            )}
            <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
              Pagos aprobados de los negocios. El <strong>MRR no está
              disponible</strong>: no existe un modelo de suscripciones.
            </p>
          </div>
        </KpiCard>

        <KpiCard icon={Building2} label="Nuevos negocios">
          <div className="flex items-baseline gap-2">
            <p className="font-display text-2xl font-semibold tabular-nums text-foreground">
              {newTenants.week}
            </p>
            <span className="text-xs text-muted-foreground">
              esta semana · {newTenants.month} en 30 días
            </span>
          </div>
          <Sparkline
            series={newTenants.series}
            className="mt-auto pt-3 h-12 w-full text-foreground"
          />
        </KpiCard>

        <KpiCard icon={Clock} label="Onboarding">
          <div className="flex items-baseline gap-2">
            <p className="font-display text-2xl font-semibold tabular-nums text-foreground">
              {onboarding.pending}
            </p>
            <span className="text-xs text-muted-foreground">
              pendientes · {onboarding.completed} completos
            </span>
          </div>
          <p className="mt-auto pt-3 text-xs text-muted-foreground">
            {onboarding.stalled > 0 ? (
              <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                <span aria-hidden="true" className="block size-1.5 bg-danger" />
                {onboarding.stalled} detenidos hace más de 7 días
              </span>
            ) : (
              "Ninguno detenido hace más de 7 días"
            )}
          </p>
        </KpiCard>

        <KpiCard icon={Activity} label="Actividad real">
          <div className="flex items-baseline gap-2">
            <p className="font-display text-2xl font-semibold tabular-nums text-foreground">
              {realActivity.activeTenants}
            </p>
            <span className="text-xs text-muted-foreground">
              negocios activos en {realActivity.windowDays} días
            </span>
          </div>
          <p className="mt-auto pt-3 text-xs text-muted-foreground">
            Con movimientos registrados en la ventana
          </p>
        </KpiCard>
      </div>

      <AlertStrip alerts={alerts} />
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="truncate text-[13px] text-muted-foreground">
          {label}
        </span>
        <Icon
          aria-hidden="true"
          strokeWidth={1.5}
          className="size-[18px] shrink-0 text-muted-foreground"
        />
      </div>
      <div className="mt-2 flex flex-1 flex-col">{children}</div>
    </div>
  );
}

function AlertStrip({
  alerts,
}: {
  alerts: ExecutiveKpisData["alerts"];
}) {
  if (alerts.total === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-5 py-3 text-sm text-muted-foreground">
        <span aria-hidden="true" className="block size-1.5 bg-success" />
        Sin alertas operativas
      </div>
    );
  }

  const items: { label: string; value: number }[] = [
    { label: "Pagos rechazados", value: alerts.failedPayments },
    { label: "Onboarding detenido", value: alerts.stalledOnboarding },
    { label: "Negocios suspendidos", value: alerts.suspendedTenants },
  ];

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-border bg-card px-5 py-3">
      <span className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
        <span aria-hidden="true" className="block size-1.5 bg-danger" />
        {alerts.total} alertas operativas
      </span>
      <ul className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-muted-foreground">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-1.5">
            {item.label}
            <span
              className={cn(
                "font-medium tabular-nums",
                item.value > 0 ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {item.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
