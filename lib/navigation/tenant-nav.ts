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
  Settings,
  ShoppingCart,
  Users,
  Wallet,
} from "lucide-react";
import { MODULES, type ModuleValue, type VerticalValue } from "@/lib/admin-catalogs";
import { getVerticalTerms, type VerticalTerms } from "@/lib/vertical-terms";

export type NavItem = {
  /** Clave estable (para React y para la paleta de comandos). */
  key: string;
  module: ModuleValue | "settings";
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
};

/** Un módulo puede ocupar varias entradas (cotizaciones = obras + carpetas + catálogo). */
const MODULE_NAV: Record<ModuleValue, ModuleNav | ModuleNav[]> = {
  dashboard: { href: "", icon: LayoutDashboard, label: () => "Inicio" },
  crm: { href: "/crm", icon: Users, label: (terms) => terms.customers },
  bookings: { href: "/bookings", icon: CalendarDays, label: (terms) => terms.bookings },
  memberships: { href: "/memberships", icon: CreditCard, label: () => "Membresías" },
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
  inventory: { href: "/inventory", icon: Package, label: (terms) => terms.items },
  finance: { href: "/finance", icon: Wallet, label: () => "Finanzas" },
  payments: { href: "/payments", icon: Banknote, label: () => "Pagos" },
  billing: { href: "/billing", icon: Receipt, label: () => "Facturación" },
  whatsapp: { href: "/whatsapp", icon: MessageCircle, label: () => "WhatsApp" },
};

export const SETTINGS_ITEM: NavItem = {
  key: "settings",
  module: "settings",
  label: "Configuración",
  href: "/settings",
  icon: Settings,
};

/**
 * Navegación del negocio: solo los módulos activos, en el orden del catálogo,
 * con el vocabulario de la vertical (Socios, Pacientes, Obras…). Grupos:
 * General (inicio), Gestión (módulos) y Sistema (configuración).
 */
export function buildTenantNav(vertical: VerticalValue, activeModules: readonly ModuleValue[]): NavGroup[] {
  const terms = getVerticalTerms(vertical);
  const active = new Set(activeModules);
  const items = (moduleName: ModuleValue): NavItem[] => {
    const entry = MODULE_NAV[moduleName];
    return (Array.isArray(entry) ? entry : [entry]).map((nav) => ({
      key: nav.href || "home",
      module: moduleName,
      href: nav.href,
      icon: nav.icon,
      label: nav.label(terms, vertical),
    }));
  };
  const enabled = MODULES.filter((moduleName) => active.has(moduleName));
  return [
    { label: "General", items: enabled.filter((m) => m === "dashboard").flatMap(items) },
    { label: "Gestión", items: enabled.filter((m) => m !== "dashboard").flatMap(items) },
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
