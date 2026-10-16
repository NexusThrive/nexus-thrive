"use client";

import { useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { HandCoins, Receipt } from "lucide-react";
import { IconTile } from "@/components/atoms/icon-tile";
import { EmptyState } from "@/components/molecules/empty-state";
import { Amount, ListItem } from "@/components/molecules/list-item";
import {
  SegmentedControl,
  type SegmentedOption,
} from "@/components/molecules/segmented-control";
import type { ActivityType, RecentActivityItem } from "@/lib/dashboard-types";

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
 * la N en contorno. Gastos en #B3261E; ingresos en tinta.
 */
export default function RecentActivity({ items }: RecentActivityProps) {
  const [filter, setFilter] = useState<Filter>("all");
  const listRef = useRef<HTMLUListElement>(null);

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

        <SegmentedControl
          ariaLabel="Filtrar actividad"
          options={FILTERS}
          value={filter}
          onChange={setFilter}
        />
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
              <li key={item.id} className="nx-row">
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
