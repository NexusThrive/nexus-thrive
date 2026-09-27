import { Tags } from "lucide-react";
import { prisma } from "@/lib/core/prisma";
import { getOrgActiva } from "@/lib/core/org";
import { getCategoriasCaja } from "@/lib/modulos/caja-menor/datos";
import {
  crearCategoriaCaja,
  desactivarCategoriaCaja,
  reactivarCategoriaCaja,
} from "@/lib/modulos/caja-menor/acciones";

export const dynamic = "force-dynamic";

export default async function CategoriasCajaPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const { org } = await getOrgActiva();

  const [activas, inactivas] = await Promise.all([
    getCategoriasCaja(org.id, true),
    getCategoriasCaja(org.id, false),
  ]);

  // Conteo de movimientos por categoría (para mostrar qué se usa de verdad).
  const movimientos = await prisma.movimientoCaja.findMany({
    where: { orgId: org.id, anulado: false, categoriaId: { not: null } },
    select: { categoriaId: true },
  });
  const conteo = new Map<string, number>();
  for (const m of movimientos) {
    if (m.categoriaId) conteo.set(m.categoriaId, (conteo.get(m.categoriaId) ?? 0) + 1);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-nexus-ink">Categorías</h1>
        <p className="text-sm text-nexus-muted">
          Cada negocio usa las suyas: mercado, transporte, papelería, servicios…
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-nexus-red/30 bg-nexus-surface-alt px-4 py-3 text-sm text-nexus-red-text">
          Ya existe una categoría con ese nombre.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Crear */}
        <div className="rounded-xl border border-nexus-border bg-nexus-surface p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-nexus-ink">
            <Tags className="h-4 w-4" /> Nueva categoría
          </h2>
          <form action={crearCategoriaCaja} className="mt-4 space-y-3">
            <input
              name="nombre"
              required
              placeholder="Nombre (ej: Eventos, Limpieza…)"
              className="w-full rounded-lg border border-nexus-border bg-nexus-bg px-3 py-2 text-sm text-nexus-ink outline-none focus:border-nexus-gold"
            />
            <button
              type="submit"
              className="w-full rounded-lg bg-nexus-ink px-4 py-2 text-sm font-medium text-nexus-surface transition hover:opacity-85"
            >
              Crear categoría
            </button>
          </form>
        </div>

        {/* Activas */}
        <div className="rounded-xl border border-nexus-border bg-nexus-surface p-5">
          <h2 className="text-sm font-semibold text-nexus-ink">En uso ({activas.length})</h2>
          {activas.length === 0 ? (
            <p className="mt-3 rounded-lg border border-dashed border-nexus-border bg-nexus-surface/50 px-4 py-6 text-center text-sm text-nexus-muted">
              Creá la primera al lado
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-nexus-border/70">
              {activas.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-nexus-ink">{c.nombre}</p>
                    <p className="text-xs text-nexus-muted">
                      {conteo.get(c.id) ?? 0} movimiento(s)
                    </p>
                  </div>
                  <form action={desactivarCategoriaCaja}>
                    <input type="hidden" name="id" value={c.id} />
                    <button type="submit" className="text-[11px] text-nexus-muted hover:text-nexus-red-text hover:underline">
                      Desactivar
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Inactivas */}
        <div className="rounded-xl border border-nexus-border bg-nexus-surface p-5">
          <h2 className="text-sm font-semibold text-nexus-ink">Desactivadas</h2>
          {inactivas.length === 0 ? (
            <p className="mt-3 rounded-lg border border-dashed border-nexus-border bg-nexus-surface/50 px-4 py-6 text-center text-sm text-nexus-muted">
              Nada desactivado por ahora
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-nexus-border/70">
              {inactivas.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2 py-2.5 opacity-70">
                  <div>
                    <p className="text-sm font-medium text-nexus-ink">{c.nombre}</p>
                    <p className="text-xs text-nexus-muted">
                      {conteo.get(c.id) ?? 0} movimiento(s)
                    </p>
                  </div>
                  <form action={reactivarCategoriaCaja}>
                    <input type="hidden" name="id" value={c.id} />
                    <button type="submit" className="text-[11px] text-nexus-gold-text hover:underline">
                      Reactivar
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}