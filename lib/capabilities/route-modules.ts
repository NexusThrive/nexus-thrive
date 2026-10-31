import type { ModuleValue } from "@/lib/admin/catalogs";
import { CAPABILITIES, type CapabilityNav } from "@/lib/capabilities/registry";

/**
 * Qué módulos dan acceso a cada ruta del negocio. El menú de cada módulo sale del registro de capacidades y de sus rutas
 * se deriva `modulesForRoute`, que el servidor usa para no servir pantallas ni acciones de módulos apagados. Vive junto al
 * registro (Core) porque es una regla de acceso, no de presentación; `tenant-nav.ts` la reexporta.
 */

type ModuleNav = CapabilityNav;

/** Menú de cada módulo: sale del registro de capacidades (ADR-0003). */
export const MODULE_NAV = Object.fromEntries(CAPABILITIES.map((c) => [c.id, c.nav as readonly ModuleNav[]])) as Record<ModuleValue, readonly ModuleNav[]>;

/**
 * Módulos que dan acceso a cada ruta del negocio, derivados del menú (una sola
 * fuente). Una ruta puede venir de varios módulos: `/finance` la abren Finanzas
 * y Pagos. El servidor la usa para no servir pantallas ni acciones de módulos
 * apagados (SEC-06): ocultarlas del menú no basta.
 */
const ROUTE_MODULES: ReadonlyMap<string, readonly ModuleValue[]> = (() => {
  const map = new Map<string, ModuleValue[]>();
  for (const [moduleName, entry] of Object.entries(MODULE_NAV) as [ModuleValue, readonly ModuleNav[]][]) {
    for (const nav of entry) {
      const route = nav.href.split("?")[0];
      if (!route) continue; // El inicio existe siempre.
      map.set(route, [...(map.get(route) ?? []), moduleName]);
    }
  }
  return map;
})();

/**
 * Módulos que habilitan `route` ("/crm", "/projects/9/budget"…), o `null` si
 * la ruta no depende de un módulo (inicio, configuración, presencia).
 */
export function modulesForRoute(route: string): readonly ModuleValue[] | null {
  const path = route.split("?")[0];
  let best: string | null = null;
  for (const candidate of ROUTE_MODULES.keys()) {
    if ((path === candidate || path.startsWith(`${candidate}/`)) && (!best || candidate.length > best.length)) {
      best = candidate;
    }
  }
  return best ? ROUTE_MODULES.get(best)! : null;
}
