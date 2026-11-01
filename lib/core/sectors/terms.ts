import { QUOTE_TERM_DEFAULTS, type QuoteTerms, type VerticalTerms } from "./lexicon";
import { findSector, getSector } from "./registry";

/**
 * Acceso al vocabulario por sector.
 *
 * La UI NUNCA debe usar textos fijos para conceptos de negocio: cliente, reserva y producto cambian según el rubro (Socios vs
 * Pacientes vs Turistas; Clases vs Citas vs Mesas). Todo sale de `getVerticalTerms()`. Un valor desconocido usa el sector
 * `general` (D-V10-5). Antes vivía en `lib/vertical-terms.ts`.
 */

/**
 * Devuelve la terminología de una vertical. Acepta cualquier string: los alias heredados se resuelven a su rubro actual
 * (barber→beauty) y lo desconocido cae en el sector general y neutral.
 */
export function getVerticalTerms(vertical: string): VerticalTerms {
  return getSector(vertical).terms;
}

/**
 * ¿El rubro lleva control de acceso de socios (QR y estado de la membresía en la ficha del cliente)? Se lee de la definición
 * del sector, sin alias ni respaldo: un valor desconocido o heredado no lo tiene (así el código no compara rubros).
 */
export function hasMemberAccess(vertical: string): boolean {
  return findSector(vertical)?.memberAccess === true;
}

/**
 * Terminología del módulo Cotizaciones / APU (Presupuesto, Actividad/APU, Insumo…). Construcción y carpintería la
 * personalizan; el resto usa los defaults del catálogo.
 */
export function getQuoteTerms(vertical: string): QuoteTerms {
  return {
    ...QUOTE_TERM_DEFAULTS,
    ...getSector(vertical).quoteTerms,
  };
}

export type { VerticalTerms, QuoteTerms };
