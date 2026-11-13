/**
 * Menú lateral del negocio: arma los grupos de navegación según el rubro y los módulos activos, resuelve la ruta
 * relativa al negocio, el elemento activo y la categoría de una ruta.
 */
import { can, type BusinessPermission } from "@/lib/core/auth/permissions";
import { Blocks, FileSpreadsheet, FileText, Store, Globe, HardHat, MessageCircle, Package, Plug, Receipt, Settings, ShoppingCart, Truck, Users, Wallet, type LucideIcon, Target } from "lucide-react";
import { type VerticalValue } from "@/lib/core/sectors/verticals";
import { MODULES, type ModuleValue } from "@/lib/core/capabilities/modules";
import { CAPABILITIES, CAPABILITY_CATEGORIES, NAV_CATEGORY, type CapabilityCategory } from "@/lib/core/capabilities/registry";
import { MODULE_NAV } from "@/lib/core/capabilities/route-modules";
import { getVerticalTerms, hasMemberAccess } from "@/lib/core/sectors/terms";
import type { NavGroup, NavItem } from "../../core/capabilities/nav-types";
import { menusFor } from "./app-menus";

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
  CRM: Target,
  "Punto de venta": Store,
  Inventario: Package,
  Facturación: FileText,
  "Obras y proyectos": HardHat,
  "Ventas y cobros": ShoppingCart,
  "Compras y gastos": Truck,
  "Finanzas y contabilidad": Wallet,
  "Presencia en línea": Globe,
  Canales: MessageCircle,
};
/** Pantallas que el menú reducido de un rubro con control de acceso (gimnasio) no muestra: el seguimiento de ventas y, de Mi sitio web, los pedidos de la tienda. */
/** Pantallas que piden un permiso: sin él, el enlace no se muestra (la página igual lo comprueba en el servidor). Sin rol, se muestra todo. */
const NAV_PERMISSION: Record<string, BusinessPermission> = { "/finanzas": "money.handle", "/finanzas/cobros": "money.handle", "/finanzas/caja": "money.handle", "/ventas/cobros": "money.handle", "/finanzas/dinero": "money.handle", "/finanzas/cartera": "money.handle", "/ventas/pedidos": "orders.work" };
const allowedFor = (role: string | undefined, href: string): boolean => {
  const permission = NAV_PERMISSION[href.split("?")[0] ?? ""];
  return !role || !permission || can(role, permission);
};

const LEAN_HIDDEN: readonly string[] = ["/crm", "/crm/informes", "/crm/configuracion", "/crm/tareas", "/crm/formularios", "/proyectos/entregables", "/finanzas/cobros", "/finanzas/caja"];
/** Grupo de cada función: su categoría en el registro (la misma que ve en «Funciones»). */
const MODULE_GROUP: Partial<Record<string, GroupName>> = Object.fromEntries(CAPABILITIES.map((c) => [c.id, c.category]));

/**
 * Navegación del negocio: solo los módulos activos, en el orden del catálogo,
 * con el vocabulario de la vertical (Socios, Pacientes, Obras…). Grupos:
 * General (inicio, siempre), los de `MODULE_GROUP` y Sistema (configuración).
 */
