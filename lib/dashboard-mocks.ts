import type { LucideIcon } from "lucide-react";
import {
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

/**
 * ============================================================================
 * DATOS TEMPORALES — Fase 2 (Shell del Negocio y UI Base)
 * ============================================================================
 * Todo lo que exporta este módulo es PLACEHOLDER / MOCK a propósito.
 *
 * - `placeholderMetrics`: métricas del dashboard con valores vacíos reales
 *   (un negocio recién creado no tiene movimientos). NO son datos de negocio.
 * - `mockRecentActivity`: ejemplos de actividad para validar la UI.
 *
 * Reemplazar ambos por los repositorios reales cuando exista la capa de
 * reportes/agregación (p. ej. `tenantDb.payments`, `tenantDb.customers`).
 * Ningún componente debe leer negocio directamente de aquí a futuro: la
 * sustitución se hace en `app/[tenant]/page.tsx`.
 * ============================================================================
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

/** Valores vacíos: sin datos de negocio todavía. */
export const placeholderMetrics: DashboardMetric[] = [
  {
    id: "ingresos",
    title: "Ingresos",
    value: "$ 0",
    description: "Cobros aprobados durante el mes en curso",
    icon: TrendingUp,
    iconTone: "indigo",
    trend: { direction: "neutral", label: "Sin cobros registrados" },
  },
  {
    id: "clientes",
    title: "Clientes",
    value: "0",
    description: "Clientes activos en tu cartera",
    icon: Users,
    iconTone: "emerald",
    trend: { direction: "neutral", label: "Sin clientes aún" },
  },
  {
    id: "gastos",
    title: "Gastos",
    value: "$ 0",
    description: "Egresos registrados durante el mes en curso",
    icon: TrendingDown,
    iconTone: "rose",
    trend: { direction: "neutral", label: "Sin gastos registrados" },
  },
  {
    id: "balance",
    title: "Balance",
    value: "$ 0",
    description: "Ingresos menos gastos del mes en curso",
    icon: Wallet,
    iconTone: "slate",
    trend: { direction: "neutral", label: "Sin movimientos" },
  },
];

export type ActivityType = "customer" | "payment" | "expense" | "invoice";

export type RecentActivityItem = {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  time: string;
};

/** Mock de actividad reciente (datos de ejemplo, no reales). */
export const mockRecentActivity: RecentActivityItem[] = [
  {
    id: "activity-1",
    type: "customer",
    title: "Nuevo cliente registrado",
    description: "María García se agregó a tu cartera",
    time: "Hace 12 min",
  },
  {
    id: "activity-2",
    type: "payment",
    title: "Pago recibido",
    description: "Pago en efectivo por $ 150.000",
    time: "Hace 1 h",
  },
  {
    id: "activity-3",
    type: "expense",
    title: "Gasto registrado",
    description: "Servicios públicos por $ 85.000",
    time: "Hace 3 h",
  },
  {
    id: "activity-4",
    type: "invoice",
    title: "Factura creada",
    description: "Factura #1003 para un cliente de ejemplo",
    time: "Ayer",
  },
];
