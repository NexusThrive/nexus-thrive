/**
 * Catálogos de la plataforma (capa global /admin).
 * Centralizados aquí para que UI, Server Actions, validadores y capa de
 * datos usen SIEMPRE los mismos valores — nunca listas enviadas por el
 * navegador ni literales duplicados.
 */

export const VERTICALS = [
  "gym",
  "barber",
  "restaurant",
  "services",
  "tourism",
] as const;
export type VerticalValue = (typeof VERTICALS)[number];

export const VERTICAL_LABELS: Record<VerticalValue, string> = {
  gym: "Gimnasio",
  barber: "Barbería",
  restaurant: "Restaurante",
  services: "Servicios",
  tourism: "Turismo",
};

export const MODULES = [
  "caja_menor",
  "membresias",
  "reservas",
  "pedidos",
  "presupuestos",
  "crm",
] as const;
export type ModuleValue = (typeof MODULES)[number];

export const MODULE_LABELS: Record<ModuleValue, string> = {
  caja_menor: "Caja Menor",
  membresias: "Membresías",
  reservas: "Reservas",
  pedidos: "Pedidos",
  presupuestos: "Presupuestos",
  crm: "CRM",
};

/**
 * Módulos que NEXUS activa automáticamente por vertical (onboarding y
 * panel CEO usan este mismo catálogo). Centralizado: nunca se recibe del
 * navegador como autoridad.
 */
export const DEFAULT_MODULES_BY_VERTICAL: Record<
  VerticalValue,
  readonly ModuleValue[]
> = {
  gym: ["membresias", "caja_menor", "crm"],
  barber: ["reservas", "caja_menor", "crm"],
  restaurant: ["pedidos", "caja_menor", "crm"],
  services: ["presupuestos", "caja_menor", "crm"],
  tourism: ["reservas", "caja_menor", "crm"],
};

/** Terminología principal que NEXUS usa por vertical (resumen del onboarding). */
export const VERTICAL_TERMINOLOGY: Record<VerticalValue, string> = {
  gym: "Membresías, planes y clientes recurrentes",
  barber: "Citas, turnos y clientes frecuentes",
  restaurant: "Pedidos, mesas y clientes",
  services: "Cotizaciones, proyectos y consultas",
  tourism: "Reservas, experiencias y visitantes",
};

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

/**
 * Subdominios/rutas reservados del sistema: no pueden usarse como slug
 * de tenant (colisionarían con el proxy y las rutas globales).
 */
export const RESERVED_SLUGS = [
  "admin",
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
