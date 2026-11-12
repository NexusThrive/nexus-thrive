"use client";

import Link from "next/link";
import { CalendarDays, ChartColumn, ChevronLeft, ChevronRight, Clock, List, Plus } from "lucide-react";
import { buttonVariants } from "@/components/atoms/button-variants";
import { CustomerAvatar } from "@/components/atoms/customer-avatar";
import { EmptyState } from "@/components/molecules/empty-state";
import type { PipelineCard, PipelineStage } from "@/lib/business/growth/pipeline-db";
import { ACTIVITY_LABEL, bogotaDay, cardChip, shortMoney, type ActivityKind } from "@/lib/business/growth/pipeline";
import { monthGrid } from "@/lib/business/scheduling/calendar";
import { cn } from "@/lib/utils";
import { ActivityChip } from "./pipeline-ui";

const DAY = new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", weekday: "long", day: "numeric", month: "long" });
const TIME = new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", hour: "numeric", minute: "2-digit" });
const MONTH = new Intl.DateTimeFormat("es-CO", { month: "long", year: "numeric", timeZone: "UTC" });

const cta = cn(buttonVariants({ variant: "accent" }), "h-11 rounded-full px-6 text-sm font-semibold");
const widget = "rounded-(--radius-widget) border border-border/60 bg-card p-6";

/** Botón de las vistas vacías: lleva a crear la primera oportunidad (o una nueva). */
function CreateButton({ onCreate }: { onCreate?: () => void }) {
  return onCreate ? (
    <button type="button" onClick={onCreate} className={cta}>
      <Plus aria-hidden="true" className="size-4" strokeWidth={2.2} />
      Nueva oportunidad
    </button>
  ) : undefined;
}

/**
 * Lista a todo el ancho (como Clientes): las mismas oportunidades y filtros del tablero, con filas altas, avatares redondos y etapa y valor en
 * píldoras. Pulsar una fila abre su panel lateral con el detalle.
 */
