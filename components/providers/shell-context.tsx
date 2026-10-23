"use client";

import { createContext, useContext, useMemo, useState, type MouseEvent } from "react";
import { usePathname } from "next/navigation";
import type { ModuleValue, VerticalValue } from "@/lib/admin/catalogs";
import {
  buildTenantNav,
  isNavActive,
  tenantRelativePath,
  type NavGroup,
  type NavItem,
} from "@/lib/navigation/tenant-nav";
import { quickCreateActions, type QuickCreateAction } from "@/lib/navigation/quick-create";

/**
 * Contrato del shell: lo que necesitan la barra lateral, la superior, la
 * inferior móvil y la paleta. La app del negocio y el panel CEO lo llenan
 * cada uno a su manera; los organismos no saben cuál es cuál.
 */
export type ShellContextValue = {
  /** Nombre y subtítulo del espacio (negocio y slug, o "Plataforma"). */
  brandName: string;
  brandSub: string;
  groups: NavGroup[];
  /** Clave del ítem activo (resalta la barra lateral y la inferior). */
  activeKey: string | undefined;
  /** Título de la barra superior. */
  title: string;
  hrefFor: (href: string) => string;
  /** Navegación propia (p. ej. scroll suave a una sección en el panel CEO). */
  onNavigate?: (item: NavItem, event: MouseEvent) => void;
  /** Acciones del botón "Crear"; vacío = el botón central abre el buscador. */
  quickActions: QuickCreateAction[];
  /** Abre el buscador de la barra superior (paleta propia de cada espacio). */
  openSearch: () => void;
};

const ShellContext = createContext<ShellContextValue | null>(null);

export function AppShellProvider({ value, children }: { value: ShellContextValue; children: React.ReactNode }) {
  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>;
}

export function useShell(): ShellContextValue {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error("useShell debe usarse dentro de <AppShellProvider>.");
  return ctx;
}

/* --- Paleta de comandos de la app del negocio --------------------------- */

type PaletteContextValue = { open: boolean; setOpen: (open: boolean) => void };
const PaletteContext = createContext<PaletteContextValue | null>(null);

export function usePalette(): PaletteContextValue {
  const ctx = useContext(PaletteContext);
  if (!ctx) throw new Error("usePalette debe usarse dentro de <ShellProvider>.");
  return ctx;
}

/**
 * Shell de la app del negocio: navegación de los módulos activos con el
 * vocabulario de la vertical, ítem activo por la URL y acciones de "Crear".
 * Recibe datos serializables del layout del servidor (los iconos no viajan
 * por props) y construye todo en el cliente.
 */
export function ShellProvider({
  tenantSlug,
  tenantName,
  vertical,
  activeModules,
  children,
}: {
  tenantSlug: string;
  tenantName: string;
  vertical: VerticalValue;
  activeModules: ModuleValue[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const modulesKey = activeModules.join(",");

  const groups = useMemo(
    () => buildTenantNav(vertical, activeModules),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [vertical, modulesKey],
  );
  const quickActions = useMemo(
    () => quickCreateActions(vertical, activeModules),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [vertical, modulesKey],
  );
  const relativePath = tenantRelativePath(pathname, tenantSlug);
  const active = groups.flatMap((g) => g.items).find((item) => isNavActive(item.href, relativePath));

  const value = useMemo<ShellContextValue>(
    () => ({
      brandName: tenantName,
      brandSub: tenantSlug,
      groups,
      activeKey: active?.key,
      title: active?.label ?? "Inicio",
      hrefFor: (href) => (href === "" ? `/${tenantSlug}` : `/${tenantSlug}${href}`),
      quickActions,
      openSearch: () => setOpen(true),
    }),
    [tenantSlug, tenantName, groups, active, quickActions],
  );
  const palette = useMemo(() => ({ open, setOpen }), [open]);

  return (
    <PaletteContext.Provider value={palette}>
      <AppShellProvider value={value}>{children}</AppShellProvider>
    </PaletteContext.Provider>
  );
}
