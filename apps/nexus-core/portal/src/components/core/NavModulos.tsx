"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Plus } from "lucide-react";
import { iconoModulo } from "@/lib/core/iconos-modulos";

interface Seccion {
  href: string;
  label: string;
}

interface ModuloNav {
  slug: string;
  nombre: string;
  icono: string | null;
  /** Base de ruta LEÍDA DEL CATÁLOGO (ver getModulosActivosAgrupados). */
  rutaBase: string | null;
  /** Sub-entradas, también del catálogo (módulos miembros o sub-páginas). */
  secciones: Seccion[];
}

/** Una entrada está activa si la ruta actual es la base o cuelga de ella. */
function coincide(ruta: string, pathname: string): boolean {
  return pathname === ruta || pathname.startsWith(`${ruta}/`);
}

/**
 * SIDEBAR — navegación del negocio ACTIVO (scoped al negocio):
 *
 *   Inicio
 *   Módulos
 *     GYM
 *       Clientes · Pagos · Gastos
 *     CAJA MENOR
 *       Movimientos · Categorías
 *   Agregar módulo
 *
 * El grupo del pathname actual despliega sus secciones debajo de su nombre;
 * los demás aparecen solo como nombre (clic → su dashboard). "Agregar módulo"
 * ancla al panel principal, donde están las sugerencias por rubro.
 *
 * TODO lo que navega llega por prop desde el catálogo (`rutaBase` +
 * `secciones`, armados en `getModulosActivosAgrupados`): este componente no
 * conoce ninguna ruta de módulo, así que uno nuevo no puede producir un 404.
 *
 * El grupo se considera activo si la ruta actual coincide con SU base o con
 * cualquiera de sus secciones. Antes solo se comparaba la base, y como los
 * módulos ya no cuelgan de la plantilla (`/modulos/clientes` en vez de
 * `/plantillas/gym/clientes`), entrar a un módulo no desplegaba su grupo.
 */
export function NavModulos({ modulos }: { modulos: ModuloNav[] }) {
  const pathname = usePathname();

  const activo = modulos.find((m) => {
    if (m.rutaBase && coincide(m.rutaBase, pathname)) return true;
    return m.secciones.some((s) => coincide(s.href, pathname));
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
            // Sin ruta en el catálogo no hay link: antes caía en /${slug} → 404.
            if (!mod.rutaBase) return null;
            const Icono = iconoModulo(mod.icono);
            return (
              <div key={mod.slug}>
                <Link
                  href={mod.rutaBase}
                  className={`mt-1 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-semibold uppercase tracking-wide transition hover:bg-nexus-surface-alt hover:text-nexus-ink ${
                    esActivo ? "bg-nexus-surface-alt text-nexus-ink" : "text-nexus-muted"
                  }`}
                >
                  <Icono className="h-4 w-4 shrink-0" aria-hidden />
                  {mod.nombre}
                </Link>

                {esActivo &&
                  mod.secciones.map((s) => (
                    <Link
                      key={s.href}
                      href={s.href}
                      className={`ml-3 mt-0.5 flex items-center gap-2 rounded-lg border-l border-nexus-border py-1.5 pl-4 pr-2 text-sm font-medium transition hover:bg-nexus-surface-alt hover:text-nexus-ink ${
                        coincide(s.href, pathname) ? "text-nexus-ink" : "text-nexus-muted"
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
