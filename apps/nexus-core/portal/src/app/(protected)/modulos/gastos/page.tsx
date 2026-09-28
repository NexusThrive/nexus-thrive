import { Receipt } from "lucide-react";
import { prisma } from "@/lib/core/prisma";
import { getOrgActiva } from "@/lib/core/org";
import { crearFormatos } from "@/lib/shared/format";
import { registrarGasto, anularGasto } from "@/lib/modulos/gastos/acciones";

export const dynamic = "force-dynamic";

const CATEGORIAS = [
  { key: "ARRIENDO", label: "Arriendo" },
  { key: "NOMINA", label: "Nómina" },
  { key: "SERVICIOS", label: "Servicios" },
  { key: "MANTENIMIENTO", label: "Mantenimiento" },
  { key: "PUBLICIDAD", label: "Publicidad" },
  { key: "OTROS", label: "Otros" },
];

const CAT_COLOR: Record<string, string> = {
  ARRIENDO: "#c9821a",
  NOMINA: "#27500a",
  SERVICIOS: "#8a570f",
  MANTENIMIENTO: "#791f1f",
  PUBLICIDAD: "#6b6b68",
  OTROS: "#6b6b68",
};

export default async function GastosPage() {
  const { org } = await getOrgActiva();

  // La moneda y el país los persiste el onboarding: el formato sigue a la org,
  // no a constantes del código.
  const presentacion = { moneda: org.moneda, pais: org.pais };
  const { formatDate, formatMoney } = crearFormatos(presentacion);

  const desde = new Date();
  desde.setMonth(desde.getMonth() - 1);
  desde.setHours(0, 0, 0, 0);

  const gastos = await prisma.gasto.findMany({
    where: { orgId: org.id, anulado: false, fecha: { gte: desde } },
    orderBy: { fecha: "desc" },
  });

  const total = gastos.reduce((acc, g) => acc + Number(g.monto), 0);
  const porCategoria = new Map<string, number>();
  for (const g of gastos) {
    porCategoria.set(g.categoria, (porCategoria.get(g.categoria) ?? 0) + Number(g.monto));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-nexus-ink">Gastos</h1>
          <p className="text-sm text-nexus-muted">{formatMoney(total)} este mes</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Registrar */}
        <div className="rounded-xl border border-nexus-border bg-nexus-surface p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-nexus-ink">
            <Receipt className="h-4 w-4" /> Registrar gasto
          </h2>
          <form action={registrarGasto} className="mt-4 space-y-3">
            <select
              name="categoria"
              className="w-full rounded-lg border border-nexus-border bg-nexus-bg px-3 py-2 text-sm text-nexus-ink outline-none focus:border-nexus-gold"
            >
              {CATEGORIAS.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
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
              name="descripcion"
              placeholder="Descripción (opcional)"
              className="w-full rounded-lg border border-nexus-border bg-nexus-bg px-3 py-2 text-sm text-nexus-ink outline-none focus:border-nexus-gold"
            />
            <button
              type="submit"
              className="w-full rounded-lg bg-nexus-ink px-4 py-2 text-sm font-medium text-nexus-surface transition hover:opacity-85"
            >
              Guardar gasto
            </button>
          </form>
        </div>

        {/* Resumen por categoría */}
        <div className="rounded-xl border border-nexus-border bg-nexus-surface p-5">
          <h2 className="text-sm font-semibold text-nexus-ink">Este mes por categoría</h2>
          {porCategoria.size === 0 ? (
            <p className="mt-3 rounded-lg border border-dashed border-nexus-border bg-nexus-surface/50 px-4 py-6 text-center text-sm text-nexus-muted">
              Sin gastos este mes
            </p>
          ) : (
            <ul className="mt-4 space-y-2.5">
              {[...porCategoria.entries()]
                .sort((a, b) => b[1] - a[1])
                .map(([cat, monto]) => (
                  <li key={cat}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-nexus-muted">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CAT_COLOR[cat] ?? "#6b6b68" }} />
                        {CATEGORIAS.find((c) => c.key === cat)?.label ?? cat}
                      </span>
                      <span className="font-medium tabular-nums text-nexus-ink">{formatMoney(monto)}</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-nexus-surface-alt">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${total ? Math.round((monto / total) * 100) : 0}%`,
                          backgroundColor: CAT_COLOR[cat] ?? "#6b6b68",
                        }}
                      />
                    </div>
                  </li>
                ))}
            </ul>
          )}
        </div>

        {/* Listado */}
        <div className="rounded-xl border border-nexus-border bg-nexus-surface p-5">
          <h2 className="text-sm font-semibold text-nexus-ink">Últimos gastos</h2>
          {gastos.length === 0 ? (
            <p className="mt-3 rounded-lg border border-dashed border-nexus-border bg-nexus-surface/50 px-4 py-6 text-center text-sm text-nexus-muted">
              Registrar el primero al lado
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-nexus-border/70">
              {gastos.map((g) => (
                <li key={g.id} className="flex items-center justify-between gap-2 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-nexus-ink">
                      {CATEGORIAS.find((c) => c.key === g.categoria)?.label ?? g.categoria}
                    </p>
                    <p className="truncate text-xs text-nexus-muted">
                      {g.descripcion || "—"} · {formatDate(g.fecha)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold tabular-nums text-nexus-red-text">−{formatMoney(Number(g.monto))}</p>
                    {!g.anulado && (
                      <form action={anularGasto} className="mt-0.5">
                        <input type="hidden" name="id" value={g.id} />
                        <input
                          name="motivo"
                          required
                          placeholder="Motivo"
                          className="w-24 rounded border border-nexus-border bg-nexus-bg px-1.5 py-0.5 text-[11px] outline-none focus:border-nexus-red"
                        />
                        <button type="submit" className="text-[11px] text-nexus-red-text hover:underline">
                          Anular
                        </button>
                      </form>
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