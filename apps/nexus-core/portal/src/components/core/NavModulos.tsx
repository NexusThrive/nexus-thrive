"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Plus } from "lucide-react";
import { getSeccionesModulo } from "@/lib/core/navegacion";
import { iconoModulo } from "@/lib/core/iconos-modulos";

interface ModuloNav {
  slug: string;
  nombre: string;
  icono: string | null;
  /** Base de ruta LEÍDA DEL CATÁLOGO (ver getModulosActivosAgrupados). */
  rutaBase: string | null;
}

/**
 * SIDEBAR — navegación del negocio ACTIVO (scoped al negocio):
 *
 *   Inicio
 *   Módulos
 *     CAJA MENOR
 *       Dashboard · Movimientos · Categorías
 *   Agregar módulo
 *
 * El módulo del pathname actual despliega sus secciones debajo de su nombre;
 * los demás aparecen solo como nombre (clic → su dashboard). "Agregar módulo"
 * ancla al panel principal, donde están las sugerencias por rubro.
 *
 * La ruta llega por prop desde el catálogo: este componente no conoce rutas,
 * así que un módulo nuevo no puede producir un link 404.
 */
export function NavModulos({ modulos }: { modulos: ModuloNav[] }) {
  const pathname = usePathname();
  const activo = modulos.find((m) => {
    if (!m.rutaBase) return false;
    return pathname === m.rutaBase || pathname.startsWith(`${m.rutaBase}/`);
  });

  return (
    <nav className="flex flex-1 flex-col gap-1 px-3 py-6">
      <Link
        href="/"
        className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition hover:bg-nexus-surface-alt hover:text-nexus-ink ${
          pathname === "/" ? "bg-nexus-surface-alt text-nexus-ink" : "text-nexus-muted"
        }`}
      >
        <LayoutDashboard className="h-4 w-4" />
        Inicio
      </Link>

      {modulos.length > 0 && (
        <div className="mt-3">
          <p className="px-2.5 pb-1 text-[11px] font-semibold uppercase tracking-widest text-nexus-muted">
            Módulos
          </p>
          {modulos.map((mod) => {
            const esActivo = mod.slug === activo?.slug;
            const secciones = getSeccionesModulo(mod.slug);
            // Sin ruta en el catálogo no hay link: antes caía en /${slug} → 404.
            if (!mod.rutaBase) return null;
            return (
              <div key={mod.slug}>
<Link
                    href={mod.rutaBase}
                    className={`mt-1 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-semibold uppercase tracking-wide transition hover:bg-nexus-surface-alt hover:text-nexus-ink ${
                      esActivo ? "bg-nexus-surface-alt text-nexus-ink" : "text-nexus-muted"
                    }`}
                  >
                    {(() => {
                      const Icono = iconoModulo(mod.icono);
                      return <Icono className="h-4 w-4 shrink-0" aria-hidden />;
                    })()}
                    {mod.nombre}
                  </Link>

                {esActivo &&
                  secciones.map((s) => (
                    <Link
                      key={s.href}
                      href={s.href}
                      className={`ml-3 mt-0.5 flex items-center gap-2 rounded-lg border-l border-nexus-border py-1.5 pl-4 pr-2 text-sm font-medium transition hover:bg-nexus-surface-alt hover:text-nexus-ink ${
                        pathname === s.href ? "text-nexus-ink" : "text-nexus-muted"
                      }`}
                    >
                      {s.label}
                    </Link>
                  ))}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-auto border-t border-nexus-border/70 pt-4">
        <a
          href="/#sugerencias"
          className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-nexus-muted transition hover:bg-nexus-surface-alt hover:text-nexus-ink"
        >
          <Plus className="h-4 w-4" />
          Agregar módulo
        </a>
      </div>
    </nav>
  );
}