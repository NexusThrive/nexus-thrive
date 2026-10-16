import type { ReactNode } from "react";
import type { ModuleValue, VerticalValue } from "@/lib/admin-catalogs";
import { RouteBar } from "@/components/molecules/route-bar";
import Header from "@/components/organisms/header";
import { ModuleEntry } from "@/components/organisms/module-intro";
import Sidebar from "@/components/organisms/sidebar";
import { SidebarProvider } from "@/components/providers/sidebar-context";

/**
 * Plantilla del negocio: topbar de 56 px, sidebar de 232 px (drawer en móvil)
 * y área de contenido con la barra de ruta y la intro de módulo. No carga
 * datos: el layout `(app)` le pasa lo ya resuelto en el servidor.
 */
export function TenantShell({
  tenantSlug,
  tenantName,
  vertical,
  activeModules,
  children,
}: {
  tenantSlug: string;
  tenantName: string;
  vertical: VerticalValue;
  /** Módulos activos, ya filtrados y ordenados. */
  activeModules: ModuleValue[];
  children: ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="min-h-screen bg-background font-sans text-foreground">
        <Header tenantName={tenantName} />

        <Sidebar
          tenantSlug={tenantSlug}
          tenantName={tenantName}
          vertical={vertical}
          activeModules={activeModules}
        />

        <main className="px-4 py-6 sm:px-6 lg:py-8 lg:pl-[15.5rem] lg:pr-8">
          <RouteBar />
          <ModuleEntry>{children}</ModuleEntry>
        </main>
      </div>
    </SidebarProvider>
  );
}
