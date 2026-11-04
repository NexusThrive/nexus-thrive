/**
 * Menú lateral del negocio: arma los grupos de navegación según el rubro y los módulos activos, resuelve la ruta
 * relativa al negocio, el elemento activo y la categoría de una ruta.
 */
import { Blocks, FileSpreadsheet, Globe, HardHat, MessageCircle, Package, Plug, Receipt, Settings, ShoppingCart, Truck, Users, Wallet, type LucideIcon } from "lucide-react";
import { type VerticalValue } from "@/lib/core/sectors/verticals";
import { MODULES, type ModuleValue } from "@/lib/core/capabilities/modules";
import { CAPABILITIES, CAPABILITY_CATEGORIES, type CapabilityCategory } from "@/lib/core/capabilities/registry";
import { MODULE_NAV } from "@/lib/core/capabilities/route-modules";
import { getVerticalTerms, hasMemberAccess } from "@/lib/core/sectors/terms";
import type { NavGroup, NavItem } from "../../core/capabilities/nav-types";

export type { NavGroup, NavItem };
export { modulesForRoute } from "@/lib/core/capabilities/route-modules";

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

/** Herramientas externas del negocio y su estado (DR-18): vive en «Sistema» y puede crecer a un centro propio. */
export const INTEGRATIONS_ITEM: NavItem = {
  key: "integrations",
  module: "settings",
  label: "Integraciones",
  href: "/integrations",
  icon: Plug,
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
/** Icono de cada categoría: el grupo se muestra como una opción que despliega sus ítems. */
const GROUP_ICONS: Record<GroupName, LucideIcon> = {
  "Clientes y agenda": Users,
  "Productos y pedidos": Package,
  "Obras y proyectos": HardHat,
  "Ventas y cobros": ShoppingCart,
  "Compras y gastos": Truck,
  "Finanzas y contabilidad": Wallet,
  "Presencia en línea": Globe,
  Canales: MessageCircle,
};
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
  // Rubros con control de acceso de socios (gimnasio): menú reducido, sin tienda en línea, funciones, datos ni integraciones.
  const lean = hasMemberAccess(vertical);
  const items = (moduleName: ModuleValue): NavItem[] => {
    return MODULE_NAV[moduleName].filter((nav) => !nav.verticals || nav.verticals.includes(vertical)).filter((nav) => !(lean && nav.href === "/pedidos-tienda")).map((nav) => ({
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
  const gym = lean;
  const expenses: NavItem[] = active.has("finance") && !gym ? [{ key: "/finance?tab=gastos", module: "finance", href: "/finance?tab=gastos", icon: Receipt, label: "Gastos" }] : [];
  return [
    // El inicio existe siempre (es la raíz del negocio), con o sin el módulo.
    { label: "General", items: items("dashboard") },
    ...GROUPS.map((label) => ({
      label,
      items: label === "Compras y gastos" ? [...expenses, ...forGroup(label)] : forGroup(label),
      collapsible: true,
      icon: GROUP_ICONS[label],
    })),
    { label: "Sistema", items: gym ? [SETTINGS_ITEM] : [FUNCTIONS_ITEM, DATA_ITEM, INTEGRATIONS_ITEM, SETTINGS_ITEM], pinned: true },
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

/**
 * Categoría de una pantalla del negocio ("/pos" → «Ventas y cobros»): la misma de la barra lateral y de «Funciones».
 * Los encabezados de página la usan para que el menú y la página siempre digan lo mismo.
 */
export function routeCategory(route: string): CapabilityCategory {
  const path = route.split("?")[0]!;
  const exact = CAPABILITIES.find((c) => c.nav.some((n) => n.href === path));
  if (exact) return exact.category;
  const prefix = CAPABILITIES.find((c) => c.nav.some((n) => n.href && path.startsWith(`${n.href}/`)));
  return prefix?.category ?? "Clientes y agenda";
}
