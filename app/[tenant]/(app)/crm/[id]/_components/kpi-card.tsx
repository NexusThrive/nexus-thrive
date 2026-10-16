import type { LucideIcon } from "lucide-react";
import { KpiCard as SystemKpiCard } from "@/components/molecules/kpi-card";

type KpiTone = "indigo" | "emerald" | "amber" | "rose" | "slate";

/**
 * KPI de la Ficha 360°: el `KpiCard` del sistema (cifra en tinta, icono
 * discreto). `tone="rose"` marca una alerta real con el punto rojo; los demás
 * tonos se conservan por compatibilidad pero ya no pintan chips de color.
 */
export default function KpiCard({
  title,
  value,
  description,
  icon,
  tone = "slate",
}: {
  title: string;
  value: string;
  description?: string;
  icon: LucideIcon;
  tone?: KpiTone;
}) {
  return (
    <SystemKpiCard
      label={title}
      value={value}
      hint={description}
      icon={icon}
      alert={tone === "rose"}
      compact
      className="[&>p]:truncate"
    />
  );
}
