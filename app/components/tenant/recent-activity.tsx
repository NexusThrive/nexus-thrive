"use client";

import { useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { HandCoins, Receipt } from "lucide-react";
import { cn } from "@/lib/cn";
import { EmptyState } from "@/components/brand/empty-state";
import type { ActivityType, RecentActivityItem } from "@/lib/dashboard-types";

type RecentActivityProps = {
  items: RecentActivityItem[];
};

const ACTIVITY_ICONS: Record<ActivityType, LucideIcon> = {
  payment: HandCoins,
  expense: Receipt,
};

type Filter = "all" | ActivityType;

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Todo" },
  { id: "payment", label: "Pagos" },
  { id: "expense", label: "Gastos" },
];

/**
 * Actividad reciente (Client Component): control segmentado de 3 opciones,
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
      className="flex h-full flex-col rounded-lg border border-border bg-card"
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3.5">
        <h2
          id="recent-activity-title"
          className="font-display text-base font-semibold text-foreground"
        >
          Actividad reciente
        </h2>

        <div
          role="tablist"
          aria-label="Filtrar actividad"
          className="inline-flex h-7 items-stretch rounded-sm border border-border p-0.5"
        >
          {FILTERS.map((option) => {
            const active = filter === option.id;
            return (
              <button
                key={option.id}
                role="tab"
                type="button"
                aria-selected={active}
                onClick={() => setFilter(option.id)}
                className={cn(
                  "rounded-[2px] px-2.5 text-xs font-medium tabular-nums transition-colors",
                  active
                    ? "bg-surface-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {option.label}
              </button>
            );
          })}
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
              <li
                key={item.id}
                className="nx-row flex h-[60px] items-center gap-3 border-b border-border px-5 last:border-b-0"
              >
                <Icon
                  aria-hidden="true"
                  strokeWidth={1.5}
                  className="size-[18px] shrink-0 text-muted-foreground"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {item.title}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.description}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p
                    className={cn(
                      "text-sm font-semibold tabular-nums",
                      isExpense ? "text-danger" : "text-foreground",
                    )}
                  >
                    {item.amount}
                  </p>
                  <p className="text-xs text-muted-foreground">{item.time}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
