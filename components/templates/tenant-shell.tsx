import type { ReactNode } from "react";
import type { VerticalValue } from "@/lib/core/sectors/verticals";
import type { ModuleValue } from "@/lib/core/capabilities/modules";
import { ToastProvider } from "@/components/molecules/toast";
import { AppSidebar } from "@/components/organisms/app-sidebar";
import { AppTopbar } from "@/components/organisms/app-topbar";
import { CommandPalette } from "@/components/organisms/command-palette";
import { BusinessSwitcher } from "@/components/organisms/business-switcher";
import { NavbarSearch } from "@/components/organisms/navbar-search";
import { MobileTabBar } from "@/components/organisms/mobile-tab-bar";
import { NavTransitions } from "@/components/organisms/nav-transitions";
import { NetworkBanner } from "@/components/molecules/network-banner";
import { QuickCreateProvider } from "@/components/organisms/quick-create-host";
import { RouteBreadcrumbs } from "@/components/organisms/route-breadcrumbs";
import { ShellProvider } from "@/components/providers/shell-context";
import styles from "./tenant-shell.module.css";

/**
 * Plantilla del negocio. Móvil: barra superior + barra inferior con el botón
 * central "Crear". Tablet: riel de iconos. PC: barra lateral completa (se
 * puede contraer). Paleta de comandos con Ctrl/⌘ K y notificaciones en toda
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
  businesses,
  onSwitchBusiness,
  topbarActions,
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
  /** Negocios de la cuenta, para el selector de la navbar (el activo es `tenantSlug`). */
  businesses?: { slug: string; name: string }[];
  /** Acción de servidor que recuerda la organización elegida como la última usada. */
  onSwitchBusiness?: (slug: string) => void | Promise<void>;
  /** Botones extra de la barra superior (p. ej. la campana de notificaciones). */
  topbarActions?: ReactNode;
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
          <AppSidebar />
          <div className={styles.main}>
            <AppTopbar
              actions={topbarActions}
              search={<NavbarSearch />}
              switcher={<BusinessSwitcher currentSlug={tenantSlug} currentName={tenantName} businesses={businesses ?? []} onSwitch={onSwitchBusiness} />}
            />
            <NavTransitions />
            <main id="contenido" tabIndex={-1} className={styles.view}>
              <RouteBreadcrumbs />
              {children}
            </main>
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
