/**
 * Menú lateral del negocio: arma los grupos de navegación según el rubro y los módulos activos, resuelve la ruta
 * relativa al negocio, el elemento activo y la categoría de una ruta.
 */
import { can, type BusinessPermission } from "@/lib/core/auth/permissions";
import { Blocks, FileSpreadsheet, Globe, HardHat, MessageCircle, Package, Plug, Receipt, Settings, ShoppingCart, Truck, Users, Wallet, type LucideIcon, Target } from "lucide-react";
import { type VerticalValue } from "@/lib/core/sectors/verticals";
import { MODULES, type ModuleValue } from "@/lib/core/capabilities/modules";
import { CAPABILITIES, CAPABILITY_CATEGORIES, NAV_CATEGORY, type CapabilityCategory } from "@/lib/core/capabilities/registry";
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
  CRM: Target,
  Producto: Package,
  "Obras y proyectos": HardHat,
  "Ventas y cobros": ShoppingCart,
  "Compras y gastos": Truck,
  "Finanzas y contabilidad": Wallet,
  "Presencia en línea": Globe,
  Canales: MessageCircle,
};
/** Pantallas que el menú reducido de un rubro con control de acceso (gimnasio) no muestra: el seguimiento de ventas y, de Mi sitio web, los pedidos de la tienda. */
/** Pantallas que piden un permiso: sin él, el enlace no se muestra (la página igual lo comprueba en el servidor). Sin rol, se muestra todo. */
const NAV_PERMISSION: Record<string, BusinessPermission> = { "/finance": "money.handle", "/cobros": "money.handle", "/dinero": "money.handle", "/cartera": "money.handle", "/orders": "orders.work" };
const allowedFor = (role: string | undefined, href: string): boolean => {
  const permission = NAV_PERMISSION[href.split("?")[0] ?? ""];
  return !role || !permission || can(role, permission);
};

const LEAN_HIDDEN: readonly string[] = ["/oportunidades", "/tareas", "/formularios", "/entregables"];
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
    return MODULE_NAV[moduleName].filter((nav) => !nav.verticals || nav.verticals.includes(vertical)).filter((nav) => allowedFor(role, nav.href)).filter((nav) => !(lean && (LEAN_HIDDEN.includes(nav.href) || (moduleName === "website" && nav.href === "/orders")))).map((nav) => ({
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
    enabled
      .filter((m) => m !== "dashboard")
      .flatMap((m) => items(m).filter((item) => groupOf(m, item.href) === label).filter((item) => !(m === "payments" && active.has("finance") && item.href.startsWith("/finance")) && !(m === "website" && item.href === "/orders" && active.has("orders"))));
  const gym = lean;
  const expenses: NavItem[] = active.has("finance") && !gym && allowedFor(role, "/finance") ? [{ key: "/finance?tab=gastos", module: "finance", href: "/finance?tab=gastos", icon: Receipt, label: "Gastos" }] : [];
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
