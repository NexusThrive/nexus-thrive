import type { LucideIcon } from "lucide-react";

/**
 * Tipos de presentación del dashboard y la actividad reciente.
 * (Antes vivían en `lib/dashboard-mocks.ts`; se separaron para poder
 * eliminar los mocks sin desacoplar los componentes de presentación.)
 */

export type MetricTone = "indigo" | "emerald" | "rose" | "slate";

export type TrendDirection = "up" | "down" | "neutral";

export type DashboardMetric = {
  id: string;
  title: string;
  value: string;
  description: string;
  icon: LucideIcon;
  iconTone: MetricTone;
  trend: {
    direction: TrendDirection;
    label: string;
  };
};

export type ActivityType = "payment" | "expense";

/** Movimiento del negocio: pago aprobado o gasto. */
export type RecentActivityItem = {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  /** Monto ya formateado (COP). */
  amount: string;
  time: string;
};