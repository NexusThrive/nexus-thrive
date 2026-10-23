import type { LucideIcon } from "lucide-react";
import {
  Banknote,
  BookOpen,
  Building2,
  CalendarDays,
  CreditCard,
  FolderOpen,
  LayoutDashboard,
  MessageCircle,
  Package,
  Receipt,
  ScanLine,
  Settings,
  ShoppingCart,
  Ticket,
  Users,
  Wallet,
} from "lucide-react";
import { MODULES, type ModuleValue, type VerticalValue } from "@/lib/admin/catalogs";
import { getVerticalTerms, type VerticalTerms } from "@/lib/vertical-terms";

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

export type NavGroup = { label: string; items: NavItem[] };

type ModuleNav = {
  href: string;
  icon: LucideIcon;
  label: (terms: VerticalTerms, vertical: VerticalValue) => string;
  /** Solo para estos rubros (pantallas propias del rubro). */
  verticals?: readonly VerticalValue[];
};

/** Un módulo puede ocupar varias entradas (cotizaciones = obras + carpetas + catálogo). */
const MODULE_NAV: Record<ModuleValue, ModuleNav | ModuleNav[]> = {
  dashboard: { href: "", icon: LayoutDashboard, label: () => "Inicio" },
  crm: { href: "/crm", icon: Users, label: (terms) => terms.customers },
  bookings: [
    { href: "/bookings", icon: CalendarDays, label: (terms) => terms.bookings },
    { href: "/tickets", icon: Ticket, label: () => "Taquilla", verticals: ["museum"] },
    // "Salidas" (turismo) vuelve cuando exista su pantalla: hoy solo hay tablas (ARCH-02).
  ],
  memberships: [
    { href: "/memberships", icon: CreditCard, label: () => "Membresías" },
    { href: "/checkin", icon: ScanLine, label: () => "Control de acceso", verticals: ["gym"] },
  ],
  orders: { href: "/orders", icon: ShoppingCart, label: () => "Pedidos" },
  quotes: [
    {
      href: "/projects",
      icon: Building2,
      label: (_terms, vertical) => (vertical === "construction" ? "Obras" : "Proyectos"),
    },
    { href: "/quotes", icon: FolderOpen, label: () => "Cotizaciones" },
    { href: "/catalog", icon: BookOpen, label: () => "Catálogo APU" },
  ],
  inventory: { href: "/inventory", icon: Package, label: () => "Catálogo" },
  finance: { href: "/finance", icon: Wallet, label: () => "Finanzas" },
  payments: { href: "/finance?tab=cobros", icon: Banknote, label: () => "Pagos" },
  billing: { href: "/billing", icon: Receipt, label: () => "Facturación" },
  whatsapp: { href: "/whatsapp", icon: MessageCircle, label: () => "WhatsApp" },
};

/**
 * Módulos que dan acceso a cada ruta del negocio, derivados del menú (una sola
 * fuente). Una ruta puede venir de varios módulos: `/finance` la abren Finanzas
 * y Pagos. El servidor la usa para no servir pantallas ni acciones de módulos
 * apagados (SEC-06): ocultarlas del menú no basta.
 */
const ROUTE_MODULES: ReadonlyMap<string, readonly ModuleValue[]> = (() => {
  const map = new Map<string, ModuleValue[]>();
  for (const [moduleName, entry] of Object.entries(MODULE_NAV) as [ModuleValue, ModuleNav | ModuleNav[]][]) {
    for (const nav of Array.isArray(entry) ? entry : [entry]) {
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

export const SETTINGS_ITEM: NavItem = {
  key: "settings",
  module: "settings",
  label: "Configuración",
  href: "/settings",
  icon: Settings,
};

/**
 * Grupo de la barra lateral de cada módulo, por el trabajo que resuelve (no
 * por el orden en que se activó): atender y operar, mover dinero, hablar con
 * los clientes. Un grupo sin módulos activos no aparece.
 */
const MODULE_GROUP: Record<Exclude<ModuleValue, "dashboard">, "Clientes y operación" | "Dinero" | "Canales"> = {
  crm: "Clientes y operación",
  bookings: "Clientes y operación",
  memberships: "Clientes y operación",
  orders: "Clientes y operación",
  quotes: "Clientes y operación",
  inventory: "Clientes y operación",
  finance: "Dinero",
  payments: "Dinero",
  billing: "Dinero",
  whatsapp: "Canales",
};
const GROUP_ORDER = ["Clientes y operación", "Dinero", "Canales"] as const;

/**
 * Navegación del negocio: solo los módulos activos, en el orden del catálogo,
 * con el vocabulario de la vertical (Socios, Pacientes, Obras…). Grupos:
 * General (inicio, siempre), los de `MODULE_GROUP` y Sistema (configuración).
 */
export function buildTenantNav(vertical: VerticalValue, activeModules: readonly ModuleValue[]): NavGroup[] {
  const terms = getVerticalTerms(vertical);
  const active = new Set(activeModules);
  const items = (moduleName: ModuleValue): NavItem[] => {
    const entry = MODULE_NAV[moduleName];
    return (Array.isArray(entry) ? entry : [entry]).filter((nav) => !nav.verticals || nav.verticals.includes(vertical)).map((nav) => ({
      key: nav.href || "home",
      module: moduleName,
      href: nav.href,
      icon: nav.icon,
      label: nav.label(terms, vertical),
    }));
  };
  // Pagos vive dentro de Finanzas: con Finanzas activa no se repite en el menú.
  const enabled = MODULES.filter((moduleName) => active.has(moduleName) && !(moduleName === "payments" && active.has("finance")));
  return [
    // El inicio existe siempre (es la raíz del negocio), con o sin el módulo.
    { label: "General", items: items("dashboard") },
    ...GROUP_ORDER.map((label) => ({
      label,
      items: enabled.filter((m) => m !== "dashboard" && MODULE_GROUP[m] === label).flatMap(items),
    })),
    { label: "Sistema", items: [SETTINGS_ITEM] },
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
