import {
  VERTICAL_RECIPES,
  normalizeVertical,
  type VerticalTerms,
} from "@/lib/admin-catalogs";

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

export type { VerticalTerms };