import type { LucideIcon } from "lucide-react";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/cn";
import type {
  DashboardMetric,
  MetricTone,
  TrendDirection,
} from "@/lib/dashboard-types";

type MetricCardProps = Pick<
  DashboardMetric,
  "title" | "value" | "description" | "icon" | "iconTone" | "trend"
>;

const ICON_TONES: Record<MetricTone, string> = {
  indigo: "bg-muted text-foreground",
  emerald: "bg-success/10 text-success",
  rose: "bg-destructive/10 text-destructive",
  slate: "bg-muted text-muted-foreground",
};

const TREND_TONES: Record<"positive" | "negative" | "neutral", string> = {
  positive: "border-success/20 bg-success/10 text-success",
  negative: "border-destructive/20 bg-destructive/10 text-destructive",
  neutral: "border-border bg-muted text-muted-foreground",
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
    <article className="rounded-lg border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-muted-foreground">
            {title}
          </p>
          <p className="mt-2 font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {value}
          </p>
        </div>
        <span
          aria-hidden="true"
          className={cn(
            "grid h-10 w-10 shrink-0 place-items-center rounded-md",
            ICON_TONES[iconTone],
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-border/70 pt-3">
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
            TREND_TONES[trendTone],
          )}
        >
          <TrendIcon className="h-3.5 w-3.5" aria-hidden="true" />
          {trend.label}
        </span>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </article>
  );
}