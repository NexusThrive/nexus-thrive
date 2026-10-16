"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import type { ModuleValue, VerticalValue } from "@/lib/admin-catalogs";
import {
  activeNavItem,
  buildTenantNav,
  tenantRelativePath,
  type NavGroup,
  type NavItem,
} from "@/lib/navigation/tenant-nav";
import { quickCreateActions, type QuickCreateAction } from "@/lib/navigation/quick-create";

type ShellContextValue = {
  tenantSlug: string;
  tenantName: string;
  groups: NavGroup[];
  /** Ruta relativa al negocio ("/", "/projects/9"…). */
  relativePath: string;
  active: NavItem | undefined;
  quickActions: QuickCreateAction[];
  /** Ruta absoluta de un `href` relativo del negocio. */
  hrefFor: (href: string) => string;
  paletteOpen: boolean;
  setPaletteOpen: (open: boolean) => void;
};

const ShellContext = createContext<ShellContextValue | null>(null);

/**
 * Estado compartido del shell del negocio: navegación (solo módulos activos,
 * con el vocabulario de la vertical), ítem activo, acciones de "Crear" y la
 * paleta de comandos. Recibe datos serializables del layout del servidor y
 * construye la navegación en el cliente (los iconos no viajan por props).
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
  const [paletteOpen, setPaletteOpen] = useState(false);
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

  const value = useMemo<ShellContextValue>(
    () => ({
      tenantSlug,
      tenantName,
      groups,
      relativePath,
      active: activeNavItem(groups, relativePath),
      quickActions,
      hrefFor: (href) => (href === "" ? `/${tenantSlug}` : `/${tenantSlug}${href}`),
      paletteOpen,
      setPaletteOpen,
    }),
    [tenantSlug, tenantName, groups, relativePath, quickActions, paletteOpen],
  );

  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>;
}

export function useShell(): ShellContextValue {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error("useShell debe usarse dentro de <ShellProvider>.");
  return ctx;
}
