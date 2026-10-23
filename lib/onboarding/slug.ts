/**
 * Slugs del onboarding adaptativo.
 *
 * Normalizador + validación SIN base de datos (seguro para el cliente:
 * feedback en vivo del campo "Tu enlace"). La disponibilidad (que el slug
 * no esté tomado) se verifica SOLO en el servidor, en la Server Action,
 * porque requiere `db`.
 */

import {
  validateSlug,
  type SlugValidation,
} from "@/lib/admin/catalogs";

const COMBINING_MARKS = /[\u0300-\u036f]/g;
/** Cualquier carácter que no sea a-z0-9 se convierte en separador. */
const INVALID_CHARS = /[^a-z0-9]+/g;

/**
 * Convierte un nombre de marca en candidato a slug: "Mi Barbería!" →
 * "mi-barberia". NO valida longitud ni colisiones; eso lo hace
 * `validateSlug` (sintaxis) y la Server Action (disponibilidad).
 */
export function normalizeSlug(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .toLowerCase()
    .replace(INVALID_CHARS, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Normaliza Y valida sintaxis (mín. 3, máx. 48, a-z0-9-, no reservado). */
export function normalizeAndValidateSlug(raw: string): SlugValidation {
  return validateSlug(normalizeSlug(raw));
}

/** Candidato sugerido a partir del nombre comercial (para hint de error). */
export function suggestSlug(name: string): string {
  const slug = normalizeSlug(name);
  return slug.length >= 3 ? slug : "";
}