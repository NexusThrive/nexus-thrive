/**
 * Catálogos de la plataforma que no son de sectores ni de módulos: los medios de pago del alta y las reglas de los identificadores
 * (slugs) de un negocio. Los sectores y su vocabulario viven en `lib/core/sectors/`; los módulos, en `lib/core/capabilities/modules.ts`.
 */

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
  "r",
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

/** Comprueba que un texto sea un medio de pago conocido. */
export function isPaymentMethod(value: string): value is PaymentMethodValue {
  return (PAYMENT_METHODS as readonly string[]).includes(value);
}