export function ListView({ cards, stages, now, onOpen, onCreate }: { cards: PipelineCard[]; stages: PipelineStage[]; now: number; onOpen: (card: PipelineCard) => void; onCreate?: () => void }) {
  const stageName = new Map(stages.map((s) => [s.id, s.name]));
  const head = "h-12 px-6 text-left text-xs font-medium text-muted-foreground";
  if (cards.length === 0) {
    return (
      <div className="px-6 pb-12">
        <EmptyState
          mark="center"
          remember={false}
          icon={<List />}
          title="No hay oportunidades aquí"
          description="Cambia la búsqueda o los filtros, o crea una nueva oportunidad para empezar el seguimiento."
          action={<CreateButton onCreate={onCreate} />}
          className="rounded-(--radius-widget) border border-border/60 bg-card py-16"
        />
      </div>
    );
  }
  return (
    <div className="border-b border-border/50">
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[960px] text-sm">
          <caption className="sr-only">Oportunidades</caption>
          <thead className="sticky top-0 z-(--z-sticky) bg-background md:bg-card">
            <tr className="border-b border-border/50">
              <th scope="col" className={head}>Oportunidad</th>
              <th scope="col" className={head}>Cliente</th>
              <th scope="col" className={head}>Etapa</th>
              <th scope="col" className={cn(head, "text-right")}>Valor</th>
              <th scope="col" className={cn(head, "text-right")}>Probabilidad</th>
              <th scope="col" className={head}>Próxima actividad</th>
              <th scope="col" className={head}>Responsable</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {cards.map((c) => (
              <tr key={c.id} onClick={() => onOpen(c)} className="h-[60px] cursor-pointer transition-colors hover:bg-surface-muted">
                <td className="px-6">
                  <button type="button" onClick={(e) => { e.stopPropagation(); onOpen(c); }} aria-haspopup="dialog" className="rounded-full text-left font-medium text-foreground outline-none hover:text-accent-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                    {c.name}
                  </button>
                </td>
                <td className="px-6 text-muted-foreground">
                  <span className="flex items-center gap-2.5">
                    {c.customer ? <CustomerAvatar identity={c.customer} className="size-8 rounded-full" /> : null}
                    <span className="truncate">{c.customer?.name ?? ""}</span>
                  </span>
                </td>
                <td className="px-6">
                  <span className="rounded-full bg-surface-muted px-3 py-1 text-xs font-medium text-foreground">{stageName.get(c.stageId)}</span>
                </td>
                <td className="px-6 text-right font-semibold tabular-nums text-foreground">{shortMoney(c.value)}</td>
                <td className="px-6 text-right tabular-nums text-muted-foreground">{c.probability} %</td>
                <td className="px-6">
                  <ActivityChip chip={cardChip(c, now)} />
                </td>
                <td className="px-6 text-muted-foreground">{c.owner?.name ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="grid gap-2 p-4 md:hidden">
        {cards.map((c) => (
          <li key={c.id}>
            <button type="button" onClick={() => onOpen(c)} aria-haspopup="dialog" className="flex w-full items-center gap-3 rounded-3xl bg-surface-muted/60 px-4 py-3.5 text-left outline-none focus-visible:outline-2 focus-visible:outline-ring">
              {c.customer ? <CustomerAvatar identity={c.customer} className="size-10 shrink-0 rounded-full" /> : null}
              <span className="grid min-w-0 flex-1 gap-0.5">
                <span className="truncate text-sm font-medium text-foreground">{c.name}</span>
                <span className="truncate text-xs text-muted-foreground">{[c.customer?.name, stageName.get(c.stageId)].filter(Boolean).join(" · ")}</span>
              </span>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">{shortMoney(c.value)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Calendario por cierre previsto: un mes, con las oportunidades en su día. `month` es «AAAA-MM». */
export function CalendarView({ cards, month, monthHref, now, onOpen, onCreate }: { cards: PipelineCard[]; month: string; monthHref: (m: string) => string; now: number; onOpen: (card: PipelineCard) => void; onCreate?: () => void }) {
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
  if (cards.length === 0) {
    return (
      <div className="px-6 pb-12">
        <EmptyState
          mark="center"
          remember={false}
          icon={<CalendarDays />}
          title="Aún no hay cierres previstos"
          description="Ponle fecha de cierre a tus oportunidades y las verás aquí, día por día."
          action={<CreateButton onCreate={onCreate} />}
          className="rounded-(--radius-widget) border border-border/60 bg-card py-16"
        />
      </div>
    );
  }
  return (
    <div className="grid gap-4 px-6 pb-12">
      <div className="flex items-center gap-2">
        <Link href={monthHref(shift(-1))} aria-label="Mes anterior" className="grid size-11 place-items-center rounded-full bg-surface-muted outline-none transition-colors hover:bg-accent-subtle focus-visible:outline-2 focus-visible:outline-ring">
          <ChevronLeft aria-hidden="true" className="size-4" />
        </Link>
        <h2 className="min-w-44 text-center font-display text-lg font-medium capitalize text-foreground">{MONTH.format(new Date(Date.UTC(y, m - 1, 1)))}</h2>
        <Link href={monthHref(shift(1))} aria-label="Mes siguiente" className="grid size-11 place-items-center rounded-full bg-surface-muted outline-none transition-colors hover:bg-accent-subtle focus-visible:outline-2 focus-visible:outline-ring">
          <ChevronRight aria-hidden="true" className="size-4" />
        </Link>
        <p className="ms-auto text-xs text-muted-foreground">Por cierre previsto{withoutDate ? ` · ${withoutDate} sin fecha` : ""}</p>
      </div>
      <div className="overflow-x-auto rounded-(--radius-widget) border border-border/60 bg-card p-3">
        <table className="w-full min-w-[760px] table-fixed border-separate border-spacing-1.5 text-xs">
          <caption className="sr-only">Oportunidades por cierre previsto</caption>
          <thead>
            <tr>
              {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
                <th key={d} scope="col" className="pb-1 text-left font-medium text-muted-foreground">
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((week, i) => (
              <tr key={i}>
                {week.map(({ day, inMonth }) => (
                  <td key={day} className={cn("h-24 rounded-2xl p-2 align-top", inMonth ? "bg-surface-muted/50" : "bg-surface-muted/20")}>
                    <span className={cn("mb-1 inline-grid size-6 place-items-center rounded-full", day === today ? "bg-accent-subtle font-semibold text-accent-text" : inMonth ? "text-foreground" : "text-muted-foreground")}>{Number(day.slice(8))}</span>
                    <ul className="grid gap-1">
                      {(byDay.get(day) ?? []).slice(0, 3).map((c) => (
                        <li key={c.id}>
                          <button type="button" onClick={() => onOpen(c)} aria-haspopup="dialog" className="block w-full truncate rounded-full bg-card px-2.5 py-1 text-left text-foreground outline-none transition-colors hover:bg-accent-subtle focus-visible:outline-2 focus-visible:outline-ring">
                            {c.name} · {shortMoney(c.value)}
                          </button>
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
export function ChartView({ cards, stages, onCreate }: { cards: PipelineCard[]; stages: PipelineStage[]; onCreate?: () => void }) {
  const funnel = stages.map((s) => {
    const list = cards.filter((c) => c.stageId === s.id);
    return { name: s.name, count: list.length, value: list.reduce((t, c) => t + c.value, 0) };
  });
  const maxValue = Math.max(1, ...funnel.map((f) => f.value));
  const months = new Map<string, number>();
  for (const c of cards.filter((c) => !c.won && c.expectedClose)) months.set(c.expectedClose!.slice(0, 7), (months.get(c.expectedClose!.slice(0, 7)) ?? 0) + (c.value * c.probability) / 100);
  const forecast = [...months.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(0, 12);
  const maxForecast = Math.max(1, ...forecast.map(([, v]) => v));
  if (cards.length === 0) {
    return (
      <div className="px-6 pb-12">
        <EmptyState
          mark="center"
          remember={false}
          icon={<ChartColumn />}
          title="Aún no hay datos para graficar"
          description="Cuando tengas oportunidades verás el embudo por etapa y la previsión de ingresos por mes."
          action={<CreateButton onCreate={onCreate} />}
          className="rounded-(--radius-widget) border border-border/60 bg-card py-16"
        />
      </div>
    );
  }
  return (
    <div className="grid gap-4 px-6 pb-12 lg:grid-cols-2">
      <section aria-labelledby="crm-embudo" className={widget}>
        <h2 id="crm-embudo" className="mb-5 text-ui font-semibold text-foreground">Embudo por etapa</h2>
        <ul className="grid gap-3">
          {funnel.map((f) => (
            <li key={f.name} className="grid gap-1">
              <span className="flex justify-between text-xs text-muted-foreground">
                <span>
                  {f.name} · {f.count}
                </span>
                <span className="tabular-nums text-foreground">{shortMoney(f.value)}</span>
              </span>
              <span className="h-2.5 overflow-hidden rounded-full bg-surface-muted">
                <i className="block h-full rounded-full bg-accent" style={{ width: `${(f.value / maxValue) * 100}%` }} />
              </span>
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="crm-prevision" className={widget}>
        <h2 id="crm-prevision" className="mb-1 text-ui font-semibold text-foreground">Previsión de ingresos</h2>
        <p className="mb-5 text-xs text-muted-foreground">Valor × probabilidad, por mes de cierre previsto</p>
        {forecast.length ? (
          <ul className="grid gap-3">
            {forecast.map(([month, v]) => (
              <li key={month} className="grid gap-1">
                <span className="flex justify-between text-xs capitalize text-muted-foreground">
                  <span>{MONTH.format(new Date(`${month}-01T12:00:00Z`))}</span>
                  <span className="tabular-nums text-foreground">{shortMoney(Math.round(v))}</span>
                </span>
                <span className="h-2.5 overflow-hidden rounded-full bg-surface-muted">
                  <i className="block h-full rounded-full bg-success/80" style={{ width: `${(v / maxForecast) * 100}%` }} />
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
export function ActivitiesView({ slug, items, onDone, pendingIds, now, onCreate }: { slug: string; items: ActivityItem[]; onDone: (id: string) => void; pendingIds: ReadonlySet<string>; now: number; onCreate?: () => void }) {
  const today = bogotaDay(now);
  const groups = new Map<string, ActivityItem[]>();
  for (const a of items) {
    const day = bogotaDay(new Date(a.dueAt).getTime());
    const key = day < today ? "vencidas" : day;
    groups.set(key, [...(groups.get(key) ?? []), a]);
  }
  if (!items.length)
    return (
      <div className="px-6 pb-12">
        <EmptyState
          mark="center"
          remember={false}
          icon={<Clock />}
          title="Todo al día"
          description="No hay actividades pendientes. Programa la siguiente llamada o reunión desde una oportunidad."
          action={<CreateButton onCreate={onCreate} />}
          className="rounded-(--radius-widget) border border-border/60 bg-card py-16"
        />
      </div>
    );
  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6 px-6 pb-12">
      {[...groups.entries()].map(([key, list]) => (
        <section key={key} aria-label={key === "vencidas" ? "Vencidas" : DAY.format(new Date(`${key}T17:00:00Z`))}>
          <h2 className={cn("mb-2.5 text-xs font-medium", key === "vencidas" ? "text-danger" : "text-muted-foreground")}>
            {key === "vencidas" ? "Vencidas" : key === today ? `Hoy · ${DAY.format(new Date(`${key}T17:00:00Z`))}` : DAY.format(new Date(`${key}T17:00:00Z`))}
          </h2>
          <ul className="grid gap-2 rounded-(--radius-widget) border border-border/60 bg-card p-4">
            {list.map((a) => (
              <li key={a.id} className="flex items-center gap-3 rounded-2xl bg-surface-muted/60 px-4 py-3.5">
                <span className="grid min-w-0 flex-1 gap-0.5">
                  <span className="truncate text-sm text-foreground">
                    {ACTIVITY_LABEL[a.kind]} · {a.title}
                  </span>
                  <Link href={`/${slug}/crm/oportunidades/${a.opportunityId}`} className="truncate text-xs text-muted-foreground hover:text-accent-text">
                    {a.opportunity} · {TIME.format(new Date(a.dueAt))}
                  </Link>
                </span>
                <button type="button" disabled={pendingIds.has(a.id)} onClick={() => onDone(a.id)} className="h-10 shrink-0 rounded-full bg-card px-4 text-xs font-medium text-foreground outline-none transition-colors hover:bg-accent-subtle focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60">
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

