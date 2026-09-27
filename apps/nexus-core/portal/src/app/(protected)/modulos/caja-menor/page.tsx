import Link from "next/link";
import { ArrowUpRight, CircleDollarSign } from "lucide-react";
import { StatCard } from "@nexus/ui";
import { CashFlowChart } from "@/components/shared/charts/CashFlowChart";
import { ExpenseDonut } from "@/components/shared/charts/ExpenseDonut";
import { FiltroRango } from "@/components/shared/FiltroRango";
import { formatMoney, formatDate } from "@/lib/shared/format";
import { getCajaDashboard } from "@/lib/modulos/caja-menor/datos";
import { getOrgActiva } from "@/lib/core/org";
import { isRango, RANGOS } from "@/lib/shared/rango";

export const dynamic = "force-dynamic";

export default async function CajaDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ rango?: string }>;
}) {
  const { rango: rangoRaw } = await searchParams;
  const rango = isRango(rangoRaw) ? rangoRaw : "mes";

  const { org } = await getOrgActiva();
  const data = await getCajaDashboard(rango, org.id, org.nombre);

  const rangoLabel = RANGOS.find((r) => r.key === rango)!.label;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-nexus-ink">Caja Menor · {data.orgNombre}</h1>
          <p className="text-sm text-nexus-muted">{rangoLabel}</p>
        </div>
        <FiltroRango activo={rango} />
      </div>

      {/* Métricas */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Saldo actual"
          value={formatMoney(data.saldo)}
          tone={data.saldo < 0 ? "red" : "neutral"}
          footnote="efectivo en caja"
        />
        <StatCard label="Ingresos" value={formatMoney(data.ingresos)} tone="green" footnote={rangoLabel} />
        <StatCard label="Egresos" value={formatMoney(data.egresos)} tone="red" footnote={rangoLabel} />
        <StatCard label="Movimientos" value={String(data.movimientos)} footnote={rangoLabel} />
      </div>

      {/* Gráficas */}
      <div className="grid gap-4 lg:grid-cols-5">
        <CashFlowChart
          data={data.flujo}
          title="Flujo de caja"
          subtitle={`Entradas vs salidas · ${rangoLabel}`}
          className="lg:col-span-3"
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2 lg:grid-cols-1">
          <ExpenseDonut
            data={data.egresosPorCategoria}
            title="Egresos por categoría"
            subtitle={rangoLabel}
          />
        </div>
      </div>

      {/* Recientes */}
      <div className="rounded-xl border border-nexus-border bg-nexus-surface p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-nexus-ink">Últimos movimientos</h2>
          <Link
            href="/modulos/caja-menor/movimientos"
            className="flex items-center gap-1 text-sm font-medium text-nexus-gold-text hover:underline"
          >
            Ver todos <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {data.recientes.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-nexus-border bg-nexus-surface/50 px-4 py-6 text-center text-sm text-nexus-muted">
            Todavía no hay movimientos. Registrá el primero y la caja empieza a hablar sola.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-nexus-border/70">
            {data.recientes.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-2 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-nexus-ink">
                    {m.descripcion || m.categoria || (m.tipo === "INGRESO" ? "Ingreso" : "Egreso")}
                  </p>
                  <p className="truncate text-xs text-nexus-muted">
                    {m.categoria ?? "Sin categoría"} · {formatDate(m.fecha)}
                  </p>
                </div>
                <span
                  className={`shrink-0 text-sm font-semibold tabular-nums ${
                    m.tipo === "INGRESO" ? "text-nexus-green-text" : "text-nexus-red-text"
                  }`}
                >
                  {m.tipo === "INGRESO" ? "+" : "−"}
                  {formatMoney(m.monto)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* CTA cuando no hay nada todavía */}
      {data.movimientos === 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-nexus-gold/30 bg-nexus-gold-soft p-5">
          <CircleDollarSign className="mt-0.5 h-5 w-5 shrink-0 text-nexus-gold" />
          <div>
            <h3 className="text-sm font-semibold text-nexus-ink">Arrancá con la caja</h3>
            <p className="mt-1 text-sm text-nexus-muted">
              <Link
                href="/modulos/caja-menor/movimientos"
                className="font-medium text-nexus-gold-text hover:underline"
              >
                Registrá tu primer movimiento
              </Link>{" "}
              (una venta como ingreso, un gasto como egreso) y el saldo empieza a cuadrar solo.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}