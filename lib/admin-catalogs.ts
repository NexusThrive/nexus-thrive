/**
 * Catálogos de la plataforma (capa global /admin + onboarding + sidebar).
 * Centralizados aquí para que UI, Server Actions, validadores y capa de
 * datos usen SIEMPRE los mismos valores — nunca listas enviadas por el
 * navegador ni literales duplicados.
 *
 * Catálogo unificado: 16 verticales, 8 módulos base + 3 especializados,
 * recetas por vertical (módulos por defecto + vocabulario adaptativo).
 */

/* ------------------------------------------------------------------ */
/* Verticales (16 rubros)                                              */
/* ------------------------------------------------------------------ */

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
] as const;
export type VerticalValue = (typeof VERTICALS)[number];

export const VERTICAL_LABELS: Record<VerticalValue, string> = {
  gym: "Gimnasio",
  tourism_agency: "Agencia de Turismo",
  hospitality: "Hotel & Posada",
  construction: "Construcción",
  carpentry: "Carpintería",
  restaurant: "Restaurante",
  retail: "Tienda",
  beauty: "Belleza & Barbería",
  healthcare: "Salud",
  mechanic: "Mecánica",
  education: "Educación",
  real_estate: "Inmobiliaria",
  hardware_store: "Ferretería",
  nautical_transport: "Náutica",
  tour_guides: "Guías Turísticos",
  events: "Eventos",
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

/** Normaliza un valor de vertical (alias legacy → valor actual). */
export function normalizeVertical(value: string): VerticalValue {
  if ((VERTICALS as readonly string[]).includes(value)) {
    return value as VerticalValue;
  }
  return LEGACY_VERTICAL_ALIASES[value] ?? "gym";
}

/* ------------------------------------------------------------------ */
/* Módulos: 8 base + 3 especializados                                 */
/* ------------------------------------------------------------------ */

export const BASE_MODULES = [
  "crm",
  "bookings",
  "payments",
  "billing",
  "inventory",
  "finance",
  "dashboard",
  "whatsapp",
] as const;
export type BaseModuleValue = (typeof BASE_MODULES)[number];

export const SPECIALIZED_MODULES = [
  "memberships",
  "orders",
  "quotes",
] as const;
export type SpecializedModuleValue = (typeof SPECIALIZED_MODULES)[number];

export const MODULES = [
  ...BASE_MODULES,
  ...SPECIALIZED_MODULES,
] as const;
export type ModuleValue = (typeof MODULES)[number];

export const MODULE_LABELS: Record<ModuleValue, string> = {
  dashboard: "Dashboard",
  crm: "CRM",
  bookings: "Reservas",
  payments: "Pagos",
  billing: "Facturación",
  inventory: "Inventario",
  finance: "Finanzas",
  whatsapp: "WhatsApp",
  memberships: "Membresías",
  orders: "Pedidos",
  quotes: "Cotizaciones",
};

/* ------------------------------------------------------------------ */
/* Vocabulario adaptativo                                             */
/* ------------------------------------------------------------------ */

export type VerticalTerms = {
  customer: string;
  customers: string;
  booking: string;
  bookings: string;
  item: string;
  items: string;
  /** Plural del módulo Cotizaciones (sidebar); opcional con default. */
  quotes?: string;
};

/**
 * Terminología del módulo Cotizaciones / APU por vertical.
 * `getQuoteTerms()` en lib/vertical-terms.ts mezcla estos defaults con
 * los overrides por rubro (construcción y carpintería usan "Presupuesto",
 * "Actividad / APU" e "Insumo").
 */
export type QuoteTerms = {
  quote: string;
  quotes: string;
  quoteItem: string;
  quoteItems: string;
  apuActivity: string;
  apuActivities: string;
  apuItem: string;
  apuItems: string;
};

export const QUOTE_TERM_DEFAULTS: QuoteTerms = {
  quote: "Cotización",
  quotes: "Cotizaciones",
  quoteItem: "Ítem",
  quoteItems: "Ítems",
  apuActivity: "Actividad",
  apuActivities: "Actividades",
  apuItem: "Recurso",
  apuItems: "Recursos",
};

export const VERTICAL_QUOTE_TERMS: Partial<
  Record<VerticalValue, QuoteTerms>
> = {
  construction: {
    quote: "Presupuesto",
    quotes: "Presupuestos",
    quoteItem: "Actividad / APU",
    quoteItems: "Actividades / APUs",
    apuActivity: "Actividad / APU",
    apuActivities: "Actividades / APUs",
    apuItem: "Insumo",
    apuItems: "Insumos",
  },
  carpentry: {
    quote: "Presupuesto",
    quotes: "Presupuestos",
    quoteItem: "Actividad / APU",
    quoteItems: "Actividades / APUs",
    apuActivity: "Actividad / APU",
    apuActivities: "Actividades / APUs",
    apuItem: "Insumo",
    apuItems: "Insumos",
  },
};

/** Receta por vertical: módulos por defecto + terminología adaptativa. */
export type VerticalRecipe = {
  modules: readonly ModuleValue[];
  terms: VerticalTerms;
};

export const VERTICAL_RECIPES: Record<VerticalValue, VerticalRecipe> = {
  gym: {
    modules: ["dashboard", "crm", "memberships", "finance", "whatsapp"],
    terms: {
      customer: "Socio",
      customers: "Socios",
      booking: "Clase",
      bookings: "Clases",
      item: "Membresía",
      items: "Membresías",
    },
  },
  tourism_agency: {
    modules: ["dashboard", "crm", "bookings", "payments", "finance", "whatsapp"],
    terms: {
      customer: "Turista",
      customers: "Turistas",
      booking: "Reserva",
      bookings: "Reservas",
      item: "Tour",
      items: "Tours",
    },
  },
  hospitality: {
    modules: ["dashboard", "crm", "bookings", "inventory", "finance"],
    terms: {
      customer: "Huésped",
      customers: "Huéspedes",
      booking: "Reserva",
      bookings: "Reservas",
      item: "Servicio",
      items: "Servicios",
    },
  },
  construction: {
    modules: ["dashboard", "crm", "quotes", "billing", "finance"],
    terms: {
      customer: "Cliente",
      customers: "Clientes",
      booking: "Proyecto",
      bookings: "Proyectos",
      item: "Servicio",
      items: "Servicios",
      quotes: "Presupuestos",
    },
  },
  carpentry: {
    modules: ["dashboard", "crm", "quotes", "inventory", "finance"],
    terms: {
      customer: "Cliente",
      customers: "Clientes",
      booking: "Encargo",
      bookings: "Encargos",
      item: "Producto",
      items: "Productos",
      quotes: "Presupuestos",
    },
  },
  restaurant: {
    modules: ["dashboard", "crm", "orders", "inventory", "payments", "finance"],
    terms: {
      customer: "Comensal",
      customers: "Comensales",
      booking: "Mesa",
      bookings: "Mesas",
      item: "Plato",
      items: "Platos",
    },
  },
  retail: {
    modules: ["dashboard", "crm", "orders", "inventory", "payments", "finance"],
    terms: {
      customer: "Cliente",
      customers: "Clientes",
      booking: "Pedido",
      bookings: "Pedidos",
      item: "Producto",
      items: "Productos",
    },
  },
  beauty: {
    modules: ["dashboard", "crm", "bookings", "inventory", "finance", "whatsapp"],
    terms: {
      customer: "Cliente",
      customers: "Clientes",
      booking: "Cita",
      bookings: "Citas",
      item: "Servicio",
      items: "Servicios",
    },
  },
  healthcare: {
    modules: ["dashboard", "crm", "bookings", "finance", "whatsapp"],
    terms: {
      customer: "Paciente",
      customers: "Pacientes",
      booking: "Cita",
      bookings: "Citas",
      item: "Servicio",
      items: "Servicios",
    },
  },
  mechanic: {
    modules: ["dashboard", "crm", "bookings", "quotes", "inventory", "finance"],
    terms: {
      customer: "Cliente",
      customers: "Clientes",
      booking: "Cita",
      bookings: "Citas",
      item: "Servicio",
      items: "Servicios",
    },
  },
  education: {
    modules: ["dashboard", "crm", "bookings", "memberships", "finance"],
    terms: {
      customer: "Estudiante",
      customers: "Estudiantes",
      booking: "Clase",
      bookings: "Clases",
      item: "Curso",
      items: "Cursos",
    },
  },
  real_estate: {
    modules: ["dashboard", "crm", "bookings", "billing", "finance"],
    terms: {
      customer: "Cliente",
      customers: "Clientes",
      booking: "Visita",
      bookings: "Visitas",
      item: "Propiedad",
      items: "Propiedades",
    },
  },
  hardware_store: {
    modules: ["dashboard", "crm", "orders", "inventory", "finance"],
    terms: {
      customer: "Cliente",
      customers: "Clientes",
      booking: "Pedido",
      bookings: "Pedidos",
      item: "Producto",
      items: "Productos",
    },
  },
  nautical_transport: {
    modules: ["dashboard", "crm", "bookings", "payments", "finance"],
    terms: {
      customer: "Pasajero",
      customers: "Pasajeros",
      booking: "Reserva",
      bookings: "Reservas",
      item: "Excursión",
      items: "Excursiones",
    },
  },
  tour_guides: {
    modules: ["dashboard", "crm", "bookings", "quotes", "finance", "whatsapp"],
    terms: {
      customer: "Turista",
      customers: "Turistas",
      booking: "Reserva",
      bookings: "Reservas",
      item: "Tour",
      items: "Tours",
    },
  },
  events: {
    modules: ["dashboard", "crm", "bookings", "quotes", "billing", "finance"],
    terms: {
      customer: "Cliente",
      customers: "Clientes",
      booking: "Evento",
      bookings: "Eventos",
      item: "Paquete",
      items: "Paquetes",
    },
  },
};

/**
 * Módulos que NEXUS activa automáticamente por vertical (derivado de las
 * recetas; el onboarding y el Panel CEO usan este mismo catálogo).
 */
export const DEFAULT_MODULES_BY_VERTICAL: Record<
  VerticalValue,
  readonly ModuleValue[]
> = Object.fromEntries(
  VERTICALS.map((vertical) => [vertical, VERTICAL_RECIPES[vertical].modules]),
) as Record<VerticalValue, readonly ModuleValue[]>;

/* ------------------------------------------------------------------ */
/* Métodos de pago                                                    */
/* ------------------------------------------------------------------ */

/**
 * Métodos de pago aceptados configurados por el negocio (Paso 4 del
 * onboarding). Reutiliza los valores del enum `PaymentProvider` existente
 * de la plataforma.
 */
export const PAYMENT_METHODS = ["CASH", "TRANSFER", "WOMPI"] as const;
export type PaymentMethodValue = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethodValue, string> = {
  CASH: "Efectivo",
  TRANSFER: "Transferencia (Nequi / Bancolombia)",
  WOMPI: "Wompi — pagos en línea",
};

/* ------------------------------------------------------------------ */
/* Slugs y guards                                                    */
/* ------------------------------------------------------------------ */

/**
 * Subdominios/rutas reservados del sistema: no pueden usarse como slug
 * de tenant (colisionarían con el proxy y las rutas globales).
 */
export const RESERVED_SLUGS = [
  "admin",
  "encuesta",
  "app",
  "www",
  "api",
  "sign-in",
  "sign-up",
  "login",
  "dashboard",
  "static",
  "assets",
  "shop",
  "health",
  "pricing",
  "precios",
] as const;

const SLUG_ALLOWED = /^[a-z0-9-]+$/;

export type SlugValidation =
  | { ok: true; slug: string }
  | { ok: false; error: string };

/**
 * Normaliza y valida un slug de tenant. Se aplica en el cliente (feedback)
 * y OBLIGATORIAMENTE en el servidor: nunca se confía en el valor del form.
 *
 * Reglas: trim + minúsculas; 3–48 caracteres; solo `a-z`, `0-9` y guiones
 * internos; sin espacios/puntos/barras; sin guiones al inicio/final ni
 * guiones dobles; no reservado.
 */
export function validateSlug(raw: string): SlugValidation {
  const slug = raw.trim().toLowerCase();

  if (!slug) {
    return { ok: false, error: "El slug es obligatorio." };
  }
  if (/\s/.test(slug)) {
    return { ok: false, error: "El slug no puede contener espacios." };
  }
  if (!SLUG_ALLOWED.test(slug)) {
    return {
      ok: false,
      error: "Usa solo letras minúsculas, números y guiones.",
    };
  }
  if (slug.length < 3) {
    return { ok: false, error: "Mínimo 3 caracteres." };
  }
  if (slug.length > 48) {
    return { ok: false, error: "Máximo 48 caracteres." };
  }
  if (slug.startsWith("-") || slug.endsWith("-") || slug.includes("--")) {
    return {
      ok: false,
      error: "Sin guiones al inicio, al final ni dobles.",
    };
  }
  if ((RESERVED_SLUGS as readonly string[]).includes(slug)) {
    return { ok: false, error: "Ese slug está reservado por el sistema." };
  }

  return { ok: true, slug };
}

export function isVertical(value: string): value is VerticalValue {
  return (VERTICALS as readonly string[]).includes(value);
}

export function isModule(value: string): value is ModuleValue {
  return (MODULES as readonly string[]).includes(value);
}

export function isPaymentMethod(value: string): value is PaymentMethodValue {
  return (PAYMENT_METHODS as readonly string[]).includes(value);
}

/** Orden estable de módulos según el catálogo (para listas/badges). */
export function sortModules(modules: readonly ModuleValue[]): ModuleValue[] {
  return [...modules].sort(
    (a, b) => MODULES.indexOf(a) - MODULES.indexOf(b),
  );
}