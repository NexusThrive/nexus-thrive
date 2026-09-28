import { ArrowLeftRight } from "lucide-react";
import { getOrgActiva } from "@/lib/core/org";
import { getCategoriasCaja, getMovimientosCaja } from "@/lib/modulos/caja-menor/datos";
import { crearMovimientoCaja, anularMovimientoCaja } from "@/lib/modulos/caja-menor/acciones";
import { crearFormatos } from "@/lib/shared/format";

export const dynamic = "force-dynamic";

const TIPO_LABEL: Record<string, string> = {
  INGRESO: "Ingreso (entra plata)",
  EGRESO: "Egreso (sale plata)",
};

export default async function MovimientosCajaPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; categoria?: string; error?: string }>;
}) {
  const { tipo, categoria, error } = await searchParams;
  const { org } = await getOrgActiva();

  // La moneda y el país los persiste el onboarding: el formato sigue a la org,
  // no a constantes del código.
  const presentacion = { moneda: org.moneda, pais: org.pais };
  const { formatDate, formatMoney } = crearFormatos(presentacion);

  const [categorias, movimientos] = await Promise.all([
    getCategoriasCaja(org.id),
    getMovimientosCaja(org.id, {
      tipo: tipo === "INGRESO" || tipo === "EGRESO" ? tipo : undefined,
      categoriaId: categoria || undefined,
    }),
  ]);

  const totalFiltrado = movimientos.reduce(
    (acc, m) => acc + (m.tipo === "INGRESO" ? Number(m.monto) : -Number(m.monto)),
    0,
  );

  const errores: Record<string, string> = {
    monto: "El monto debe ser mayor que cero.",
    saldo: "No alcanza el saldo de la caja para ese egreso.",
    categoria: "Esa categoría no existe o está desactivada.",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-nexus-ink">Movimientos</h1>
        <p className="text-sm text-nexus-muted">
          {movimientos.length} movimiento(s) · {tipo ? TIPO_LABEL[tipo] ?? tipo : "todos"}
          {categoria ? ` · categoría "${categoria}"` : ""} · neto {formatMoney(totalFiltrado)}
        </p>
      </div>

      {error && errores[error] && (
        <div className="rounded-lg border border-nexus-red/30 bg-nexus-surface-alt px-4 py-3 text-sm text-nexus-red-text">
          {errores[error]}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Registrar */}
        <div className="rounded-xl border border-nexus-border bg-nexus-surface p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-nexus-ink">
            <ArrowLeftRight className="h-4 w-4" /> Registrar movimiento
          </h2>
          <form action={crearMovimientoCaja} className="mt-4 space-y-3">
            <select
              name="tipo"
              className="w-full rounded-lg border border-nexus-border bg-nexus-bg px-3 py-2 text-sm text-nexus-ink outline-none focus:border-nexus-gold"
            >
              <option value="INGRESO">Ingreso (entra plata)</option>
              <option value="EGRESO">Egreso (sale plata)</option>
            </select>
            <input
              name="monto"
              type="number"
              step="0.01"
              min="0"
              required
              placeholder="Monto (COP)"
              className="w-full rounded-lg border border-nexus-border bg-nexus-bg px-3 py-2 text-sm text-nexus-ink outline-none focus:border-nexus-gold"
            />
            <input
              name="fecha"
              type="date"
              className="w-full rounded-lg border border-nexus-border bg-nexus-bg px-3 py-2 text-sm text-nexus-ink outline-none focus:border-nexus-gold"
            />
            {categorias.length > 0 && (
              <select
                name="categoriaId"
                className="w-full rounded-lg border border-nexus-border bg-nexus-bg px-3 py-2 text-sm text-nexus-ink outline-none focus:border-nexus-gold"
              >
                <option value="">Sin categoría</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            )}
            <input
              name="descripcion"
              placeholder="Descripción (opcional)"
              className="w-full rounded-lg border border-nexus-border bg-nexus-bg px-3 py-2 text-sm text-nexus-ink outline-none focus:border-nexus-gold"
            />
            <button
              type="submit"
              className="w-full rounded-lg bg-nexus-ink px-4 py-2 text-sm font-medium text-nexus-surface transition hover:opacity-85"
            >
              Guardar movimiento
            </button>
            <p className="text-[11px] leading-relaxed text-nexus-muted">
              Fecha en blanco = hoy. Un egreso no puede dejar la caja en negativo.
            </p>
          </form>
        </div>

        {/* Filtrar */}
        <div className="rounded-xl border border-nexus-border bg-nexus-surface p-5">
          <h2 className="text-sm font-semibold text-nexus-ink">Filtrar</h2>
          <form method="get" className="mt-4 space-y-3">
            <select
              name="tipo"
              defaultValue={tipo ?? ""}
              className="w-full rounded-lg border border-nexus-border bg-nexus-bg px-3 py-2 text-sm text-nexus-ink outline-none focus:border-nexus-gold"
            >
              <option value="">Todos los tipos</option>
              <option value="INGRESO">Solo ingresos</option>
              <option value="EGRESO">Solo egresos</option>
            </select>
            <select
              name="categoria"
              defaultValue={categoria ?? ""}
              className="w-full rounded-lg border border-nexus-border bg-nexus-bg px-3 py-2 text-sm text-nexus-ink outline-none focus:border-nexus-gold"
            >
              <option value="">Todas las categorías</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 rounded-lg bg-nexus-ink px-4 py-2 text-sm font-medium text-nexus-surface transition hover:opacity-85"
              >
                Aplicar
              </button>
              <a
                href="/modulos/caja-menor/movimientos"
                className="rounded-lg border border-nexus-border px-4 py-2 text-sm font-medium text-nexus-muted transition hover:bg-nexus-surface-alt hover:text-nexus-ink"
              >
                Quitar
              </a>
            </div>
          </form>
        </div>

        {/* Listado */}
        <div className="rounded-xl border border-nexus-border bg-nexus-surface p-5 lg:col-span-1">
          <h2 className="text-sm font-semibold text-nexus-ink">Movimientos</h2>
          {movimientos.length === 0 ? (
            <p className="mt-3 rounded-lg border border-dashed border-nexus-border bg-nexus-surface/50 px-4 py-6 text-center text-sm text-nexus-muted">
              Sin movimientos con ese filtro. Registrá el primero al lado.
            </p>
          ) : (
            <ul className="mt-3 max-h-[28rem] divide-y divide-nexus-border/70 overflow-y-auto">
              {movimientos.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-2 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-nexus-ink">
                      {m.descripcion || m.categoria?.nombre || (m.tipo === "INGRESO" ? "Ingreso" : "Egreso")}
                    </p>
                    <p className="truncate text-xs text-nexus-muted">
                      {m.categoria?.nombre ?? "Sin categoría"} · {formatDate(m.fecha)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p
                      className={`text-sm font-semibold tabular-nums ${
                        m.tipo === "INGRESO" ? "text-nexus-green-text" : "text-nexus-red-text"
                      }`}
                    >
                      {m.tipo === "INGRESO" ? "+" : "−"}
                      {formatMoney(Number(m.monto))}
                    </p>
                    {!m.anulado && (
                      <form action={anularMovimientoCaja} className="mt-0.5 flex items-center justify-end gap-1.5">
                        <input type="hidden" name="id" value={m.id} />
                        <input
                          name="motivo"
                          required
                          placeholder="Motivo"
                          className="w-20 rounded border border-nexus-border bg-nexus-bg px-1.5 py-0.5 text-[11px] outline-none focus:border-nexus-red"
                        />
                        <button type="submit" className="text-[11px] text-nexus-red-text hover:underline">
                          Anular
                        </button>
                      </form>
                    )}
                    {m.anulado && (
                      <p className="text-[11px] text-nexus-muted">Anulado: {m.motivoAnulacion}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}