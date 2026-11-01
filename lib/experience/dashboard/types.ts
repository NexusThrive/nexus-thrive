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

/** Pago y gasto (movimientos), socio nuevo, vencimiento de membresía y cuenta por cobrar pendiente. */
export type ActivityType = "payment" | "expense" | "customer" | "expiry" | "pending";

/** Movimiento del negocio: pago aprobado o gasto. */
export type RecentActivityItem = {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  /** Monto ya formateado (COP); vacío si el tipo no lleva monto (socio nuevo, vencimiento). */
  amount: string;
  time: string;
  /** Ruta completa a la que lleva la fila (el registro de ese dato). */
  href?: string;
};
