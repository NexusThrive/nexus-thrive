import {
  QUOTE_TERM_DEFAULTS,
  VERTICAL_QUOTE_TERMS,
  VERTICAL_RECIPES,
  normalizeVertical,
  type QuoteTerms,
  type VerticalTerms,
} from "@/lib/admin/catalogs";

/**
 * Helper de vocabulario adaptativo por vertical.
 *
 * La UI NUNCA debe usar textos fijos para conceptos de negocio: cliente,
 * reserva y producto cambian según el rubro (Socios vs Pacientes vs
 * Turistas; Clases vs Citas vs Mesas). Todo sale de `getVerticalTerms()`.
 */

const FALLBACK_TERMS: VerticalTerms = {
  customer: "Cliente",
  customers: "Clientes",
  booking: "Reserva",
  bookings: "Reservas",
  item: "Producto",
  items: "Productos",
  quotes: "Cotizaciones",
};

/**
 * Devuelve la terminología de una vertical. Acepta cualquier string:
 * valores desconocidos de la DB (o legacy) se normalizan con
 * `normalizeVertical` — los alias legacy caen en su rubro actual
 * (barber→beauty) y lo desconocido en el rubro por defecto (gym).
 */
export function getVerticalTerms(vertical: string): VerticalTerms {
  const value = normalizeVertical(vertical);
  const recipe = VERTICAL_RECIPES[value];
  return recipe?.terms ?? FALLBACK_TERMS;
}

/**
 * Terminología del módulo Cotizaciones / APU (Presupuesto, Actividad/APU,
 * Insumo…). Construcción y carpintería la personalizan; el resto usa los
 * defaults del catálogo.
 */
export function getQuoteTerms(vertical: string): QuoteTerms {
  const value = normalizeVertical(vertical);
  return {
    ...QUOTE_TERM_DEFAULTS,
    ...VERTICAL_QUOTE_TERMS[value],
  };
}

export type { VerticalTerms, QuoteTerms };