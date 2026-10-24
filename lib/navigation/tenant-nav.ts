import type { LucideIcon } from "lucide-react";
import { Blocks, FileSpreadsheet, Receipt, Settings } from "lucide-react";
import { MODULES, type ModuleValue, type VerticalValue } from "@/lib/admin/catalogs";
import { CAPABILITIES, CAPABILITY_CATEGORIES, type CapabilityCategory, type CapabilityNav } from "@/lib/capabilities/registry";
import { getVerticalTerms } from "@/lib/vertical-terms";

export type NavItem = {
  /** Clave estable (para React y para la paleta de comandos). */
  key: string;
  /** Módulo del negocio al que pertenece (no aplica en el panel CEO). */
  module?: ModuleValue | "settings";
  label: string;
  /** Ruta relativa al negocio: "" = inicio, "/crm", "/projects"… */
  href: string;
  icon: LucideIcon;
};

/** `collapsible`: el grupo se despliega y se oculta en la barra lateral (Ingresos, Gastos). */
export type NavGroup = { label: string; items: NavItem[]; collapsible?: boolean };

type ModuleNav = CapabilityNav;

/** Menú de cada módulo: sale del registro de capacidades (ADR-0003). */
const MODULE_NAV = Object.fromEntries(CAPABILITIES.map((c) => [c.id, c.nav as readonly ModuleNav[]])) as Record<ModuleValue, readonly ModuleNav[]>;

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

/** Todas las funciones del sistema: encender o apagar lo que usa el negocio (no depende de un módulo). */
export const FUNCTIONS_ITEM: NavItem = {
  key: "functions",
  module: "settings",
  label: "Funciones",
  href: "/functions",
  icon: Blocks,
};

/** Subir clientes y catálogo desde Excel/CSV y bajar copias (no depende de un módulo). */
export const DATA_ITEM: NavItem = {
  key: "data",
  module: "settings",
  label: "Importar y exportar",
  href: "/data",
  icon: FileSpreadsheet,
};

export const SETTINGS_ITEM: NavItem = {
  key: "settings",
  module: "settings",
  label: "Configuración",
  href: "/settings",
  icon: Settings,
};

/**
 * Grupo de la barra lateral de cada módulo, por el trabajo que resuelve (no
 * por el orden en que se activó): atender y operar, **ingresos** (facturar,
 * vender, cobrar), **gastos** (comprar, pagar), mover dinero y hablar con los
 * clientes. Un grupo sin módulos activos no aparece. Ingresos y Gastos se
 * pueden desplegar y ocultar.
 */
const GROUPS = CAPABILITY_CATEGORIES;
type GroupName = CapabilityCategory;
const COLLAPSIBLE: readonly GroupName[] = ["Ingresos", "Gastos"];
/** Grupo de cada función: su categoría en el registro (la misma que ve en «Funciones»). */
const MODULE_GROUP: Partial<Record<string, GroupName>> = Object.fromEntries(CAPABILITIES.map((c) => [c.id, c.category]));

/**
 * Navegación del negocio: solo los módulos activos, en el orden del catálogo,
 * con el vocabulario de la vertical (Socios, Pacientes, Obras…). Grupos:
 * General (inicio, siempre), los de `MODULE_GROUP` y Sistema (configuración).
 */
export function buildTenantNav(vertical: VerticalValue, activeModules: readonly ModuleValue[]): NavGroup[] {
  const terms = getVerticalTerms(vertical);
  const active = new Set(activeModules);
  const items = (moduleName: ModuleValue): NavItem[] => {
    return MODULE_NAV[moduleName].filter((nav) => !nav.verticals || nav.verticals.includes(vertical)).map((nav) => ({
      key: nav.href || "home",
      module: moduleName,
      href: nav.href,
      icon: nav.icon,
      label: nav.label(terms, vertical),
    }));
  };
  const enabled = MODULES.filter((moduleName) => active.has(moduleName));
  // «Pagos» vive dentro de Finanzas: con Finanzas activa no se repite (las demás pantallas de Pagos, como el punto de venta, sí).
  const forGroup = (label: GroupName): NavItem[] =>
    enabled
      .filter((m) => m !== "dashboard" && (MODULE_GROUP[m] ?? "Clientes y operación") === label)
      .flatMap((m) => items(m).filter((item) => !(m === "payments" && active.has("finance") && item.href.startsWith("/finance"))));
  const expenses: NavItem[] = active.has("finance") ? [{ key: "/finance?tab=gastos", module: "finance", href: "/finance?tab=gastos", icon: Receipt, label: "Gastos" }] : [];
  return [
    // El inicio existe siempre (es la raíz del negocio), con o sin el módulo.
    { label: "General", items: items("dashboard") },
    ...GROUPS.map((label) => ({
      label,
      items: label === "Gastos" ? [...expenses, ...forGroup(label)] : forGroup(label),
      ...(COLLAPSIBLE.includes(label) ? { collapsible: true } : {}),
    })),
    { label: "Sistema", items: [FUNCTIONS_ITEM, DATA_ITEM, SETTINGS_ITEM] },
  ].filter((group) => group.items.length > 0);
}

/** Ruta dentro del negocio: "/acme/crm/123" → "/crm/123"; "/acme" → "/". */
export function tenantRelativePath(pathname: string | null, tenantSlug: string): string {
  const base = `/${tenantSlug}`;
  if (!pathname || pathname === base || pathname === `${base}/`) return "/";
  return pathname.startsWith(`${base}/`) ? pathname.slice(base.length) : pathname;
}

/** ¿El ítem con `href` está activo en `relativePath`? */
export function isNavActive(href: string, relativePath: string): boolean {
  return href === "" ? relativePath === "/" : relativePath === href || relativePath.startsWith(`${href}/`);
}

/** El ítem activo (para el título de la barra superior). */
export function activeNavItem(groups: NavGroup[], relativePath: string): NavItem | undefined {
  return groups.flatMap((g) => g.items).find((item) => isNavActive(item.href, relativePath));
}
