import type { LucideIcon } from "lucide-react";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/cn";
import type { DashboardMetric, MetricTone, TrendDirection } from "@/lib/dashboard-mocks";

type MetricCardProps = Pick<
  DashboardMetric,
  "title" | "value" | "description" | "icon" | "iconTone" | "trend"
>;

const ICON_TONES: Record<MetricTone, string> = {
  indigo: "bg-indigo-50 text-indigo-600",
  emerald: "bg-emerald-50 text-emerald-600",
  rose: "bg-rose-50 text-rose-600",
  slate: "bg-slate-100 text-slate-600",
};

const TREND_TONES: Record<"positive" | "negative" | "neutral", string> = {
  positive: "border-emerald-200 bg-emerald-50 text-emerald-700",
  negative: "border-rose-200 bg-rose-50 text-rose-700",
  neutral: "border-slate-200 bg-slate-50 text-slate-600",
};

const TREND_ICONS: Record<TrendDirection, LucideIcon> = {
  up: TrendingUp,
  down: TrendingDown,
  neutral: Minus,
};

/**
 * Card de métrica del dashboard. Componente de presentación puro
 * (Server Component): recibe solo datos serializables + referencias de icono.
 */
export default function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  iconTone,
  trend,
}: MetricCardProps) {
  const TrendIcon = TREND_ICONS[trend.direction];
  const trendTone =
    trend.direction === "up"
      ? "positive"
      : trend.direction === "down"
        ? "negative"
        : "neutral";

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-500">
            {title}
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            {value}
          </p>
        </div>
        <span
          aria-hidden="true"
          className={cn(
            "grid h-10 w-10 shrink-0 place-items-center rounded-lg",
            ICON_TONES[iconTone],
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-slate-100 pt-3">
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
            TREND_TONES[trendTone],
          )}
        >
          <TrendIcon className="h-3.5 w-3.5" aria-hidden="true" />
          {trend.label}
        </span>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
    </article>
  );
}
