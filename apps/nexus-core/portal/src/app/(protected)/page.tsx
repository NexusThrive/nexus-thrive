import Link from "next/link";
import { ArrowUpRight, CheckCircle2, Compass, Rocket } from "lucide-react";
import { Button } from "@nexus/ui";
import { getOrgActiva } from "@/lib/core/org";
import { getModulosActivos, getModulosSugeridos } from "@/lib/core/modulos";
import { iconoModulo } from "@/lib/core/iconos-modulos";
import { RUTA_POR_SLUG } from "@/lib/core/navegacion";
import { activarModulo } from "@/lib/core/acciones";

export const dynamic = "force-dynamic";

/**
 * PANEL PRINCIPAL — el hogar del negocio en Nexus.
 * Muestra los módulos ACTIVOS de la org y SUGIERE los que encajan con su
 * rubro (definido en el onboarding). La estructura de la base, en orden:
 * REGISTRO → ONBOARDING → PANEL → MÓDULOS según el negocio.
 */
export default async function PanelPrincipalPage() {
  const { member, org } = await getOrgActiva();

  const [activos, sugeridos] = await Promise.all([
    getModulosActivos(org.id),
    getModulosSugeridos(org.id, org.tipoNegocio),
  ]);

  const rubroLabel = org.tipoNegocio ? capitalizar(org.tipoNegocio) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-nexus-ink">
          Hola, {member.nombre.split(" ")[0]} 👋
        </h1>
        <p className="mt-1 text-sm text-nexus-muted">
          Este es el panel de <span className="font-medium text-nexus-ink">{org.nombre}</span>
          {rubroLabel ? ` · ${rubroLabel}` : ""}. Acá se encienden los módulos de tu negocio.
        </p>
      </div>

      {/* Módulos ACTIVOS */}
      {activos.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-nexus-ink">Tus módulos activos</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activos.map((om) => (
              <Link
                key={om.moduleId}
                href={RUTA_POR_SLUG[om.module.slug] ?? `/${om.module.slug}`}
                className="group rounded-xl border border-nexus-border bg-nexus-surface p-5 transition hover:border-nexus-gold/60"
              >
                <div className="flex items-start justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-nexus-gold/10">
                    {(() => {
                      const Icono = iconoModulo(om.module.icono);
                      return <Icono className="h-5 w-5 text-nexus-gold" aria-hidden />;
                    })()}
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-nexus-muted transition group-hover:text-nexus-gold" />
                </div>
                <h3 className="mt-3 text-sm font-semibold text-nexus-ink">{om.module.nombre}</h3>
                <p className="mt-1 text-xs leading-relaxed text-nexus-muted">{om.module.descripcion}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Sugerencias según el onboarding */}
      {sugeridos.length > 0 && (
        <section id="sugerencias" className="rounded-xl border border-nexus-gold/30 bg-nexus-gold-soft p-5 scroll-mt-20">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-nexus-ink">
            <Compass className="h-4 w-4 text-nexus-gold" />
            Te recomendamos para tu negocio
          </h2>
          <ul className="mt-3 space-y-2.5">
            {sugeridos.map((m) => (
              <li
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-nexus-border/70 bg-nexus-surface px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  {(() => {
                    const Icono = iconoModulo(m.icono);
                    return (
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-nexus-gold/10">
                        <Icono className="h-4.5 w-4.5 text-nexus-gold" aria-hidden />
                      </span>
                    );
                  })()}
                  <div>
                    <p className="text-sm font-semibold text-nexus-ink">{m.nombre}</p>
                    <p className="text-xs text-nexus-muted">{m.descripcion}</p>
                  </div>
                </div>
                <form action={activarModulo}>
                  <input type="hidden" name="moduleId" value={m.id} />
                  <Button type="submit" size="sm">
                    Activar
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Sin módulos todavía — honesto, sin "próximamente" */}
      {activos.length === 0 && sugeridos.length === 0 && (
        <section className="rounded-xl border border-nexus-border bg-nexus-surface p-6 text-center">
          <Rocket className="mx-auto h-8 w-8 text-nexus-gold" />
          <h2 className="mt-3 text-sm font-semibold text-nexus-ink">Tu módulo está en camino</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-nexus-muted">
            Nexus se construye sobre dolores reales: todavía no tenemos un módulo listo para{" "}
            {rubroLabel ?? "tu rubro"}. Contanos qué necesitás y priorizamos con eso.
          </p>
        </section>
      )}

      {/* Checklist de arranque */}
      {activos.length > 0 && (
        <section className="rounded-xl border border-nexus-border bg-nexus-surface p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-nexus-ink">
            <CheckCircle2 className="h-4 w-4 text-nexus-gold" />
            Cómo arrancar
          </h2>
          <ol className="mt-3 grid gap-2 text-sm text-nexus-muted sm:grid-cols-3">
            <li className="rounded-lg border border-dashed border-nexus-border bg-nexus-surface/50 px-4 py-3">
              1. Entrá a tu módulo: <span className="font-medium text-nexus-ink">{activos[0]?.module.nombre}</span>
            </li>
            <li className="rounded-lg border border-dashed border-nexus-border bg-nexus-surface/50 px-4 py-3">
              2. Cargá tu primer dato real (el panel empieza a hablar solo)
            </li>
            <li className="rounded-lg border border-dashed border-nexus-border bg-nexus-surface/50 px-4 py-3">
              3. Hacé tu primer cobro: de ahí salen los números de Nexus
            </li>
          </ol>
        </section>
      )}
    </div>
  );
}

function capitalizar(s: string) {
  const mapa: Record<string, string> = {
    gimnasio: "Gimnasio",
    restaurante: "Restaurante / Café",
    tienda: "Tienda",
    taller: "Taller",
    constructora: "Constructora",
    otro: "Personalizar negocio",
  };
  return mapa[s] ?? s.charAt(0).toUpperCase() + s.slice(1);
}