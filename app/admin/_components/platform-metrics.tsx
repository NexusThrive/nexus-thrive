import { Building2, CheckCircle2, Layers, PauseCircle, Users } from "lucide-react";
import type { PlatformMetrics } from "@/lib/admin-db";
import { VERTICAL_LABELS } from "@/lib/admin-catalogs";

const ICON_TONES = {
  indigo: "bg-indigo-50 text-indigo-600",
  emerald: "bg-emerald-50 text-emerald-600",
  rose: "bg-rose-50 text-rose-600",
  slate: "bg-slate-100 text-slate-600",
} as const;

/**
 * Métricas globales de la plataforma: contadores puntuales de la DB (sin
 * tendencias — no hay serie histórica). Incluye el desglose de tenants
 * por cada vertical del catálogo (incluye las que van en 0).
 */
export default function PlatformMetrics({
  metrics,
}: {
  metrics: PlatformMetrics;
}) {
  const cards = [
    {
      title: "Negocios",
      value: metrics.totalTenants,
      description: "registrados en la plataforma",
      icon: Building2,
      tone: ICON_TONES.indigo,
    },
    {
      title: "Activos",
      value: metrics.activeTenants,
      description: "respondiendo vía subdominio",
      icon: CheckCircle2,
      tone: ICON_TONES.emerald,
    },
    {
      title: "Suspendidos",
      value: metrics.inactiveTenants,
      description: "acceso bloqueado",
      icon: PauseCircle,
      tone: ICON_TONES.rose,
    },
    {
      title: "Usuarios",
      value: metrics.totalUsers,
      description: "miembros en todos los negocios",
      icon: Users,
      tone: ICON_TONES.slate,
    },
  ];

  const maxByVertical = Math.max(
    1,
    ...metrics.tenantsByVertical.map((entry) => entry.count),
  );

  return (
    <section aria-label="Métricas de la plataforma" className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <article
            key={card.title}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-500">
                  {card.title}
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                  {card.value.toLocaleString("es-CO")}
                </p>
              </div>
              <span
                aria-hidden="true"
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${card.tone}`}
              >
                <card.icon className="h-5 w-5" />
              </span>
            </div>
            <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
              {card.description}
            </p>
          </article>
        ))}
      </div>

      <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-50 text-indigo-600">
            <Layers aria-hidden="true" className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Negocios por vertical
            </h2>
            <p className="text-xs text-slate-500">
              Distribución actual de la plataforma
            </p>
          </div>
        </div>

        <ul className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
          {metrics.tenantsByVertical.map((entry) => (
            <li
              key={entry.vertical}
              className="flex items-center gap-3 text-sm"
            >
              <span
                className="w-28 shrink-0 truncate text-slate-600"
                title={VERTICAL_LABELS[entry.vertical]}
              >
                {VERTICAL_LABELS[entry.vertical]}
              </span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                <span
                  className="block h-full rounded-full bg-indigo-500 transition-all"
                  style={{
                    width: `${Math.round((entry.count / maxByVertical) * 100)}%`,
                  }}
                />
              </span>
              <span className="w-8 shrink-0 text-right font-medium text-slate-900">
                {entry.count}
              </span>
            </li>
          ))}
        </ul>
      </article>
    </section>
  );
}
