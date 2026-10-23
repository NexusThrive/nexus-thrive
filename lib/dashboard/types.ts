import type { LucideIcon } from "lucide-react";

/**
 * Tipos de presentación del dashboard y la actividad reciente.
 * El color del dato es tinta; el estado solo aparece como un punto cuadrado.
 */

export type DashboardMetric = {
  id: string;
  title: string;
  value: string;
  description: string;
  icon: LucideIcon;
  /** Alerta real (p. ej. Vencidas > 0): punto cuadrado antes de la etiqueta. */
  alert?: boolean;
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
