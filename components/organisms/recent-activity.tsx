"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Switch } from "@/components/atoms/switch";
import { flash } from "@/lib/motion";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight, CalendarClock, HandCoins, Hourglass, Receipt, UserPlus } from "lucide-react";
import { Chip, ChipRow } from "@/components/atoms/chip";
import { IconTile } from "@/components/atoms/icon-tile";
import { EmptyState } from "@/components/molecules/empty-state";
import { Amount, ListItem } from "@/components/molecules/list-item";
import type { ActivityType, RecentActivityItem } from "@/lib/dashboard/types";

const ACTIVITY_ICONS: Record<ActivityType, LucideIcon> = {
  payment: HandCoins,
  expense: Receipt,
  customer: UserPlus,
  expiry: CalendarClock,
  pending: Hourglass,
};

type Filter = "all" | ActivityType;

/** Qué muestra cada filtro cuando no hay nada. */
const EMPTY: Record<Filter, { title: string; description: string }> = {
  all: { title: "No hay actividad todavía", description: "Los pagos cobrados, los gastos, los socios nuevos y lo que vence aparecerán aquí." },
  payment: { title: "Sin pagos recientes", description: "Los pagos cobrados aparecerán aquí." },
  expense: { title: "Sin gastos recientes", description: "Los gastos de caja menor aparecerán aquí." },
  customer: { title: "Sin altas recientes", description: "Los socios nuevos aparecerán aquí." },
  expiry: { title: "Nada por vencer", description: "Las membresías que vencen en los próximos días aparecerán aquí." },
  pending: { title: "Sin cuentas pendientes", description: "Lo que te deben (cartera) aparecerá aquí." },
};

type RecentActivityProps = {
  items: RecentActivityItem[];
  /** Filtros disponibles según los módulos activos (siempre se agrega «Todo»). */
  filters?: { type: ActivityType; label: string }[];
  /** A dónde lleva «Ver registro completo» según el filtro elegido. */
  registry?: Partial<Record<Filter, { href: string; label: string }>>;
};

/**
 * Actividad reciente (Client Component): filtros por tipo (chips con conteo:
 * pagos, gastos, socios nuevos, vencimientos y cuentas pendientes según los
 * módulos activos), filas de 60 px con icono semántico y enlace al registro de
 * cada dato, entrada escalonada, estado vacío por filtro y «Ver registro
 * completo». Gastos en rojo; ingresos en tinta. Con "En vivo" (activo por
 * defecto) la página se actualiza cada 30 s con la pestaña visible y lo que
 * llega destella en oro (DAT·05).
 */
export default function RecentActivity({ items, filters = [], registry = {} }: RecentActivityProps) {
  const [filter, setFilter] = useState<Filter>("all");
  const [live, setLive] = useState(true);
  const listRef = useRef<HTMLUListElement>(null);
  const seen = useRef<Set<string> | null>(null);
  const router = useRouter();
  const liveId = useId();

  useEffect(() => {
    if (!live) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 30_000);
    return () => window.clearInterval(id);
  }, [live, router]);

  // Lo que llegó desde la última vez destella.
  useEffect(() => {
    const ids = new Set(items.map((i) => i.id));
    const before = seen.current;
    seen.current = ids;
    if (!before) return;
    for (const id of ids) {
      if (!before.has(id)) flash(listRef.current?.querySelector(`[data-id="${CSS.escape(id)}"]`));
    }
  }, [items]);

  const visible = filter === "all" ? items : items.filter((item) => item.type === filter);
  const countOf = (type: ActivityType) => items.filter((item) => item.type === type).length;
  const full = registry[filter] ?? registry.all;

  // Las filas entran una a una (50 ms) cada vez que cambia el filtro.
  useEffect(() => {
    const rows = listRef.current?.querySelectorAll<HTMLElement>(".nx-row");
    rows?.forEach((row, index) => {
      row.style.transitionDelay = `${index * 50}ms`;
      requestAnimationFrame(() => row.classList.add("in"));
    });
  }, [filter]);

  return (
    <section
      aria-labelledby="recent-activity-title"
      className="nx-rise flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card"
    >
      <header className="grid gap-2.5 border-b border-border px-[18px] py-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="recent-activity-title" className="font-display text-[15px] font-semibold text-foreground">
            Actividad reciente
          </h2>
          <label htmlFor={liveId} className="flex items-center gap-2 text-[13px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              {live ? <i aria-hidden="true" className="size-1.5 bg-success motion-safe:animate-[nx-pulse_1.6s_ease-in-out_infinite]" /> : null}
              En vivo
            </span>
            <Switch id={liveId} checked={live} onCheckedChange={setLive} />
          </label>
        </div>
        {filters.length > 0 ? (
          <ChipRow role="group" aria-label="Filtrar actividad" className="-mx-0.5">
            <Chip selected={filter === "all"} count={items.length} onClick={() => setFilter("all")}>
              Todo
            </Chip>
            {filters.map((f) => (
              <Chip key={f.type} selected={filter === f.type} count={countOf(f.type)} onClick={() => setFilter(f.type)}>
                {f.label}
              </Chip>
            ))}
          </ChipRow>
        ) : null}
      </header>

      {visible.length === 0 ? (
        <EmptyState title={EMPTY[filter].title} description={EMPTY[filter].description} />
      ) : (
        <ul ref={listRef} className="flex-1">
          {visible.map((item) => {
            const Icon = ACTIVITY_ICONS[item.type];
            const isExpense = item.type === "expense";
            const row = (
              <ListItem
                interactive={Boolean(item.href)}
                chevron={Boolean(item.href) && !item.amount}
                leading={
                  <IconTile size="sm" tone={isExpense || item.type === "pending" || item.type === "expiry" ? "gold" : "neutral"}>
                    <Icon strokeWidth={1.6} />
                  </IconTile>
                }
                title={item.title}
                subtitle={item.description}
                trailing={
                  <div className="shrink-0 text-right">
                    {item.amount ? <Amount value={isExpense ? `−${item.amount}` : item.type === "payment" ? `+${item.amount}` : item.amount} negative={isExpense} /> : null}
                    <p className="text-[11.5px] text-muted-foreground">{item.time}</p>
                  </div>
                }
              />
            );
            return (
              <li key={item.id} data-id={item.id} className="nx-row">
                {item.href ? (
                  <Link href={item.href} data-press="card" className="block focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring">
                    {row}
                  </Link>
                ) : (
                  row
                )}
              </li>
            );
          })}
        </ul>
      )}

      {full ? (
        <footer className="border-t border-border px-[18px] py-2.5">
          <Link href={full.href} className="inline-flex items-center gap-1 text-[13px] font-semibold text-accent-text hover:underline focus-visible:outline-2 focus-visible:outline-ring">
            {full.label} <ArrowUpRight aria-hidden="true" className="size-3.5" />
          </Link>
        </footer>
      ) : null}
    </section>
  );
}
