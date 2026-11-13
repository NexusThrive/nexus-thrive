import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireTenantContext } from "@/lib/core/tenancy/context";
import { crmReports } from "@/lib/business/growth/pipeline-read";
import { shortMoney } from "@/lib/business/growth/pipeline";
import { PageHeader } from "@/components/molecules/page-header";
import { EmptyState } from "@/components/molecules/empty-state";
import { HatchBars, Widget, WidgetHead, WidgetValue, widgetRow } from "@/components/widgets/widget";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Informes del CRM" };

const MONTH = new Intl.DateTimeFormat("es-CO", { month: "long", year: "numeric", timeZone: "UTC" });
const MONTH_SHORT = new Intl.DateTimeFormat("es-CO", { month: "short", timeZone: "UTC" });

/** Barra redondeada proporcional (decorativa: el dato va escrito al lado). */
function Bar({ pct, tone = "bg-accent" }: { pct: number; tone?: string }) {
  return (
    <span aria-hidden="true" className="block h-3 overflow-hidden rounded-full bg-card">
      <i className={cn("block h-full rounded-full", tone)} style={{ width: `${Math.max(pct > 0 ? 3 : 0, Math.min(100, pct))}%` }} />
    </span>
  );
}

/** App CRM › Informes: cifras clave, embudo por etapa, motivos de pérdida, previsión por mes y actividad por responsable. */
export default async function CrmReportsPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const ctx = await requireTenantContext(tenant, "/crm/informes");
  if (!ctx) notFound();
  const r = await crmReports(ctx.tenantId);
  const maxFunnel = Math.max(1, ...r.funnel.map((f) => f.value));
  const closed = r.closed.won.count + r.closed.lost.count;
  const winRate = closed ? Math.round((r.closed.won.count / closed) * 100) : null;
  const open = r.funnel.reduce((t, f) => t + f.count, 0);
  const pipelineValue = r.funnel.reduce((t, f) => t + f.value, 0);
  const expected = r.forecast.reduce((t, f) => t + f.weighted, 0);
  const kpis: { label: string; value: string; note: string; accent?: boolean }[] = [
    { label: "En el pipeline", value: shortMoney(pipelineValue), note: `${open} ${open === 1 ? "oportunidad abierta" : "oportunidades abiertas"}`, accent: true },
    { label: "Ganadas", value: String(r.closed.won.count), note: shortMoney(r.closed.won.value) },
    { label: "Perdidas", value: String(r.closed.lost.count), note: shortMoney(r.closed.lost.value) },
    { label: "Tasa de cierre", value: winRate == null ? "—" : `${winRate} %`, note: closed ? `de ${closed} cerradas` : "Aún sin cierres" },
  ];
  return (
    <div data-bleed="" className="grid gap-5 px-6 pb-8 pt-6">
      <PageHeader title="Informes" description="Cómo avanza tu pipeline: qué hay en cada etapa, qué se gana y qué se pierde, y cuánto puede entrar." />

      <section aria-label="Cifras clave" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <Widget key={k.label} variant={k.accent ? "accent" : "default"} className="nx-rise gap-3">
            <p className={cn("text-xs font-medium", k.accent ? "text-ink/70" : "text-muted-foreground")}>{k.label}</p>
            <WidgetValue>{k.value}</WidgetValue>
            <p className={cn("text-xs tabular-nums", k.accent ? "text-ink/70" : "text-muted-foreground")}>{k.note}</p>
          </Widget>
        ))}
      </section>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Widget aria-labelledby="inf-embudo" className="nx-rise">
          <WidgetHead id="inf-embudo" title="Embudo por etapa" subtitle="Cuánto dinero hay en cada etapa abierta" />
          {open === 0 ? (
            <EmptyState mark="center" remember={false} title="Aún no hay oportunidades abiertas" description="Cuando crees oportunidades en el pipeline, verás aquí cuánto hay en cada etapa." />
          ) : (
            <ul className="grid gap-2.5">
              {r.funnel.map((f) => (
                <li key={f.stage} className={cn(widgetRow, "grid gap-2")}>
                  <span className="flex items-baseline justify-between gap-3 text-ui">
                    <span className="font-medium text-foreground">{f.stage}</span>
                    <span className="tabular-nums font-semibold text-foreground">{shortMoney(f.value)}</span>
                  </span>
                  <Bar pct={(f.value / maxFunnel) * 100} />
                  <span className="text-xs text-muted-foreground">
                    {f.count} {f.count === 1 ? "oportunidad" : "oportunidades"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Widget>

        <Widget aria-labelledby="inf-cerradas" className="nx-rise">
          <WidgetHead id="inf-cerradas" title="Por qué se pierden" subtitle="Los motivos que más se repiten" />
          {r.closed.reasons.length ? (
            <ul className="grid gap-2.5">
              {r.closed.reasons.map((x) => (
                <li key={x.reason} className={cn(widgetRow, "grid gap-2")}>
                  <span className="flex items-baseline justify-between gap-3 text-ui">
                    <span className="font-medium text-foreground">{x.reason}</span>
                    <span className="tabular-nums text-muted-foreground">{x.count}</span>
                  </span>
                  <Bar pct={(x.count / r.closed.lost.count) * 100} tone="bg-danger/70" />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState mark="center" remember={false} title="Aún no hay oportunidades perdidas" description="Cuando pierdas una y anotes el motivo, aparecerá aquí para que aprendas de ella." />
          )}
        </Widget>

        <Widget aria-labelledby="inf-prevision" className="nx-rise">
          <WidgetHead id="inf-prevision" title="Previsión de ingresos por mes" subtitle={r.forecast.length ? `Valor × probabilidad de las abiertas · ${shortMoney(expected)} esperados` : "Valor × probabilidad de las abiertas, por mes de cierre previsto"} />
          {r.forecast.length ? (
            <HatchBars
              ariaLabel="Previsión de ingresos por mes"
              values={r.forecast.map((f) => f.weighted)}
              labels={r.forecast.map((f) => MONTH_SHORT.format(new Date(`${f.month}-01T12:00:00Z`)))}
              format={shortMoney}
            />
          ) : (
            <EmptyState mark="center" remember={false} title="Sin previsión todavía" description="Ponle cierre previsto a tus oportunidades para ver cuánto puede entrar cada mes." />
          )}
          {r.forecast.length ? (
            <ul className="grid gap-1.5 text-xs text-muted-foreground">
              {r.forecast.map((f) => (
                <li key={f.month} className="flex justify-between gap-3">
                  <span className="capitalize">{MONTH.format(new Date(`${f.month}-01T12:00:00Z`))}</span>
                  <span className="tabular-nums">
                    <b className="font-semibold text-foreground">{shortMoney(f.weighted)}</b> de {shortMoney(f.total)}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </Widget>

        <Widget aria-labelledby="inf-responsables" className="nx-rise">
          <WidgetHead id="inf-responsables" title="Actividad por responsable" subtitle="Actividades del CRM de cada persona" />
          {r.byOwner.length ? (
            <ul className="grid gap-2.5">
              {r.byOwner.map((o) => (
                <li key={o.owner} className={cn(widgetRow, "flex flex-wrap items-center justify-between gap-3")}>
                  <span className="flex min-w-0 items-center gap-3">
                    <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-card text-xs font-semibold text-foreground">
                      {o.owner.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
                    </span>
                    <span className="truncate text-ui font-medium text-foreground">{o.owner}</span>
                  </span>
                  <span className="flex flex-wrap gap-1.5 text-xs">
                    <span className="rounded-full bg-card px-3 py-1 tabular-nums text-foreground">{o.open} pendientes</span>
                    <span className={cn("rounded-full px-3 py-1 tabular-nums", o.overdue ? "bg-danger/10 font-medium text-danger" : "bg-card text-muted-foreground")}>{o.overdue} vencidas</span>
                    <span className="rounded-full bg-card px-3 py-1 tabular-nums text-muted-foreground">{o.done} hechas</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState mark="center" remember={false} title="Aún no hay actividades programadas" description="Programa llamadas y reuniones desde las oportunidades y verás aquí quién lleva qué." />
          )}
        </Widget>
      </div>
    </div>
  );
}
