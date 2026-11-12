import type { ReactNode } from "react";
import type { VerticalValue } from "@/lib/core/sectors/verticals";
import type { ModuleValue } from "@/lib/core/capabilities/modules";
import { roleLabel } from "@/lib/core/auth/roles";
import { hasMemberAccess } from "@/lib/core/sectors/terms";
import { ToastProvider } from "@/components/molecules/toast";
import { WorkspaceLauncher } from "@/components/organisms/workspace-launcher";
import { AppStage } from "@/components/organisms/app-stage";
import { AppSidebar } from "@/components/organisms/app-sidebar";
import { AppTopbar } from "@/components/organisms/app-topbar";
import { CommandPalette } from "@/components/organisms/command-palette";
import { NavbarSearch } from "@/components/organisms/navbar-search";
import { MobileTabBar } from "@/components/organisms/mobile-tab-bar";
import { NavTransitions } from "@/components/organisms/nav-transitions";
import { NetworkBanner } from "@/components/molecules/network-banner";
import { QuickCreateProvider } from "@/components/organisms/quick-create-host";
import { RouteBreadcrumbs } from "@/components/organisms/route-breadcrumbs";
import { ShellProvider } from "@/components/providers/shell-context";
import { SmoothScroll } from "@/components/providers/smooth-scroll";
import { ScrollHint } from "@/components/providers/scroll-hint";
import styles from "./tenant-shell.module.css";

/**
 * Plantilla del negocio. Móvil: barra superior + barra inferior con el botón
 * central "Crear". Tablet: riel de iconos. PC: barra lateral completa (se
 * puede contraer) y, a su derecha, la barra superior y el contenido en un panel blanco que flota sobre el fondo gris. Paleta de comandos con Ctrl/⌘ K y notificaciones en toda
 * la app. Al cambiar de módulo se ve la precarga (loading.tsx), no la intro
 * de la N. No carga datos: el layout `(app)` le pasa lo resuelto en el
 * servidor (solo valores serializables).
 */
export function TenantShell({
  tenantSlug,
  tenantName,
  vertical,
  activeModules,
  role,
  topbarActions,
  topbarNotifications,
  accountExtra,
  children,
}: {
  tenantSlug: string;
  tenantName: string;
  vertical: VerticalValue;
  /** Módulos activos, ya filtrados y ordenados. */
  activeModules: ModuleValue[];
  /** Rol de la persona en el negocio (filtra «Crear» por permisos). */
  role?: string;
  /** Negocios de la cuenta. Por ahora no se muestra selector (cada cuenta usa un solo negocio); se conserva el contrato para cuando vuelva. */
  businesses?: { slug: string; name: string }[];
  /** Acción de servidor que recuerda la organización elegida como la última usada (sin uso mientras no haya selector). */
  onSwitchBusiness?: (slug: string) => void | Promise<void>;
  /** Botones extra de la barra superior (p. ej. la campana de notificaciones). */
  topbarActions?: ReactNode;
  /** Notificaciones (la barra de módulo las muestra; la barra general las pone con sus acciones). */
  topbarNotifications?: ReactNode;
  /** Fila extra en la tarjeta de la cuenta de «Más» (móvil), p. ej. los días de prueba. */
  accountExtra?: ReactNode;
  children: ReactNode;
}) {
  return (
    <ShellProvider
      tenantSlug={tenantSlug}
      tenantName={tenantName}
      vertical={vertical}
      activeModules={activeModules}
      role={role}
    >
      <ToastProvider>
        <QuickCreateProvider>
        <div className={styles.root}>
          <AppSidebar variant="workspace" />
          <div className={styles.main}>
            <AppTopbar
              variant="workspace"
              roleLabel={role ? roleLabel(role, hasMemberAccess(vertical)) : undefined}
              desktopActions={topbarActions}
              notifications={topbarNotifications}
              actions={
                <>
                  <WorkspaceLauncher />
                  {topbarActions}
                </>
              }
              search={<NavbarSearch variant="pill" placeholder="Buscar clientes, cobros…" />}
            />
            <NavTransitions />
            <div className={styles.panel} data-scroll-panel="">
              <SmoothScroll />
              <main id="contenido" tabIndex={-1} className={styles.view}>
                <RouteBreadcrumbs />
                <AppStage>{children}</AppStage>
              </main>
              <ScrollHint />
            </div>
          </div>
          <MobileTabBar accountExtra={accountExtra} />
          <CommandPalette inline />
          <NetworkBanner />
        </div>
        </QuickCreateProvider>
      </ToastProvider>
    </ShellProvider>
  );
}
