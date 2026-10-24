import type { ReactNode } from "react";
import type { ModuleValue, VerticalValue } from "@/lib/admin/catalogs";
import { ToastProvider } from "@/components/molecules/toast";
import { AppSidebar } from "@/components/organisms/app-sidebar";
import { AppTopbar } from "@/components/organisms/app-topbar";
import { CommandPalette } from "@/components/organisms/command-palette";
import { BusinessSwitcher } from "@/components/organisms/business-switcher";
import { NavbarSearch } from "@/components/organisms/navbar-search";
import { MobileTabBar } from "@/components/organisms/mobile-tab-bar";
import { NetworkBanner } from "@/components/molecules/network-banner";
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
  businesses,
  onSwitchBusiness,
  topbarActions,
  children,
}: {
  tenantSlug: string;
  tenantName: string;
  vertical: VerticalValue;
  /** Módulos activos, ya filtrados y ordenados. */
  activeModules: ModuleValue[];
  /** Negocios de la cuenta, para el selector de la navbar (el activo es `tenantSlug`). */
  businesses?: { slug: string; name: string }[];
  /** Acción de servidor que recuerda la organización elegida como la última usada. */
  onSwitchBusiness?: (slug: string) => void | Promise<void>;
  /** Botones extra de la barra superior (p. ej. la campana de notificaciones). */
  topbarActions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <ShellProvider
      tenantSlug={tenantSlug}
      tenantName={tenantName}
      vertical={vertical}
      activeModules={activeModules}
    >
      <ToastProvider>
        <div className={styles.root}>
          <AppSidebar />
          <div className={styles.main}>
            <AppTopbar
              actions={topbarActions}
              search={<NavbarSearch />}
              switcher={<BusinessSwitcher currentSlug={tenantSlug} currentName={tenantName} businesses={businesses ?? []} onSwitch={onSwitchBusiness} />}
            />
            <main id="contenido" tabIndex={-1} className={styles.view}>
              {children}
            </main>
          </div>
          <MobileTabBar />
          <CommandPalette inlineOnDesktop />
          <NetworkBanner />
        </div>
      </ToastProvider>
    </ShellProvider>
  );
}
