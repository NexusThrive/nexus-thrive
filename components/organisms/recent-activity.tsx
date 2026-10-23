"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Switch } from "@/components/atoms/switch";
import { flash } from "@/lib/motion";
import type { LucideIcon } from "lucide-react";
import { HandCoins, Receipt } from "lucide-react";
import { IconTile } from "@/components/atoms/icon-tile";
import { EmptyState } from "@/components/molecules/empty-state";
import { Amount, ListItem } from "@/components/molecules/list-item";
import {
  SegmentedControl,
  type SegmentedOption,
} from "@/components/molecules/segmented-control";
import type { ActivityType, RecentActivityItem } from "@/lib/dashboard/types";

type RecentActivityProps = {
  items: RecentActivityItem[];
};

const ACTIVITY_ICONS: Record<ActivityType, LucideIcon> = {
  payment: HandCoins,
  expense: Receipt,
};

type Filter = "all" | ActivityType;

const FILTERS: SegmentedOption<Filter>[] = [
  { value: "all", label: "Todo" },
  { value: "payment", label: "Pagos" },
  { value: "expense", label: "Gastos" },
];

/**
 * Actividad reciente (Client Component): `SegmentedControl` de 3 opciones,
 * filas de 60 px con icono semántico, entrada escalonada y estado vacío con
 * la N en contorno. Gastos en #B3261E; ingresos en tinta. Con "En vivo"
 * (activo por defecto) la página se actualiza cada 30 s con la pestaña
 * visible y los movimientos que llegan destellan en oro (DAT·05).
 */
export default function RecentActivity({ items }: RecentActivityProps) {
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

  const visible =
    filter === "all" ? items : items.filter((item) => item.type === filter);

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
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-[18px] py-3.5">
        <h2
          id="recent-activity-title"
          className="font-display text-[15px] font-semibold text-foreground"
        >
          Actividad reciente
        </h2>

        <div className="flex items-center gap-3">
          <label htmlFor={liveId} className="flex items-center gap-2 text-[13px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              {live ? <i aria-hidden="true" className="size-1.5 bg-success motion-safe:animate-[nx-pulse_1.6s_ease-in-out_infinite]" /> : null}
              En vivo
            </span>
            <Switch id={liveId} checked={live} onCheckedChange={setLive} />
          </label>
          <SegmentedControl
            ariaLabel="Filtrar actividad"
            options={FILTERS}
            value={filter}
            onChange={setFilter}
          />
        </div>
      </header>

      {visible.length === 0 ? (
        <EmptyState
          title="No hay movimientos todavía"
          description="Los pagos cobrados y los gastos de caja menor aparecerán aquí."
        />
      ) : (
        <ul ref={listRef}>
          {visible.map((item) => {
            const Icon = ACTIVITY_ICONS[item.type];
            const isExpense = item.type === "expense";
            return (
              <li key={item.id} data-id={item.id} className="nx-row">
                <ListItem
                  leading={
                    <IconTile size="sm" tone={isExpense ? "gold" : "neutral"}>
                      <Icon strokeWidth={1.6} />
                    </IconTile>
                  }
                  title={item.title}
                  subtitle={item.description}
                  trailing={
                    <div className="shrink-0 text-right">
                      <Amount value={isExpense ? `−${item.amount}` : `+${item.amount}`} negative={isExpense} />
                      <p className="text-[11.5px] text-muted-foreground">{item.time}</p>
                    </div>
                  }
                />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
