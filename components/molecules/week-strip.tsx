"use client";

import { useLayoutEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/atoms/button-variants";
import { addDays, dayNumber, monthLabel, weekDays, weekdayLabel } from "@/lib/calendar";
import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * Semana deslizable de la agenda (NAV·04). Siete días con sus puntos oro
 * (hasta 3 por día con citas); el bloque tinta viaja al día elegido con un
 * rebote (440 ms) y en el celular se cambia de semana deslizando 50 px.
 * Controlado: `value` es el día elegido ("YYYY-MM-DD").
 */
export function WeekStrip({
  value,
  today,
  counts,
  onChange,
  className,
}: {
  value: string;
  today: string;
  /** Citas por día ("YYYY-MM-DD" → número). */
  counts: Record<string, number>;
  onChange: (day: string) => void;
  className?: string;
}) {
  const days = weekDays(value);
  const gridRef = useRef<HTMLDivElement>(null);
  const indRef = useRef<HTMLSpanElement>(null);
  const startX = useRef<number | null>(null);

  useLayoutEffect(() => {
    const grid = gridRef.current;
    const ind = indRef.current;
    if (!grid || !ind) return;
    const place = () => {
      const on = grid.querySelector<HTMLElement>('[aria-pressed="true"]');
      if (!on) return;
      ind.style.width = `${on.offsetWidth}px`;
      ind.style.transform = `translateX(${on.offsetLeft}px)`;
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(grid);
    return () => ro.disconnect();
  }, [value]);

  return (
    <div className={cn("rounded-lg border border-border bg-surface p-3", className)}>
      <div className="mb-2 flex items-center justify-between px-1">
        <b className="font-display text-sm font-semibold">{monthLabel(days[0])}</b>
        <div className="flex gap-1">
          <button type="button" aria-label="Semana anterior" onClick={() => onChange(addDays(value, -7))} className={buttonVariants({ variant: "ghost", size: "icon-sm" })}>
            <ChevronLeft aria-hidden="true" className="size-4" />
          </button>
          <button type="button" onClick={() => onChange(today)} className={buttonVariants({ variant: "outline", size: "sm" })}>
            Hoy
          </button>
          <button type="button" aria-label="Semana siguiente" onClick={() => onChange(addDays(value, 7))} className={buttonVariants({ variant: "ghost", size: "icon-sm" })}>
            <ChevronRight aria-hidden="true" className="size-4" />
          </button>
        </div>
      </div>
      <div
        ref={gridRef}
        className="relative grid touch-pan-y grid-cols-7 gap-1.5"
        onPointerDown={(e) => {
          if (e.pointerType === "touch") startX.current = e.clientX;
        }}
        onPointerUp={(e) => {
          if (startX.current == null) return;
          const dx = e.clientX - startX.current;
          startX.current = null;
          if (Math.abs(dx) > 50) onChange(addDays(value, dx < 0 ? 7 : -7));
        }}
      >
        <span
          ref={indRef}
          aria-hidden="true"
          className="absolute inset-y-0 left-0 z-0 rounded-md bg-primary transition-[transform,width] duration-[440ms] ease-[cubic-bezier(.34,1.25,.64,1)]"
        />
        {days.map((day) => {
          const n = counts[day] ?? 0;
          const on = day === value;
          return (
            <button
              key={day}
              type="button"
              aria-pressed={on}
              aria-label={`${weekdayLabel(day)} ${dayNumber(day)}, ${n} ${n === 1 ? "cita" : "citas"}`}
              onClick={(e) => {
                onChange(day);
                spring(e.currentTarget, "scale", 0.9, 1, { stiffness: 500, damping: 14 });
              }}
              className={cn(
                "relative z-10 flex flex-col items-center gap-1 rounded-md py-2.5 transition-colors duration-200",
                on ? "text-primary-foreground" : "text-muted-foreground",
              )}
            >
              <small className="text-[11px] font-medium uppercase tracking-[0.06em]">{weekdayLabel(day)}</small>
              <b
                className={cn(
                  "font-display text-lg font-semibold tabular-nums",
                  on ? "text-primary-foreground" : day === today ? "text-accent-text" : "text-foreground",
                )}
              >
                {dayNumber(day)}
              </b>
              <span className="flex h-1 gap-[3px]" aria-hidden="true">
                {Array.from({ length: Math.min(3, n) }, (_, i) => (
                  <i key={i} className="size-1 bg-accent" />
                ))}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
