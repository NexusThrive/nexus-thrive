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
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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
 * Armazón del panel: sidebar fija en escritorio, drawer en móvil y
 * scroll-spy sobre las secciones de la página. El contenido (server
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
    <div className="flex min-h-screen bg-slate-50/70">
      {/* Sidebar escritorio */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-slate-200/80 bg-white lg:flex">
        <SidebarContent active={active} onNavigate={goTo} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barra superior móvil */}
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200/80 text-slate-600 transition hover:bg-slate-50"
              aria-label="Abrir menú"
            >
              <Menu className="h-5 w-5" aria-hidden />
            </SheetTrigger>
            <SheetContent side="left" className="w-64 gap-0 p-0">
              <SheetHeader className="sr-only">
                <SheetTitle>Navegación</SheetTitle>
              </SheetHeader>
              <SidebarContent active={active} onNavigate={goTo} />
            </SheetContent>
          </Sheet>
          <Brand />
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

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-sm">
        <Sparkles className="h-5 w-5" aria-hidden />
      </span>
      <span className="leading-tight">
        <span className="block text-sm font-semibold tracking-tight text-slate-900">
          Nexus Thrive
        </span>
        <span className="block text-[11px] font-medium text-slate-400">
          Centro de comando
        </span>
      </span>
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
      <div className="flex h-16 items-center border-b border-slate-200/80 px-4">
        <Brand />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
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
                "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                isActive
                  ? "bg-amber-50 text-amber-900 ring-1 ring-inset ring-amber-500/20"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4",
                  isActive ? "text-amber-600" : "text-slate-400",
                )}
                aria-hidden
              />
              {section.label}
            </button>
          );
        })}

        <div className="pt-3">
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Herramientas
          </p>
          <button
            type="button"
            onClick={downloadExport}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <Download className="h-4 w-4 text-slate-400" aria-hidden />
            Exportar CSV
          </button>
          <Link
            href="/"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <Building2 className="h-4 w-4 text-slate-400" aria-hidden />
            Sitio público
          </Link>
        </div>
      </nav>

      <div className="border-t border-slate-200/80 p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <UserButton />
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-medium text-slate-900">
              SuperAdmin
            </p>
            <p className="flex items-center gap-1 text-[11px] text-slate-400">
              <ShieldCheck className="h-3 w-3" aria-hidden />
              Acceso total
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
