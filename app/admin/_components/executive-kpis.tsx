import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  Building2,
  CircleDollarSign,
  Clock,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { formatCurrency } from "@/lib/format";
import type { ExecutiveKpis } from "@/lib/admin-db";
import { cn } from "@/lib/utils";
import Sparkline from "./sparkline";

/**
 * KPIs ejecutivos del CEO. Todos los números salen de la base de datos real
 * (ver `lib/admin-db.ts`): nada de mocks. Donde no existe una fuente
 * (MRR por falta de suscripciones, trials, último login) se declara
 * explícitamente en vez de inventar.
 */
export default function ExecutiveKpis({
  metrics,
}: {
  metrics: ExecutiveKpis;
}) {
  const { revenue, newTenants, onboarding, realActivity, alerts } = metrics;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {/* Ingresos registrados (volumen transaccionado por los negocios) */}
      <KpiCard
        icon={CircleDollarSign}
        label={`Ingresos registrados (${revenue.windowDays} d)`}
        accent="amber"
      >
        <p className="text-2xl font-semibold tracking-tight tabular-nums">
          {formatCurrency(revenue.total)}
        </p>
        <div className="mt-1 flex items-center gap-2 text-xs">
          {revenue.changePct === null ? (
            <span className="text-muted-foreground">
              Sin periodo previo para comparar
            </span>
          ) : (
            <span
              className={cn(
                "inline-flex items-center gap-1 font-medium",
                revenue.changePct >= 0
                  ? "text-success"
                  : "text-destructive",
              )}
            >
              {revenue.changePct >= 0 ? (
                <TrendingUp aria-hidden="true" className="h-3.5 w-3.5" />
              ) : (
                <TrendingDown aria-hidden="true" className="h-3.5 w-3.5" />
              )}
              {revenue.changePct >= 0 ? "+" : ""}
              {revenue.changePct}% vs periodo anterior
            </span>
          )}
        </div>
        <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
          Pagos aprobados de los negocios. El <strong>MRR no está
          disponible</strong>: no existe un modelo de suscripciones.
        </p>
      </KpiCard>

      {/* Nuevos negocios */}
      <KpiCard icon={Building2} label="Nuevos negocios" accent="sky">
        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-semibold tracking-tight tabular-nums">
            {newTenants.week}
          </p>
          <span className="text-xs text-muted-foreground">
            esta semana · {newTenants.month} en 30 días
          </span>
        </div>
        <Sparkline
          series={newTenants.series}
          className="mt-3 h-12 w-full text-muted-foreground"
        />
      </KpiCard>

      {/* Onboarding (sustituye a "trials": no existe ese concepto) */}
      <KpiCard icon={Clock} label="Onboarding" accent="violet">
        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-semibold tracking-tight tabular-nums">
            {onboarding.pending}
          </p>
          <span className="text-xs text-muted-foreground">
            pendientes · {onboarding.completed} completos
          </span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {onboarding.stalled > 0 ? (
            <span className="font-medium text-gold-700">
              {onboarding.stalled} detenidos hace más de 7 días
            </span>
          ) : (
            "Ninguno detenido hace más de 7 días"
          )}
        </p>
      </KpiCard>

      {/* Actividad real + alertas */}
      <div className="flex flex-col gap-4">
        <KpiCard icon={Activity} label="Actividad real" accent="emerald">
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-semibold tracking-tight tabular-nums">
              {realActivity.activeTenants}
            </p>
            <span className="text-xs text-muted-foreground">
              negocios activos en {realActivity.windowDays} días
            </span>
          </div>
        </KpiCard>

        <KpiCard icon={AlertTriangle} label="Alertas operativas" accent="rose">
          <p className="text-2xl font-semibold tracking-tight tabular-nums">
            {alerts.total}
          </p>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            <AlertRow
              label="Pagos rechazados"
              value={alerts.failedPayments}
            />
            <AlertRow
              label="Onboarding detenido"
              value={alerts.stalledOnboarding}
            />
            <AlertRow
              label="Negocios suspendidos"
              value={alerts.suspendedTenants}
            />
          </ul>
        </KpiCard>
      </div>
    </div>
  );
}

const ACCENTS: Record<string, string> = {
  amber: "bg-gold-100 text-gold-700 ring-gold-500/15",
  sky: "bg-muted text-muted-foreground ring-border",
  violet: "bg-muted text-muted-foreground ring-border",
  emerald: "bg-success/10 text-success ring-success/15",
  rose: "bg-destructive/10 text-destructive ring-destructive/15",
};

function KpiCard({
  icon: Icon,
  label,
  accent,
  children,
}: {
  icon: LucideIcon;
  label: string;
  accent: keyof typeof ACCENTS;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-xs">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "inline-flex size-7 items-center justify-center rounded-md ring-1 ring-inset",
            ACCENTS[accent],
          )}
        >
          <Icon aria-hidden="true" className="h-4 w-4" />
        </span>
        <span className="text-xs font-medium text-muted-foreground">
          {label}
        </span>
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function AlertRow({ label, value }: { label: string; value: number }) {
  return (
    <li className="flex items-center justify-between gap-2">
      <span>{label}</span>
      <span
        className={cn(
          "font-medium tabular-nums",
          value > 0 ? "text-destructive" : "text-muted-foreground",
        )}
      >
        {value}
      </span>
    </li>
  );
}
