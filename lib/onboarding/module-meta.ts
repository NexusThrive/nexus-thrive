import {
  BadgeCheck,
  CalendarDays,
  CreditCard,
  FileText,
  Layers,
  MessageCircle,
  Package,
  Repeat,
  ShoppingCart,
  UserRoundPlus,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { ModuleValue } from "@/lib/admin-catalogs";

/** Icono de cada módulo en el onboarding y la vista previa del negocio. */
export const MODULE_ICONS: Record<ModuleValue, LucideIcon> = {
  dashboard: Layers,
  crm: UserRoundPlus,
  bookings: CalendarDays,
  payments: CreditCard,
  billing: FileText,
  inventory: Package,
  finance: Wallet,
  whatsapp: MessageCircle,
  memberships: Repeat,
  orders: ShoppingCart,
  quotes: BadgeCheck,
};

export const MODULE_DESCRIPTIONS: Record<ModuleValue, string> = {
  dashboard: "Tu tablero con lo esencial del día a día.",
  crm: "Clientes, fichas 360° y seguimiento.",
  bookings: "Reservas, citas y agenda.",
  payments: "Cobros y control de pagos.",
  billing: "Facturas para tus clientes.",
  inventory: "Productos, stock y reposiciones.",
  finance: "Gastos e ingresos en un solo lugar.",
  whatsapp: "Atiende y responde desde WhatsApp.",
  memberships: "Planes y membresías recurrentes.",
  orders: "Pedidos y ventas.",
  quotes: "Cotizaciones y presupuestos.",
};
