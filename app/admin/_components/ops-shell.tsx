"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Building2, Headphones, Target, UserPlus } from "lucide-react";
import { ToastProvider } from "@/components/molecules/toast";
import { AppSidebar } from "@/components/organisms/app-sidebar";
import { AppTopbar } from "@/components/organisms/app-topbar";
import { MobileTabBar } from "@/components/organisms/mobile-tab-bar";
import { CurrentUserProvider } from "@/components/providers/current-user";
import { AppShellProvider, type ShellContextValue } from "@/components/providers/shell-context";
import styles from "@/components/templates/tenant-shell.module.css";
import opsStyles from "./ops-shell.module.css";
import type { QuickCreateAction } from "@/lib/experience/navigation/quick-create";
import { opsActiveKey, opsNavFor } from "@/lib/platform/team/nav";
import type { PermissionKey } from "@/lib/platform/team/permissions";
import CommandPalette from "./command-palette";
import TenantForm from "./tenant-form";

export type OpsStaff = { name: string | null; email: string; roleName: string; permissions: PermissionKey[] };

type OpsActions = { openSearch: () => void; openCreate: () => void; staff: OpsStaff };
const OpsContext = createContext<OpsActions | null>(null);

/** Buscador, crear negocio y el integrante actual, desde cualquier pantalla del panel. */
export function useOps(): OpsActions {
  const ctx = useContext(OpsContext);
  if (!ctx) throw new Error("useOps debe usarse dentro de <OpsShell>.");
  return ctx;
}

/** Compatibilidad con los componentes del panel anterior. */
export const useAdminActions = useOps;

/**
 * Shell del NEXUS Operations Center con el armazón de la app del negocio y
 * el lenguaje de la landing: en PC, marco en tinta con la barra lateral y la
 * superior en tono «ink» (vidrio líquido, antetítulos mono con el corte oro)
 * y el contenido en el panel que flota encima; en el celular, la barra
 * inferior con "Crear". La navegación son rutas
 * reales, agrupadas en Operaciones · Clientes · Administración · Sistema, y
 * cada integrante ve solo lo que su rol permite.
 */
export default function OpsShell({ staff, children }: { staff: OpsStaff; children: React.ReactNode }) {
  const pathname = usePathname() ?? "/admin";
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  // "Nuevo negocio" desde el botón Crear del celular llega como
  // /admin/negocios?nuevo=1 (en CRM y Soporte ?nuevo=1 abre su propio formulario).
  const tenantParam = pathname === "/admin/negocios" && searchParams.get("nuevo") === "1";
  const createOpen = formOpen || tenantParam;
  const closeCreate = () => {
    setFormOpen(false);
    if (tenantParam) router.replace(pathname, { scroll: false });
  };
  const groups = useMemo(() => opsNavFor(staff.permissions), [staff.permissions]);
  const activeKey = opsActiveKey(groups, pathname);

  const quickActions = useMemo<QuickCreateAction[]>(() => {
    const list: QuickCreateAction[] = [];
    if (staff.permissions.includes("accounts.create")) {
      list.push({ key: "new-tenant", label: "Nuevo negocio", hint: "Crear una cuenta", href: "/admin/negocios?nuevo=1", icon: Building2 });
    }
    if (staff.permissions.includes("leads.edit")) list.push({ key: "new-lead", label: "Nuevo lead", hint: "CRM comercial", href: "/admin/crm?nuevo=1", icon: Target });
    if (staff.permissions.includes("tickets.reply")) list.push({ key: "new-ticket", label: "Nuevo ticket", hint: "Soporte", href: "/admin/soporte?nuevo=1", icon: Headphones });
    if (staff.permissions.includes("team.invite")) {
      list.push({ key: "invite", label: "Invitar integrante", hint: "Equipo NEXUS", href: "/admin/equipo?invitar=1", icon: UserPlus });
    }
    return list;
  }, [staff.permissions]);

  const value = useMemo<ShellContextValue>(
    () => ({
      brandName: "Operations Center",
      brandSub: staff.roleName.toLowerCase(),
      groups,
      activeKey,
      title: groups.flatMap((g) => g.items).find((i) => i.key === activeKey)?.label ?? "Operations Center",
      hrefFor: (href) => href,
      quickActions,
      createActions: quickActions,
      openSearch: () => setPaletteOpen(true),
    }),
    [groups, activeKey, quickActions, staff.roleName],
  );
  const ops = useMemo(() => ({ openSearch: () => setPaletteOpen(true), openCreate: () => setFormOpen(true), staff }), [staff]);

  return (
    <AppShellProvider value={value}>
      <CurrentUserProvider firstName={staff.name?.trim().split(/\s+/)[0] || null}>
      <OpsContext.Provider value={ops}>
        <ToastProvider>
          <div className={`${styles.root} ${opsStyles.ink}`}>
            <AppSidebar variant="workspace" tone="ink" />
            <div className={styles.main}>
              <AppTopbar variant="workspace" tone="ink" roleLabel={staff.roleName} searchPlaceholder="Buscar negocio o comando…" />
              <div className={`${styles.panel} ${opsStyles.panel}`} data-scroll-panel="">
                <main id="contenido" tabIndex={-1} className={`${styles.view} ${opsStyles.view} nx-view-in`}>
                  {children}
                </main>
              </div>
            </div>
            <MobileTabBar />
          </div>
          <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} onCreate={() => setFormOpen(true)} />
          {createOpen ? <TenantForm onClose={closeCreate} /> : null}
        </ToastProvider>
      </OpsContext.Provider>
      </CurrentUserProvider>
    </AppShellProvider>
  );
}
