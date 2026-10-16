"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, type ComponentType } from "react";
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
import { BrandLogo } from "@nexus/brand/BrandLogo";
import { MODULES, type ModuleValue, type VerticalValue } from "@/lib/admin-catalogs";
import { getVerticalTerms, type VerticalTerms } from "@/lib/vertical-terms";
import { cn } from "@/lib/cn";
import { useSidebar } from "@/components/providers/sidebar-context";

type SidebarProps = {
  /** Slug del negocio activo: todas las rutas se construyen con él (nunca hardcodeado). */
  tenantSlug: string;
  /** Nombre del negocio activo, solo para el bloque de espacio de trabajo. */
  tenantName: string;
  /** Vertical del negocio: alimenta el vocabulario adaptativo (Socios/Pacientes/Turistas…). */
  vertical: VerticalValue;
  /** Módulos ACTIVOS de este negocio (filtrados y ordenados en el servidor). */
  activeModules: ModuleValue[];
};

type NavItem = {
  module: ModuleValue | "settings";
  label: string;
  href: string;
  icon: ComponentType<{
    "aria-hidden"?: boolean | "true" | "false";
    className?: string;
  }>;
};

type NavGroup = { label: string; items: NavItem[] };

type ModuleNav = { href: string; icon: NavItem["icon"]; label: (terms: VerticalTerms, vertical: VerticalValue) => string };

/** Un módulo puede ocupar varias entradas (cotizaciones = obras + carpetas + catálogo). */
const MODULE_NAV: Record<ModuleValue, ModuleNav | ModuleNav[]> = {
  dashboard: { href: "", icon: LayoutDashboard, label: () => "Dashboard" },
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

/**
 * Navegación principal del negocio sobre superficie Sidebar (232 px): blanca
 * en modo claro, Ink en oscuro. Cabecera de 112 px con el logo oficial,
 * selector de negocio, y navegación dinámica (solo módulos activos +
 * Configuración) con vocabulario adaptativo.
 * Mobile: drawer con overlay, cierre por Escape/navegación/viewport desktop.
 */
export default function Sidebar({
  tenantSlug,
  tenantName,
  vertical,
  activeModules,
}: SidebarProps) {
  const { isOpen, close } = useSidebar();
  const pathname = usePathname();
  const basePath = `/${tenantSlug}`;
  const terms = getVerticalTerms(vertical);

  const navItems = (moduleName: ModuleValue): NavItem[] => {
    const entry = MODULE_NAV[moduleName];
    return (Array.isArray(entry) ? entry : [entry]).map((item) => ({
      module: moduleName,
      href: item.href,
      icon: item.icon,
      label: item.label(terms, vertical),
    }));
  };

  const activeSet = new Set(activeModules);
  const navModules = MODULES.filter((moduleName) => activeSet.has(moduleName));

  const groups = (
    [
      {
        label: "General",
        items: navModules
          .filter((moduleName) => moduleName === "dashboard")
          .flatMap((moduleName) => navItems(moduleName)),
      },
      {
        label: "Gestión",
        items: navModules
          .filter((moduleName) => moduleName !== "dashboard")
          .flatMap((moduleName) => navItems(moduleName)),
      },
      {
        label: "Sistema",
        items: [
          { module: "settings", label: "Configuración", href: "/settings", icon: Settings },
        ],
      },
    ] satisfies NavGroup[]
  ).filter((group) => group.items.length > 0);

  const currentPath = !pathname
    ? "/"
    : pathname === basePath || pathname === `${basePath}/`
      ? "/"
      : pathname.startsWith(`${basePath}/`)
        ? pathname.slice(basePath.length)
        : pathname;

  const isActive = (href: string) =>
    href === ""
      ? currentPath === "/"
      : currentPath === href || currentPath.startsWith(`${href}/`);

  useEffect(() => {
    close();
  }, [pathname, close]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const handleViewportChange = (event: MediaQueryListEvent) => {
      if (event.matches) close();
    };
    mediaQuery.addEventListener("change", handleViewportChange);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      mediaQuery.removeEventListener("change", handleViewportChange);
    };
  }, [isOpen, close]);

  const workspaceInitial = tenantName.trim().charAt(0).toUpperCase() || "N";

  return (
    <>
      {isOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={close}
          className="fixed inset-0 z-40 bg-ink/60 lg:hidden"
        />
      )}

      <aside
        id="tenant-sidebar"
        aria-label="Navegación principal"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[232px] max-w-[85vw] flex-col border-r border-sidebar-border bg-sidebar text-sidebar-fg",
          "transition-[transform,visibility] duration-200 ease-out",
          "lg:top-14 lg:max-w-none lg:translate-x-0 lg:transition-none",
          isOpen
            ? "translate-x-0 shadow-[0_8px_24px_rgba(0,0,0,0.4)]"
            : "invisible -translate-x-full lg:visible lg:shadow-none",
        )}
      >
        {/* Cabecera de marca (112 px) */}
        <div className="flex relative h-35 shrink-0 items-center justify-center border-b border-sidebar-border px-5">
          <BrandLogo variant="lockup" size={88} className="text-sidebar-fg" />
          <button
            type="button"
            onClick={close}
            aria-label="Cerrar menú"
            className="absolute  right-5 top-5 size-8 shrink-0 place-items-center rounded-md text-sidebar-fg/60 transition-colors hover:bg-sidebar-hover hover:text-sidebar-fg lg:hidden"
          >
            <svg
              aria-hidden="true"
              className="size-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        {/* Selector de negocio */}
        <div className="flex shrink-0 items-center gap-3 border-b border-sidebar-border px-4 py-3">
          <span
            aria-hidden="true"
            className="grid size-7 shrink-0 place-items-center rounded bg-gold-500 text-xs font-semibold text-ink"
          >
            {workspaceInitial}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-sidebar-fg">{tenantName}</p>
            <p className="truncate font-mono text-xs text-sidebar-fg-muted">{tenantSlug}</p>
          </div>
        </div>

        {/* Navegación */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {groups.map((group) => (
            <div key={group.label} className="mb-5 last:mb-0">
              <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-sidebar-fg-muted">
                {group.label}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  const href = item.href === "" ? basePath : `${basePath}${item.href}`;

                  return (
                    <li key={item.href}>
                      <Link
                        href={href}
                        onClick={close}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "nx-nav-item h-10 text-sm",
                          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500",
                          active ? "opacity-100" : "opacity-[0.72]",
                        )}
                      >
                        <Icon
                          aria-hidden="true"
                          className={cn(
                            "size-5 shrink-0",
                            active ? "text-sidebar-accent" : "text-sidebar-fg-muted",
                          )}
                        />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
