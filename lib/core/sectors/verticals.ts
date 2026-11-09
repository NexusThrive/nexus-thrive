/**
 * Sectores (rubros) de Nexus: la lista cerrada, sus nombres, íconos, cuáles se ofrecen al registrarse y los alias heredados.
 *
 * Es una hoja: no importa nada de Nexus, para que el registro de capacidades y el vocabulario usen sus tipos sin ciclos.
 * Un valor desconocido se trata como `general` (neutral), nunca como gimnasio (D-V10-5).
 * La lista debe coincidir con `enum Vertical` de Prisma mientras el sector siga guardándose como enum.
 */

export const VERTICALS = [
  "gym",
  "tourism_agency",
  "hospitality",
  "construction",
  "carpentry",
  "restaurant",
  "retail",
  "beauty",
  "healthcare",
  "mechanic",
  "education",
  "real_estate",
  "hardware_store",
  "nautical_transport",
  "tour_guides",
  "events",
  "museum",
  "general",
] as const;
export type VerticalValue = (typeof VERTICALS)[number];

/**
 * Rubros habilitados para registrarse en el onboarding.
 * El resto del catálogo sigue existiendo (panel CEO/administración), pero no
 * se ofrece al crear un negocio.
 */
export const SIGNUP_VERTICALS = [
  "retail",
  "gym",
  "restaurant",
] as const satisfies readonly VerticalValue[];

/**
 * Rubros a los que se ofrece Nexus hoy (decisión de producto, 2026-11-09): comercio, gimnasio y restaurante. Es una lista fija
 * en código: el Operations Center puede apagar uno, pero no encender los demás. Un negocio de otro rubro que ya existe sigue
 * funcionando y puede conservar el suyo (el resto del catálogo no se borra).
 */
export const OFFERED_VERTICALS: readonly VerticalValue[] = SIGNUP_VERTICALS;

export const VERTICAL_LABELS: Record<VerticalValue, string> = {
  gym: "Gimnasio",
  tourism_agency: "Agencia de Turismo",
  hospitality: "Hotel & Posada",
  construction: "Construcción",
  carpentry: "Carpintería",
  restaurant: "Restaurante",
  retail: "Comercio",
  beauty: "Belleza & Barbería",
  healthcare: "Salud",
  mechanic: "Mecánica",
  education: "Educación",
  real_estate: "Inmobiliaria",
  hardware_store: "Ferretería",
  nautical_transport: "Náutica",
  tour_guides: "Guías Turísticos",
  events: "Eventos",
  museum: "Museo",
  general: "General / Otro",
};

/** Íconos emoji por vertical (badges del Panel CEO y selección del onboarding). */
export const VERTICAL_ICONS: Record<VerticalValue, string> = {
  gym: "🏋️",
  tourism_agency: "🧳",
  hospitality: "🏨",
  construction: "🏗️",
  carpentry: "🪚",
  restaurant: "🍽️",
  retail: "🏪",
  beauty: "💈",
  healthcare: "🏥",
  mechanic: "🔧",
  education: "🎓",
  real_estate: "🏠",
  hardware_store: "🛠️",
  nautical_transport: "🚤",
  tour_guides: "🧭",
  events: "🎉",
  museum: "🏛️",
  general: "🧩",
};

/**
 * Alias de verticales legacy (usuarios creados antes del catálogo de 16
 * rubros). Se usan SOLO para normalizar valores residuales; el código
 * nuevo nunca los escribe.
 */
export const LEGACY_VERTICAL_ALIASES: Record<string, VerticalValue> = {
  barber: "beauty",
  services: "hospitality",
  tourism: "tourism_agency",
};

/** Normaliza un valor de vertical: alias heredados → su rubro actual; lo desconocido → `general`. */
export function normalizeVertical(value: string): VerticalValue {
  if ((VERTICALS as readonly string[]).includes(value)) {
    return value as VerticalValue;
  }
  // Un valor desconocido usa el sector general y neutral; nunca hereda la receta de gimnasio (D-V10-5).
  return LEGACY_VERTICAL_ALIASES[value] ?? "general";
}

/** Comprueba que un texto sea un rubro conocido. */
export function isVertical(value: string): value is VerticalValue {
  return (VERTICALS as readonly string[]).includes(value);
}
