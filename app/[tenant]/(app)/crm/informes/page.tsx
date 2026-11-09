import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireTenantContext } from "@/lib/core/tenancy/context";
import { crmReports } from "@/lib/business/growth/pipeline-read";
import { shortMoney } from "@/lib/business/growth/pipeline";

export const metadata: Metadata = { title: "Informes del CRM" };

const card = "rounded-xl border border-border bg-card p-[22px]";
const MONTH = new Intl.DateTimeFormat("es-CO", { month: "long", year: "numeric", timeZone: "UTC" });

/** Barra horizontal proporcional (decorativa: el dato va escrito al lado). */
function Bar({ pct, tone = "bg-accent" }: { pct: number; tone?: string }) {
  return (
    <span aria-hidden="true" className="block h-2 overflow-hidden rounded-sm bg-surface-muted">
      <i className={`block h-full rounded-sm ${tone}`} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </span>
  );
}

/** App CRM › Informes: embudo por etapa, ganadas y perdidas (con motivos), previsión de ingresos por mes y actividad por responsable. */
export default async function CrmReportsPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const ctx = await requireTenantContext(tenant, "/crm/informes");
  if (!ctx) notFound();
  const r = await crmReports(ctx.tenantId);
  const maxFunnel = Math.max(1, ...r.funnel.map((f) => f.value));
  const maxForecast = Math.max(1, ...r.forecast.map((f) => f.total));
  const closed = r.closed.won.count + r.closed.lost.count;
  const winRate = closed ? Math.round((r.closed.won.count / closed) * 100) : null;
  return (
    <div data-bleed="" className="flex flex-col">
      <header className="mx-auto grid w-full max-w-[1240px] gap-1 px-5 pb-2 pt-5">
        <h1 className="text-lg font-medium text-foreground">Informes</h1>
        <p className="text-xs text-muted-foreground">Cómo avanza tu pipeline: qué hay en cada etapa, qué se gana y qué se pierde, y cuánto puede entrar.</p>
      </header>
      <div className="mx-auto grid w-full max-w-[1240px] gap-4 px-5 pb-2 pt-2 lg:grid-cols-2">
        <section aria-labelledby="inf-embudo" className={card}>
          <h2 id="inf-embudo" className="mb-4 text-base font-semibold text-foreground">Embudo por etapa</h2>
          <ul className="grid gap-3">
            {r.funnel.map((f) => (
              <li key={f.stage} className="grid gap-1">
                <span className="flex justify-between text-xs text-muted-foreground">
                  <span>{f.stage} · {f.count} {f.count === 1 ? "oportunidad" : "oportunidades"}</span>
                  <span className="tabular-nums text-foreground">{shortMoney(f.value)}</span>
                </span>
                <Bar pct={(f.value / maxFunnel) * 100} />
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="inf-cerradas" className={card}>
          <h2 id="inf-cerradas" className="mb-4 text-base font-semibold text-foreground">Ganadas y perdidas</h2>
          <dl className="mb-4 grid grid-cols-3 gap-3">
            <div className="rounded-[10px] border border-border bg-background px-3.5 py-3">
              <dt className="text-xs text-muted-foreground">Ganadas</dt>
              <dd className="text-2xl font-semibold text-foreground tabular-nums">{r.closed.won.count}</dd>
              <dd className="text-xs text-muted-foreground tabular-nums">{shortMoney(r.closed.won.value)}</dd>
            </div>
            <div className="rounded-[10px] border border-border bg-background px-3.5 py-3">
              <dt className="text-xs text-muted-foreground">Perdidas</dt>
              <dd className="text-2xl font-semibold text-foreground tabular-nums">{r.closed.lost.count}</dd>
              <dd className="text-xs text-muted-foreground tabular-nums">{shortMoney(r.closed.lost.value)}</dd>
            </div>
            <div className="rounded-[10px] border border-border bg-background px-3.5 py-3">
              <dt className="text-xs text-muted-foreground">Tasa de cierre</dt>
              <dd className="text-2xl font-semibold text-foreground tabular-nums">{winRate == null ? "—" : `${winRate} %`}</dd>
            </div>
          </dl>
          <h3 className="mb-2 text-xs font-medium text-muted-foreground">Por qué se pierden</h3>
          {r.closed.reasons.length ? (
            <ul className="grid gap-2">
              {r.closed.reasons.map((x) => (
                <li key={x.reason} className="grid gap-1">
                  <span className="flex justify-between text-xs text-muted-foreground">
                    <span>{x.reason}</span>
                    <span className="tabular-nums text-foreground">{x.count}</span>
                  </span>
                  <Bar pct={(x.count / r.closed.lost.count) * 100} tone="bg-danger" />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Aún no hay oportunidades perdidas.</p>
          )}
        </section>

        <section aria-labelledby="inf-prevision" className={card}>
          <h2 id="inf-prevision" className="mb-1 text-base font-semibold text-foreground">Previsión de ingresos por mes</h2>
          <p className="mb-4 text-xs text-muted-foreground">Valor × probabilidad de las abiertas, por mes de cierre previsto</p>
          {r.forecast.length ? (
            <ul className="grid gap-3">
              {r.forecast.map((f) => (
                <li key={f.month} className="grid gap-1">
                  <span className="flex justify-between text-xs capitalize text-muted-foreground">
                    <span>{MONTH.format(new Date(`${f.month}-01T12:00:00Z`))}</span>
                    <span className="tabular-nums text-foreground">{shortMoney(f.weighted)} de {shortMoney(f.total)}</span>
                  </span>
                  <Bar pct={(f.weighted / maxForecast) * 100} tone="bg-success" />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Ponle cierre previsto a tus oportunidades para ver la previsión.</p>
          )}
        </section>

        <section aria-labelledby="inf-responsables" className={card}>
          <h2 id="inf-responsables" className="mb-4 text-base font-semibold text-foreground">Actividad por responsable</h2>
          {r.byOwner.length ? (
            <table className="w-full text-sm">
              <caption className="sr-only">Actividades del CRM por responsable</caption>
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th scope="col" className="pb-2 font-medium">Responsable</th>
                  <th scope="col" className="pb-2 text-right font-medium">Pendientes</th>
                  <th scope="col" className="pb-2 text-right font-medium">Vencidas</th>
                  <th scope="col" className="pb-2 text-right font-medium">Hechas</th>
                </tr>
              </thead>
              <tbody>
                {r.byOwner.map((o) => (
                  <tr key={o.owner} className="border-b border-border/60 last:border-b-0">
                    <td className="py-2 text-foreground">{o.owner}</td>
                    <td className="py-2 text-right tabular-nums text-foreground">{o.open}</td>
                    <td className={`py-2 text-right tabular-nums ${o.overdue ? "text-danger" : "text-muted-foreground"}`}>{o.overdue}</td>
                    <td className="py-2 text-right tabular-nums text-muted-foreground">{o.done}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-muted-foreground">Aún no hay actividades programadas.</p>
          )}
        </section>
      </div>
    </div>
  );
}
