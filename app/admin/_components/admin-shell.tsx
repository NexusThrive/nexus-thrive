"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import {
  Activity,
  Building2,
  Download,
  LayoutDashboard,
  Menu,
  ScrollText,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { Brand } from "@/components/atoms/logo";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/organisms/sheet";
import { cn } from "@/lib/utils";

/** Descarga el CSV vía un enlace efímero (evita navegación client). */
function downloadExport() {
  const anchor = document.createElement("a");
  anchor.href = "/admin/export";
  anchor.click();
}

type Section = {
  id: string;
  label: string;
  icon: LucideIcon;
};

const SECTIONS: Section[] = [
  { id: "resumen", label: "Resumen", icon: LayoutDashboard },
  { id: "negocios", label: "Negocios", icon: Building2 },
  { id: "actividad", label: "Actividad", icon: Activity },
  { id: "auditoria", label: "Auditoría", icon: ScrollText },
];

/**
 * Armazón del panel: sidebar fija en escritorio (superficie Sidebar: blanca en
 * claro, Ink en oscuro), drawer en
 * móvil y scroll-spy sobre las secciones de la página. El contenido (server
 * components) se pasa como children.
 */
export default function AdminShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [active, setActive] = useState("resumen");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (a, b) => a.boundingClientRect.top - b.boundingClientRect.top,
          );
        const first = visible[0];
        if (first?.target.id) setActive(first.target.id);
      },
      { rootMargin: "-15% 0px -70% 0px", threshold: 0 },
    );

    for (const section of SECTIONS) {
      const el = document.getElementById(section.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  const goTo = (id: string) => {
    setActive(id);
    setMobileOpen(false);
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <div className="flex min-h-screen bg-background/60">
      {/* Sidebar escritorio */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <SidebarContent active={active} onNavigate={goTo} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barra superior móvil */}
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-sidebar-border bg-sidebar/90 px-4 py-3 backdrop-blur lg:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground transition hover:bg-muted"
              aria-label="Abrir menú"
            >
              <Menu className="h-5 w-5" aria-hidden />
            </SheetTrigger>
            <SheetContent side="left" className="w-64 gap-0 bg-sidebar p-0">
              <SheetHeader className="sr-only">
                <SheetTitle>Navegación</SheetTitle>
              </SheetHeader>
              <SidebarContent active={active} onNavigate={goTo} />
            </SheetContent>
          </Sheet>
          <Brand tone="on-paper" />
        </header>

        <main className="flex-1">
          <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

function SidebarContent({
  active,
  onNavigate,
}: {
  active: string;
  onNavigate: (id: string) => void;
}) {
  return (
    <>
      <div className="flex h-35 items-center justify-center border-b border-sidebar-border px-5">
        <Brand tone="on-sidebar" />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-sidebar-fg-muted">
          Plataforma
        </p>
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          const isActive = active === section.id;
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => onNavigate(section.id)}
              aria-current={isActive ? "true" : undefined}
              className={cn(
                "relative flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-[opacity,background-color] duration-120",
                isActive
                  ? "bg-sidebar-active text-sidebar-fg opacity-100"
                  : "text-sidebar-fg opacity-[0.72] hover:bg-sidebar-hover hover:opacity-100",
              )}
            >
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-sm bg-sidebar-accent"
                />
              )}
              <Icon
                className={cn(
                  "h-4 w-4",
                  isActive ? "text-sidebar-accent" : "text-sidebar-fg-muted",
                )}
                aria-hidden
              />
              {section.label}
            </button>
          );
        })}

        <div className="pt-3">
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-sidebar-fg-muted">
            Herramientas
          </p>
          <button
            type="button"
            onClick={downloadExport}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-fg opacity-[0.72] transition hover:bg-sidebar-hover hover:opacity-100"
          >
            <Download className="h-4 w-4 text-sidebar-fg-muted" aria-hidden />
            Exportar CSV
          </button>
          <Link
            href="/"
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-fg opacity-[0.72] transition hover:bg-sidebar-hover hover:opacity-100"
          >
            <Building2 className="h-4 w-4 text-sidebar-fg-muted" aria-hidden />
            Sitio público
          </Link>
        </div>
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 rounded-md px-2 py-2">
          <UserButton />
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-medium text-sidebar-fg">SuperAdmin</p>
            <p className="flex items-center gap-1 text-[11px] text-sidebar-fg-muted">
              <ShieldCheck className="h-3 w-3" aria-hidden />
              Acceso total
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