export function buildTenantNav(vertical: VerticalValue, activeModules: readonly ModuleValue[], role?: string): NavGroup[] {
  const terms = getVerticalTerms(vertical);
  const active = new Set(activeModules);
  // Rubros con control de acceso de socios (gimnasio): menú reducido, sin tienda en línea, funciones, datos ni integraciones.
  const lean = hasMemberAccess(vertical);
  const items = (moduleName: ModuleValue): NavItem[] => {
    return MODULE_NAV[moduleName].filter((nav) => nav.menu !== false).filter((nav) => !nav.verticals || nav.verticals.includes(vertical)).filter((nav) => allowedFor(role, nav.href)).filter((nav) => !(lean && (LEAN_HIDDEN.includes(nav.href) || (moduleName === "website" && nav.href === "/ventas/pedidos")))).map((nav) => ({
      key: nav.href || "home",
      module: moduleName,
      href: nav.href,
      icon: nav.icon,
      label: nav.label(terms, vertical),
    }));
  };
  const enabled = MODULES.filter((moduleName) => active.has(moduleName));
  // «Pagos» vive dentro de Finanzas: con Finanzas activa no se repite (las demás pantallas de Pagos, como el punto de venta, sí).
  // El grupo de cada entrada: el de su ruta si lo tiene (p. ej. CRM dentro del módulo de clientes), si no el de su función.
  const groupOf = (m: ModuleValue, href: string): GroupName => NAV_CATEGORY.get(href.split("?")[0] ?? "") ?? MODULE_GROUP[m] ?? "Clientes y agenda";
  const forGroup = (label: GroupName): NavItem[] =>
    // En Finanzas, la pantalla principal va primero (Cobros viene de la función «Pagos», que se lista antes en el catálogo).
    enabled
      .filter((m) => m !== "dashboard")
      .flatMap((m) => items(m).filter((item) => groupOf(m, item.href) === label).filter((item) => !(m === "website" && item.href === "/ventas/pedidos" && active.has("orders")))).sort((a, b) => Number(b.href === "/finanzas") - Number(a.href === "/finanzas"));
  const gym = lean;
  const expenses: NavItem[] = active.has("finance") && !gym && allowedFor(role, "/finanzas") ? [{ key: "/finanzas?tab=gastos", module: "finance", href: "/finanzas?tab=gastos", icon: Receipt, label: "Gastos" }] : [];
  return [
    // El inicio existe siempre (es la raíz del negocio), con o sin el módulo.
    { label: "General", items: items("dashboard") },
    ...GROUPS.map((label) => ({
      label,
      items: label === "Compras y gastos" ? [...expenses, ...forGroup(label)] : forGroup(label),
      collapsible: true,
      icon: GROUP_ICONS[label],
      menus: menusFor(label, active, role),
    })),
    { label: "Sistema", items: gym ? [SETTINGS_ITEM] : [FUNCTIONS_ITEM, DATA_ITEM, INTEGRATIONS_ITEM, SETTINGS_ITEM], pinned: true },
  ].filter((group) => group.items.length > 0);
}

/** Ruta dentro del negocio: "/acme/crm/123" → "/contactos/123"; "/acme" → "/". */
export function tenantRelativePath(pathname: string | null, tenantSlug: string): string {
  const base = `/${tenantSlug}`;
  if (!pathname || pathname === base || pathname === `${base}/`) return "/";
  const relative = pathname.startsWith(`${base}/`) ? pathname.slice(base.length) : pathname;
  // El punto de venta vivió en /ventas/pos: esa ruta antigua sigue mostrándolo y debe activar la misma app (y su barra).
  return relative === "/ventas/pos" || relative.startsWith("/ventas/pos/") ? relative.replace("/ventas/pos", "/pos") : relative;
}

/** ¿El ítem con `href` está activo en `relativePath`? */
export function isNavActive(href: string, relativePath: string): boolean {
  // Inicio (la raíz del negocio) es el mismo dashboard que /resumen: «Resumen» se marca en las dos.
  if (href === "/resumen" && relativePath === "/") return true;
  return href === "" ? relativePath === "/" : relativePath === href || relativePath.startsWith(`${href}/`);
}

/**
 * El ítem activo (para el título y la pestaña de la barra superior): el de la ruta más específica. `/crm/informes` activa
 * «Informes», no «Pipeline» (`/crm`), aunque las dos coincidan.
 */
export function activeNavItem(groups: NavGroup[], relativePath: string): NavItem | undefined {
  return groups
    .flatMap((g) => g.items)
    .filter((item) => isNavActive(item.href, relativePath))
    .sort((a, b) => b.href.length - a.href.length)[0];
}

/**
 * Nombre de View Transition de una app del cajón: el icono de Inicio y la vista de la app comparten este nombre, así el icono crece
 * hasta la vista al abrirla y vuelve a él al regresar a Inicio. La app es el grupo de la barra (su primer ítem); Configuración es la suya.
 */
export function appTransitionName(groups: NavGroup[], itemKey: string | undefined): string | undefined {
  if (!itemKey) return undefined;
  if (itemKey === "settings") return "nx-app-settings";
  const group = groups.find((g) => g.items.some((item) => item.key === itemKey));
  if (!group || group.label === "General" || group.label === "Sistema") return undefined;
  return `nx-app-${group.items[0]!.key.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

/**
 * Categoría de una pantalla del negocio ("/pos" → «Punto de venta»): la misma de la barra lateral y de «Funciones».
 * Los encabezados de página la usan para que el menú y la página siempre digan lo mismo.
 */
export function routeCategory(route: string): CapabilityCategory {
  const path = route.split("?")[0]!;
  const exact = CAPABILITIES.find((c) => c.nav.some((n) => n.href === path));
  if (exact) return exact.category;
  const prefix = CAPABILITIES.find((c) => c.nav.some((n) => n.href && path.startsWith(`${n.href}/`)));
  return prefix?.category ?? "Clientes y agenda";
}
