/**
 * NÚCLEO — sub-páginas de un módulo, para la sección del sidebar.
 *
 * QUÉ ES Y QUÉ NO ES
 * -----------------
 * Solo lo que NO se deduce del catálogo: páginas internas de un módulo que no
 * son módulos por sí mismas (Caja Menor → Movimientos · Categorías).
 *
 * ANTES este archivo era la fuente de verdad de TODA la navegación y tenía
 * 7 rutas hardcodeadas, más cuatro claves muertas (`clientes`, `planes`,
 * `pagos` y `gastos` apuntaban a la misma lista de Gym y nunca se usaban,
 * porque el sidebar agrupa por plantilla). Con `clientes` como CAPA eso ya no
 * era inocuo: una org que activara solo `clientes` recibiría enlaces a Pagos
 * y Gastos, que no tiene.
 *
 * AHORA:
 *   - la entrada de un módulo y las de sus compañeros de plantilla salen del
 *     CATÁLOGO, en `lib/core/modulos.ts` (el servidor ya tiene la base);
 *   - acá queda solo el detalle que el catálogo no conoce.
 *
 * INVARIANTE: una sub-página cuelga de la ruta del módulo, `/modulos/<slug>`.
 */
import type { SeccionModulo } from "@/lib/core/modulos";

/** Sub-páginas por módulo. El `path` es explícito: no se deriva del label. */
const SUBPAGINAS: Record<string, { path: string; label: string }[]> = {
  "caja-menor": [
    { path: "movimientos", label: "Movimientos" },
    { path: "categorias", label: "Categorías" },
  ],
};

/**
 * Sub-páginas de un módulo, con su href resuelto a partir de su ruta base.
 * Devuelve [] si el módulo no declara sub-páginas (lo normal: su título ya
 * enlaza a su dashboard y no hace falta repetirlo debajo).
 */
export function getSubpaginasModulo(slug: string, rutaBase: string | null): SeccionModulo[] {
  if (!rutaBase) return [];
  return (SUBPAGINAS[slug] ?? []).map((s) => ({ href: `${rutaBase}/${s.path}`, label: s.label }));
}
