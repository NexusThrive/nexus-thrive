/**
 * Comparación de límites: ¿cabe uno más? Es la regla genérica detrás de los topes de clientes y de personas de un plan
 * (`null` = sin límite propio). Antes vivía en `lib/benefits/benefits.ts` por accidente, lo que obligaba a Business a importar
 * del programa de códigos de acceso de Nexus. Es pura: no importa nada de Nexus.
 */

/** ¿Se puede agregar uno más? `null` = sin límite propio. */
export function withinLimit(limit: number | null, used: number): boolean {
  return limit == null || used < limit;
}
