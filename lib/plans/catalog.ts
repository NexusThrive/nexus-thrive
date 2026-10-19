import type { ModuleValue, VerticalValue } from "@/lib/admin-catalogs";

/**
 * Planes de NEXUS THRIVE sobre los MÓDULOS REALES de la app (USD/mes).
 *
 * ⚠️ PRECIOS PROVISIONALES: se definen después. Todo el valor monetario vive
 * en este archivo; la interfaz y el servidor solo calculan con él.
 */

export type PlanKey = "ESSENTIAL" | "ELITE" | "SIGNATURE";
export type Billing = "MONTHLY" | "ANNUAL";

export const PLANS: Record<
  PlanKey,
  { name: string; level: number; base: number; tagline: string; features: string[] }
> = {
  ESSENTIAL: {
    name: "Essential",
    level: 1,
    base: 0,
    tagline: "Gratis para conocer NEXUS con tu negocio real.",
    features: ["Clientes, panel y finanzas básicas", "1 usuario", "Sin tarjeta de crédito"],
  },
  ELITE: {
    name: "Elite",
    level: 2,
    base: 29,
    tagline: "Arma tu sistema con los módulos que usas.",
    features: ["Módulos a la medida de tu rubro", "Hasta 3 usuarios", "Soporte por chat"],
  },
  SIGNATURE: {
    name: "Signature",
    level: 3,
    base: 79,
    tagline: "Todo NEXUS para tu rubro, con acompañamiento.",
    features: ["Todos los módulos de tu rubro, 40 % menos", "Usuarios ilimitados", "Asesor dedicado y migración de datos"],
  },
};

/** Incluidos en todos los planes, sin costo. */
export const INCLUDED_MODULES: readonly ModuleValue[] = ["dashboard", "crm", "finance"];

/** Útiles para cualquier rubro aunque no estén en su receta. */
export const GENERAL_MODULES: readonly ModuleValue[] = ["whatsapp", "payments", "billing", "inventory"];

/** Precio mensual base de cada módulo de pago (antes del factor del rubro). */
export const MODULE_PRICES: Partial<Record<ModuleValue, number>> = {
  bookings: 6,
  payments: 6,
  billing: 8,
  inventory: 6,
  whatsapp: 9,
  memberships: 8,
  orders: 7,
  quotes: 14,
};

/** Factor de precio por rubro (más operación = más valor). */
export const VERTICAL_FACTORS: Record<VerticalValue, number> = {
  gym: 1,
  tourism_agency: 1,
  hospitality: 1.1,
  construction: 1.35,
  carpentry: 1.15,
  restaurant: 1.1,
  retail: 1,
  beauty: 0.9,
  healthcare: 1.25,
  mechanic: 1,
  education: 0.95,
  real_estate: 1.1,
  hardware_store: 1,
  nautical_transport: 1.1,
  tour_guides: 0.9,
  events: 1,
  museum: 1,
};

/** Signature cobra cada módulo al 60 % (40 % menos). */
export const SIGNATURE_MODULE_FACTOR = 0.6;
/** Pago anual: 20 % menos. */
export const ANNUAL_DISCOUNT = 0.2;
