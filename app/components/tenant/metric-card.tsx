import { KpiCard } from "@/components/brand/kpi-card";
import type { DashboardMetric } from "@/lib/dashboard-types";

type MetricCardProps = Pick<
  DashboardMetric,
  "title" | "value" | "description" | "icon" | "alert"
>;

/**
 * Card de métrica del dashboard (Server Component): delega en `KpiCard`.
 * Sin chips de color; el valor puede ir en tinta aunque sea 0.
 */
export default function MetricCard({
  title,
  value,
  description,
  icon,
  alert,
}: MetricCardProps) {
  return (
    <KpiCard
      label={title}
      value={value}
      hint={description}
      icon={icon}
      alert={alert}
    />
  );
}
