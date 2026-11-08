"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CustomerAvatar } from "@/components/atoms/customer-avatar";
import type { PipelineCard, PipelineStage } from "@/lib/business/growth/pipeline-db";
import { ACTIVITY_LABEL, bogotaDay, cardChip, shortMoney, type ActivityKind } from "@/lib/business/growth/pipeline";
import { monthGrid } from "@/lib/business/scheduling/calendar";
import { cn } from "@/lib/utils";
import { ActivityChip } from "./pipeline-ui";

const DAY = new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", weekday: "long", day: "numeric", month: "long" });
const TIME = new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", hour: "numeric", minute: "2-digit" });
const MONTH = new Intl.DateTimeFormat("es-CO", { month: "long", year: "numeric", timeZone: "UTC" });

/** Lista a todo el ancho (como Contactos): las mismas oportunidades y filtros del tablero. */
export function ListView({ slug, cards, stages, now }: { slug: string; cards: PipelineCard[]; stages: PipelineStage[]; now: number }) {
  const stageName = new Map(stages.map((s) => [s.id, s.name]));
  const head = "h-[38px] px-5 text-left text-xs font-medium text-muted-foreground";
  return (
    <div className="border-b border-border">
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[900px] text-sm">
          <caption className="sr-only">Oportunidades</caption>
          <thead className="sticky top-0 z-(--z-sticky) bg-background">
            <tr className="border-b border-border">
              <th scope="col" className={head}>Oportunidad</th>
              <th scope="col" className={head}>Cliente</th>
              <th scope="col" className={head}>Etapa</th>
              <th scope="col" className={cn(head, "text-right")}>Valor</th>
              <th scope="col" className={cn(head, "text-right")}>Probabilidad</th>
              <th scope="col" className={head}>Próxima actividad</th>
              <th scope="col" className={head}>Responsable</th>
            </tr>
          </thead>
          <tbody>
            {cards.map((c) => (
              <tr key={c.id} className="h-[38px] border-b border-border/60 last:border-b-0 hover:bg-surface-muted/60">
                <td className="px-5">
                  <Link href={`/${slug}/crm/oportunidades/${c.id}`} className="font-medium text-foreground outline-none hover:text-accent-text focus-visible:outline-2 focus-visible:outline-ring">
                    {c.name}
                  </Link>
                </td>
                <td className="px-5 text-muted-foreground">
                  <span className="flex items-center gap-2">
                    {c.customer ? <CustomerAvatar identity={c.customer} className="size-5 rounded-md" /> : null}
                    <span className="truncate">{c.customer?.name ?? "—"}</span>
                  </span>
                </td>
                <td className="px-5 text-muted-foreground">{stageName.get(c.stageId)}</td>
                <td className="px-5 text-right tabular-nums text-foreground">{shortMoney(c.value)}</td>
                <td className="px-5 text-right tabular-nums text-muted-foreground">{c.probability} %</td>
                <td className="px-5">
                  <ActivityChip chip={cardChip(c, now)} />
                </td>
                <td className="px-5 text-muted-foreground">{c.owner?.name ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="md:hidden">
        {cards.map((c) => (
          <li key={c.id} className="border-b border-border/60 last:border-b-0">
            <Link href={`/${slug}/crm/oportunidades/${c.id}`} className="flex items-center gap-3 px-5 py-2.5">
              {c.customer ? <CustomerAvatar identity={c.customer} className="size-8 shrink-0 rounded-md" /> : null}
              <span className="grid min-w-0 flex-1 gap-0.5">
                <span className="truncate text-sm font-medium text-foreground">{c.name}</span>
                <span className="truncate text-xs text-muted-foreground">{[c.customer?.name, stageName.get(c.stageId)].filter(Boolean).join(" · ")}</span>
              </span>
              <span className="shrink-0 text-sm tabular-nums text-foreground">{shortMoney(c.value)}</span>
            </Link>
          </li>
        ))}
      </ul>
      {cards.length === 0 ? <p className="px-5 py-10 text-center text-sm text-muted-foreground">No hay oportunidades con estos filtros.</p> : null}
    </div>
  );
}

/** Calendario por cierre previsto: un mes, con las oportunidades en su día. `month` es «AAAA-MM». */
export function CalendarView({ slug, cards, month, monthHref, now }: { slug: string; cards: PipelineCard[]; month: string; monthHref: (m: string) => string; now: number }) {
  const [y, m] = month.split("-").map(Number) as [number, number];
  const weeks = monthGrid(y, m);
  const byDay = new Map<string, PipelineCard[]>();
  for (const c of cards) if (c.expectedClose) byDay.set(c.expectedClose, [...(byDay.get(c.expectedClose) ?? []), c]);
  const shift = (d: number) => {
    const t = new Date(Date.UTC(y, m - 1 + d, 1));
    return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}`;
  };
  const today = bogotaDay(now);
  const withoutDate = cards.filter((c) => !c.expectedClose).length;
  return (
    <div className="grid gap-3 px-5 pb-12">
      <div className="flex items-center gap-2">
        <Link href={monthHref(shift(-1))} aria-label="Mes anterior" className="grid size-[34px] place-items-center rounded-lg border border-border hover:border-accent">
          <ChevronLeft aria-hidden="true" className="size-4" />
        </Link>
        <h2 className="min-w-40 text-center text-base font-semibold capitalize text-foreground">{MONTH.format(new Date(Date.UTC(y, m - 1, 1)))}</h2>
        <Link href={monthHref(shift(1))} aria-label="Mes siguiente" className="grid size-[34px] place-items-center rounded-lg border border-border hover:border-accent">
          <ChevronRight aria-hidden="true" className="size-4" />
        </Link>
        <p className="ms-auto text-xs text-muted-foreground">Por cierre previsto{withoutDate ? ` · ${withoutDate} sin fecha` : ""}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] table-fixed border-collapse text-xs">
          <caption className="sr-only">Oportunidades por cierre previsto</caption>
          <thead>
            <tr>
              {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
                <th key={d} scope="col" className="pb-2 text-left font-medium text-muted-foreground">
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((week, i) => (
              <tr key={i}>
                {week.map(({ day, inMonth }) => (
                  <td key={day} className={cn("h-24 border border-border/60 p-1.5 align-top", !inMonth && "bg-surface-muted/40")}>
                    <span className={cn("mb-1 inline-grid size-6 place-items-center rounded-md", day === today ? "bg-accent-subtle font-semibold text-accent-text" : inMonth ? "text-foreground" : "text-muted-foreground")}>{Number(day.slice(8))}</span>
                    <ul className="grid gap-1">
                      {(byDay.get(day) ?? []).slice(0, 3).map((c) => (
                        <li key={c.id}>
                          <Link href={`/${slug}/crm/oportunidades/${c.id}`} className="block truncate rounded-md border border-border bg-card px-1.5 py-1 text-foreground hover:border-accent">
                            {c.name} · {shortMoney(c.value)}
                          </Link>
                        </li>
                      ))}
                      {(byDay.get(day)?.length ?? 0) > 3 ? <li className="text-muted-foreground">+{byDay.get(day)!.length - 3} más</li> : null}
                    </ul>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Gráfico: embudo por etapa (cantidad y valor) y previsión por mes de cierre (valor × probabilidad). */
export function ChartView({ cards, stages }: { cards: PipelineCard[]; stages: PipelineStage[] }) {
  const funnel = stages.map((s) => {
    const list = cards.filter((c) => c.stageId === s.id);
    return { name: s.name, count: list.length, value: list.reduce((t, c) => t + c.value, 0) };
  });
  const maxValue = Math.max(1, ...funnel.map((f) => f.value));
  const months = new Map<string, number>();
  for (const c of cards.filter((c) => !c.won && c.expectedClose)) months.set(c.expectedClose!.slice(0, 7), (months.get(c.expectedClose!.slice(0, 7)) ?? 0) + (c.value * c.probability) / 100);
  const forecast = [...months.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(0, 12);
  const maxForecast = Math.max(1, ...forecast.map(([, v]) => v));
  return (
    <div className="grid gap-4 px-5 pb-12 lg:grid-cols-2">
      <section aria-labelledby="crm-embudo" className="rounded-xl border border-border bg-card p-[22px]">
        <h2 id="crm-embudo" className="mb-4 text-base font-semibold text-foreground">Embudo por etapa</h2>
        <ul className="grid gap-3">
          {funnel.map((f) => (
            <li key={f.name} className="grid gap-1">
              <span className="flex justify-between text-xs text-muted-foreground">
                <span>
                  {f.name} · {f.count}
                </span>
                <span className="tabular-nums text-foreground">{shortMoney(f.value)}</span>
              </span>
              <span className="h-2 overflow-hidden rounded-sm bg-surface-muted">
                <i className="block h-full rounded-sm bg-accent" style={{ width: `${(f.value / maxValue) * 100}%` }} />
              </span>
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="crm-prevision" className="rounded-xl border border-border bg-card p-[22px]">
        <h2 id="crm-prevision" className="mb-1 text-base font-semibold text-foreground">Previsión de ingresos</h2>
        <p className="mb-4 text-xs text-muted-foreground">Valor × probabilidad, por mes de cierre previsto</p>
        {forecast.length ? (
          <ul className="grid gap-3">
            {forecast.map(([month, v]) => (
              <li key={month} className="grid gap-1">
                <span className="flex justify-between text-xs capitalize text-muted-foreground">
                  <span>{MONTH.format(new Date(`${month}-01T12:00:00Z`))}</span>
                  <span className="tabular-nums text-foreground">{shortMoney(Math.round(v))}</span>
                </span>
                <span className="h-2 overflow-hidden rounded-sm bg-surface-muted">
                  <i className="block h-full rounded-sm bg-success" style={{ width: `${(v / maxForecast) * 100}%` }} />
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Ponle cierre previsto a tus oportunidades para ver la previsión.</p>
        )}
      </section>
    </div>
  );
}

export type ActivityItem = { id: string; kind: ActivityKind; title: string; dueAt: string; opportunityId: string; opportunity: string };

/** Actividades pendientes agrupadas por día (vencidas primero). */
export function ActivitiesView({ slug, items, onDone, pendingIds, now }: { slug: string; items: ActivityItem[]; onDone: (id: string) => void; pendingIds: ReadonlySet<string>; now: number }) {
  const today = bogotaDay(now);
  const groups = new Map<string, ActivityItem[]>();
  for (const a of items) {
    const day = bogotaDay(new Date(a.dueAt).getTime());
    const key = day < today ? "vencidas" : day;
    groups.set(key, [...(groups.get(key) ?? []), a]);
  }
  if (!items.length) return <p className="px-5 py-10 text-center text-sm text-muted-foreground">No hay actividades pendientes.</p>;
  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6 px-5 pb-12">
      {[...groups.entries()].map(([key, list]) => (
        <section key={key} aria-label={key === "vencidas" ? "Vencidas" : DAY.format(new Date(`${key}T17:00:00Z`))}>
          <h2 className={cn("mb-2 text-2xs font-semibold uppercase tracking-[0.09em]", key === "vencidas" ? "text-danger" : "text-muted-foreground")}>
            {key === "vencidas" ? "Vencidas" : key === today ? `Hoy · ${DAY.format(new Date(`${key}T17:00:00Z`))}` : DAY.format(new Date(`${key}T17:00:00Z`))}
          </h2>
          <ul className="divide-y divide-border/60 rounded-xl border border-border bg-card">
            {list.map((a) => (
              <li key={a.id} className="flex items-center gap-3 px-4 py-3">
                <span className="grid min-w-0 flex-1 gap-0.5">
                  <span className="truncate text-sm text-foreground">
                    {ACTIVITY_LABEL[a.kind]} · {a.title}
                  </span>
                  <Link href={`/${slug}/crm/oportunidades/${a.opportunityId}`} className="truncate text-xs text-muted-foreground hover:text-accent-text">
                    {a.opportunity} · {TIME.format(new Date(a.dueAt))}
                  </Link>
                </span>
                <button type="button" disabled={pendingIds.has(a.id)} onClick={() => onDone(a.id)} className="h-8 shrink-0 rounded-lg border border-border px-3 text-xs text-foreground hover:border-accent disabled:opacity-60">
                  Marcar hecha
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

