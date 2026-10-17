"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/atoms/button-variants";
import { addMonths, dayNumber, monthGrid, monthLabel, sameMonth } from "@/lib/calendar";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"];

/**
 * Mes de la agenda: el día elegido en tinta, hoy con borde oro y un punto
 * oro en los días con citas. Los días de otros meses se atenúan.
 */
export function MonthCalendar({
  value,
  today,
  marked,
  onChange,
  className,
}: {
  value: string;
  today: string;
  /** Días con citas. */
  marked: ReadonlySet<string>;
  onChange: (day: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border border-border bg-surface p-4", className)}>
      <div className="mb-2.5 flex items-center justify-between">
        <b className="font-display text-[15px] font-semibold">{monthLabel(value)}</b>
        <div className="flex gap-1">
          <button type="button" aria-label="Mes anterior" onClick={() => onChange(addMonths(value, -1))} className={buttonVariants({ variant: "ghost", size: "icon-sm" })}>
            <ChevronLeft aria-hidden="true" className="size-4" />
          </button>
          <button type="button" aria-label="Mes siguiente" onClick={() => onChange(addMonths(value, 1))} className={buttonVariants({ variant: "ghost", size: "icon-sm" })}>
            <ChevronRight aria-hidden="true" className="size-4" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {WEEKDAYS.map((d) => (
          <span key={d} className="h-[26px] text-[11px] font-medium leading-[26px] text-muted-foreground">
            {d}
          </span>
        ))}
        {monthGrid(value).map((day) => {
          const selected = day === value;
          return (
            <button
              key={day}
              type="button"
              aria-pressed={selected}
              aria-label={day}
              onClick={() => onChange(day)}
              className={cn(
                "relative aspect-square rounded-[3px] text-[13px] tabular-nums transition-colors duration-200",
                selected ? "bg-primary text-primary-foreground" : "hover:bg-surface-muted",
                !sameMonth(day, value) && !selected && "text-muted-foreground opacity-45",
                day === today && !selected && "shadow-[inset_0_0_0_1px_var(--nx-gold-600)]",
              )}
            >
              {dayNumber(day)}
              {marked.has(day) ? (
                <i aria-hidden="true" className="absolute bottom-[5px] left-1/2 size-1 -translate-x-1/2 bg-accent" />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
