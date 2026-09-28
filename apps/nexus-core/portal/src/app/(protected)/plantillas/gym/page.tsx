import Link from "next/link";
import { ArrowUpRight, CircleDollarSign } from "lucide-react";
import { StatCard } from "@nexus/ui";
import { CashFlowChart } from "@/components/shared/charts/CashFlowChart";
import { ExpenseDonut } from "@/components/shared/charts/ExpenseDonut";
import { FiltroRango } from "@/components/shared/FiltroRango";
import { TourInicial } from "@/components/core/TourInicial";
import { crearFormatos } from "@/lib/shared/format";
import { getGymDashboard, isRango, RANGOS } from "@/lib/plantillas/gym/dashboard";
import { getOrgActiva } from "@/lib/core/org";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ rango?: string; tour?: string }>;
}) {
  const { rango: rangoRaw, tour } = await searchParams;
  const rango = isRango(rangoRaw) ? rangoRaw : "semana";

  const { org } = await getOrgActiva();

  // La moneda y el país los persiste el onboarding: el formato sigue a la org,
  // no a constantes del código.
  const presentacion = { moneda: org.moneda, pais: org.pais };

  const { formatMoney, formatDate } = crearFormatos(presentacion);

  const data = await getGymDashboard(rango, org.id, org.nombre);

  const rangoLabel = RANGOS.find((r) => r.key === rango)!.label;

  return (
    <div className="space-y-6">
      {/* Guía post-onboarding (side-out) */}
      <TourInicial abrir={tour === "1"} />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-nexus-ink">Dashboard · {data.orgNombre}</h1>
          <p className="text-sm text-nexus-muted">{rangoLabel}</p>
        </div>
        <FiltroRango activo={rango} />
      </div>

      {/* Métricas */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Ingresos" value={formatMoney(data.ingresos)} tone="green" footnote={rangoLabel} />
        <StatCard label="Gastos" value={formatMoney(data.gastos)} tone="red" footnote={rangoLabel} />
        <StatCard
          label="Balance"
          value={formatMoney(data.balance)}
          tone={data.balance >= 0 ? "neutral" : "red"}
          footnote={rangoLabel}
        />
        <StatCard label="Socios activos" value={String(data.sociosActivos)} footnote="hoy" />
        <StatCard label="Vencidos" value={String(data.sociosVencidos)} tone={data.sociosVencidos > 0 ? "red" : "neutral"} footnote="hoy" />
      </div>

      {/* Gráficas */}
      <div className="grid gap-4 lg:grid-cols-5">
        <CashFlowChart
          data={data.flujo}
          presentacion={presentacion}
          title="Flujo de efectivo"
          subtitle={`Ingresos vs egresos · ${rangoLabel}`}
          className="lg:col-span-3"
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2 lg:grid-cols-1">
          <ExpenseDonut
            data={data.egresosPorCategoria}
            presentacion={presentacion}
            title="Egresos por categoría"
            subtitle={rangoLabel}
          />
          <ExpenseDonut
            data={data.pagosPorMetodo}
            presentacion={presentacion}
            title="Pagos por método"
            subtitle={rangoLabel}
          />
        </div>
      </div>

      {/* Vencimientos próximos */}
      <div className="rounded-xl border border-nexus-border bg-nexus-surface p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-nexus-ink">Renovaciones próximas (7 días)</h2>
          <Link href="/plantillas/gym/pagos" className="flex items-center gap-1 text-sm font-medium text-nexus-gold-text hover:underline">
            Cobrar <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {data.porVencer.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-nexus-border bg-nexus-surface/50 px-4 py-6 text-center text-sm text-nexus-muted">
            Nadie por vencer esta semana
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-nexus-border/70">
            {data.porVencer.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2.5">
                {/* Ruta RELATIVA a propósito: esta página vive en
                    /plantillas/gym, así que `clientes/${id}` resuelve a
                    /plantillas/gym/clientes/${id}. La versión anterior
                    hardcodeaba `/clientes/${id}` → 404 en el link más usado
                    del dashboard ("Renovaciones próximas"). Relativa, no se
                    rompe si la plantilla cambia de base. */}
                <Link href={`clientes/${p.id}`} className="font-medium text-nexus-ink hover:underline">
                  {p.nombre}
                </Link>
                <span className="text-sm text-nexus-muted">{formatDate(p.vence)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* CTA cuando no hay nada todavía */}
      {data.ingresos === 0 && data.sociosActivos === 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-nexus-gold/30 bg-nexus-gold-soft p-5">
          <CircleDollarSign className="mt-0.5 h-5 w-5 shrink-0 text-nexus-gold" />
          <div>
            <h3 className="text-sm font-semibold text-nexus-ink">Arrancá con lo básico</h3>
            <p className="mt-1 text-sm text-nexus-muted">
              <Link href="/plantillas/gym/clientes" className="font-medium text-nexus-gold-text hover:underline">
                Registrá tu primer cliente
              </Link>{" "}
              y cobrale su membresía: el dashboard empieza a contar solo, sin digitar nada a mano.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}