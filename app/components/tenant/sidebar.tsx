"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Package,
  Settings,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useSidebar } from "./sidebar-context";

type SidebarProps = {
  /** Slug del negocio activo: todas las rutas se construyen con él (nunca hardcodeado). */
  tenantSlug: string;
  /** Nombre del negocio activo, solo para el bloque de espacio de trabajo. */
  tenantName: string;
};

type NavItem = {
  label: string;
  /** Ruta relativa al tenant ("" = dashboard del tenant). */
  href: string;
  icon: LucideIcon;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    label: "General",
    items: [{ label: "Dashboard", href: "", icon: LayoutDashboard }],
  },
  {
    label: "Gestión",
    items: [
      { label: "CRM", href: "/crm", icon: Users },
      { label: "Finanzas", href: "/finance", icon: Wallet },
      { label: "Inventario", href: "/inventory", icon: Package },
    ],
  },
  {
    label: "Sistema",
    items: [{ label: "Configuración", href: "/settings", icon: Settings }],
  },
];

/**
 * Navegación principal del negocio.
 *
 * - Desktop: fija bajo el header, ancho 256px (`lg:w-64`).
 * - Mobile: drawer oculto inicialmente; se abre desde el Header mediante el
 *   estado compartido de `SidebarProvider` e incluye overlay + cierre con
 *   Escape, al navegar y al volver a desktop.
 * - Rutas siempre relativas al tenant: `/{tenantSlug}/crm`, etc.
 */
export default function Sidebar({ tenantSlug, tenantName }: SidebarProps) {
  const { isOpen, close } = useSidebar();
  const pathname = usePathname();
  const basePath = `/${tenantSlug}`;

  /**
   * El proxy reescribe el subdominio a `/{tenant}/...`, así que el pathname
   * puede venir con o sin el prefijo del tenant según el modo de acceso
   * (subdominio o path directo). Se normaliza para resaltar el ítem activo.
   */
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

  // Cerrar al navegar, con Escape o al volver a un viewport desktop.
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

  const workspaceInitial =
    tenantName.trim().charAt(0).toUpperCase() || "N";

  return (
    <>
      {/* Overlay (solo mobile) */}
      {isOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={close}
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-[1px] lg:hidden"
        />
      )}

      <aside
        id="tenant-sidebar"
        aria-label="Navegación principal"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-slate-200 bg-white",
          "transition-[transform,visibility] duration-200 ease-out",
          "lg:top-16 lg:w-64 lg:max-w-none lg:translate-x-0 lg:transition-none",
          isOpen
            ? "translate-x-0 shadow-2xl"
            : "invisible -translate-x-full lg:visible lg:shadow-none",
        )}
      >
        {/* Espacio de trabajo (equivale al header en mobile) */}
        <div className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 px-4 sm:px-5">
          <span
            aria-hidden="true"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-indigo-600 text-sm font-semibold text-white"
          >
            {workspaceInitial}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">
              {tenantName}
            </p>
            <p className="truncate text-xs text-slate-400">{tenantSlug}</p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Cerrar menú"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 lg:hidden"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Navegación */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="mb-5 last:mb-0">
              <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {group.label}
              </p>
              <ul className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  const href =
                    item.href === "" ? basePath : `${basePath}${item.href}`;

                  return (
                    <li key={item.label}>
                      <Link
                        href={href}
                        onClick={close}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500",
                          active
                            ? "bg-indigo-50 text-indigo-700"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                        )}
                      >
                        <Icon
                          aria-hidden="true"
                          className={cn(
                            "h-5 w-5 shrink-0",
                            active
                              ? "text-indigo-600"
                              : "text-slate-400 group-hover:text-slate-600",
                          )}
                        />
                        <span className="truncate">{item.label}</span>
                        {active && (
                          <span
                            aria-hidden="true"
                            className="ml-auto h-1.5 w-1.5 rounded-full bg-indigo-600"
                          />
                        )}
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
