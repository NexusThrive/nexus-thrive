import type { ModuleValue, VerticalValue } from "@/lib/admin/catalogs";
import { CAPABILITIES } from "@/lib/capabilities/registry";

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
    features: ["Todas las funciones del sistema", "1 usuario · hasta 100 clientes", "Sin tarjeta de crédito"],
  },
  ELITE: {
    name: "Elite",
    level: 2,
    base: 29,
    tagline: "Todo el sistema, para un equipo pequeño.",
    features: ["Todas las funciones del sistema", "Hasta 3 usuarios", "Soporte por chat"],
  },
  SIGNATURE: {
    name: "Signature",
    level: 3,
    base: 79,
    tagline: "Todo NEXUS para tu rubro, con acompañamiento.",
    features: ["Todas las funciones, ya encendidas para tu rubro", "Usuarios ilimitados", "Asesor dedicado y migración de datos"],
  },
};

/** Incluidos en todos los planes, sin costo (del registro de capacidades). */
export const INCLUDED_MODULES: readonly ModuleValue[] = CAPABILITIES.filter((c) => "included" in c && c.included && c.id !== "dashboard").map((c) => c.id);

/** Útiles para cualquier rubro aunque no estén en su receta. */
export const GENERAL_MODULES: readonly ModuleValue[] = CAPABILITIES.filter((c) => "general" in c && c.general).map((c) => c.id);

/** Precio mensual base de cada módulo de pago (antes del factor del rubro). */
export const MODULE_PRICES: Partial<Record<ModuleValue, number>> = Object.fromEntries(
  CAPABILITIES.filter((c) => c.priceUsd > 0).map((c) => [c.id, c.priceUsd]),
);

/**
 * Factor de precio por rubro. Con todo el sistema incluido el rubro es solo un
 * perfil, así que por defecto todos valen ×1 (el panel puede editarlo).
 */
export const VERTICAL_FACTORS: Record<VerticalValue, number> = {
  gym: 1,
  tourism_agency: 1,
  hospitality: 1,
  construction: 1,
  carpentry: 1,
  restaurant: 1,
  retail: 1,
  beauty: 1,
  healthcare: 1,
  mechanic: 1,
  education: 1,
  real_estate: 1,
  hardware_store: 1,
  nautical_transport: 1,
  tour_guides: 1,
  events: 1,
  museum: 1,
};

/** Pago anual: 20 % menos. */
export const ANNUAL_DISCOUNT = 0.2;
