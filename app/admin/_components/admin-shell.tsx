"use client";

import { createContext, useContext, useEffect, useMemo, useState, type MouseEvent } from "react";
import { Activity, Building2, Download, ExternalLink, LayoutDashboard, ScrollText } from "lucide-react";
import { ToastProvider } from "@/components/molecules/toast";
import { AppSidebar } from "@/components/organisms/app-sidebar";
import { AppTopbar } from "@/components/organisms/app-topbar";
import { MobileTabBar } from "@/components/organisms/mobile-tab-bar";
import { AppShellProvider, type ShellContextValue } from "@/components/providers/shell-context";
import type { NavGroup, NavItem } from "@/lib/navigation/tenant-nav";
import styles from "@/components/templates/tenant-shell.module.css";
import CommandPalette from "./command-palette";
import TenantForm from "./tenant-form";

const SECTIONS: NavItem[] = [
  { key: "resumen", label: "Resumen", href: "#resumen", icon: LayoutDashboard },
  { key: "negocios", label: "Negocios", href: "#negocios", icon: Building2 },
  { key: "actividad", label: "Actividad", href: "#actividad", icon: Activity },
  { key: "auditoria", label: "Auditoría", href: "#auditoria", icon: ScrollText },
];

const GROUPS: NavGroup[] = [
  { label: "Plataforma", items: SECTIONS },
  {
    label: "Herramientas",
    items: [
      { key: "export", label: "Exportar CSV", href: "/admin/export", icon: Download },
      { key: "site", label: "Sitio público", href: "/", icon: ExternalLink },
    ],
  },
];

type AdminActions = { openSearch: () => void; openCreate: () => void };
const AdminActionsContext = createContext<AdminActions | null>(null);

/** Abrir el buscador o el formulario de negocio desde cualquier parte del panel. */
export function useAdminActions(): AdminActions {
  const ctx = useContext(AdminActionsContext);
  if (!ctx) throw new Error("useAdminActions debe usarse dentro de <AdminShell>.");
  return ctx;
}

/**
 * Shell del panel CEO sobre el mismo sistema que la app del negocio: barra
 * lateral (riel/completa), barra superior de vidrio y barra inferior en
 * móvil. El panel es una página con secciones: la navegación hace scroll
 * suave y el ítem activo sigue a la sección visible. Ctrl/⌘ K abre la
 * paleta del panel (buscar negocios y acciones).
 */
export default function AdminShell({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState("resumen");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (first?.target.id) setActive(first.target.id);
      },
      { rootMargin: "-15% 0px -70% 0px", threshold: 0 },
    );
    for (const section of SECTIONS) {
      const el = document.getElementById(section.key);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  const value = useMemo<ShellContextValue>(
    () => ({
      brandName: "Plataforma",
      brandSub: "panel CEO",
      groups: GROUPS,
      activeKey: active,
      title: SECTIONS.find((s) => s.key === active)?.label ?? "Resumen",
      hrefFor: (href) => (href.startsWith("#") ? `/admin${href}` : href),
      quickActions: [],
      openSearch: () => setPaletteOpen(true),
      onNavigate: (item: NavItem, event: MouseEvent) => {
        if (item.key === "export") {
          // Descarga directa: el CSV lo genera el route handler.
          event.preventDefault();
          window.location.assign("/admin/export");
          return;
        }
        if (!item.href.startsWith("#")) return;
        event.preventDefault();
        setActive(item.key);
        document.getElementById(item.key)?.scrollIntoView({ behavior: "smooth", block: "start" });
      },
    }),
    [active],
  );
  const actions = useMemo(
    () => ({ openSearch: () => setPaletteOpen(true), openCreate: () => setFormOpen(true) }),
    [],
  );

  return (
    <AppShellProvider value={value}>
      <AdminActionsContext.Provider value={actions}>
        <ToastProvider>
          <div className={styles.root}>
            <AppSidebar />
            <div className={styles.main}>
              <AppTopbar />
              <main id="contenido" tabIndex={-1} className={`${styles.view} nx-view-in`} style={{ maxWidth: 1440 }}>
                {children}
              </main>
            </div>
            <MobileTabBar />
          </div>
          <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} onCreate={() => setFormOpen(true)} />
          {formOpen ? <TenantForm onClose={() => setFormOpen(false)} /> : null}
        </ToastProvider>
      </AdminActionsContext.Provider>
    </AppShellProvider>
  );
}
