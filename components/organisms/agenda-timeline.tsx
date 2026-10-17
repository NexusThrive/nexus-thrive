"use client";

import { Check } from "lucide-react";
import { buttonVariants } from "@/components/atoms/button-variants";
import { NMark } from "@/components/atoms/n-mark";
import { burstFrom, spring } from "@/lib/motion";
import { cn } from "@/lib/utils";

export type AgendaItem = {
  id: string;
  /** "HH:MM" en Bogotá, para ordenar y para la raya de ahora. */
  time: string;
  title: string;
  subtitle: string;
  initials: string;
  done: boolean;
  /** Cancelada: se muestra tachada y sin acción. */
  cancelled?: boolean;
};

/**
 * Citas del día (Agenda del artefacto): hora a la izquierda y tarjeta con
 * borde oro; la raya roja de "ahora" se intercala en el día de hoy. Marcar
 * atendida (FLU·05) hace rebotar el botón, atenúa la tarjeta, pasa el borde
 * a verde y lanza 12 cortes. Sin citas, la N flota con "Día libre".
 */
export function AgendaTimeline({
  items,
  now,
  pendingId,
  onToggle,
  emptyAction,
}: {
  items: AgendaItem[];
  /** "HH:MM" si el día mostrado es hoy. */
  now?: string;
  /** Cita que se está guardando (gira la N en su botón). */
  pendingId?: string | null;
  onToggle?: (item: AgendaItem) => void;
  emptyAction?: React.ReactNode;
}) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-border bg-surface px-[18px] py-9 text-center">
        <NMark size={48} state="done" className="text-foreground opacity-30 motion-safe:animate-[nx-float_4s_ease-in-out_infinite]" />
        <h3 className="mt-1.5 font-display text-base font-semibold">Día libre</h3>
        <p className="max-w-[36ch] text-[13px] text-muted-foreground">No hay citas para este día. Agenda una para empezar.</p>
        {emptyAction}
      </div>
    );
  }

  const nowIndex = now ? items.findIndex((it) => it.time > now) : -1;
  const rows: (AgendaItem | "now")[] = [...items];
  if (now) rows.splice(nowIndex < 0 ? rows.length : nowIndex, 0, "now");

  return (
    <div className="grid gap-2.5">
      {rows.map((row) =>
        row === "now" ? (
          <div key="now" className="grid grid-cols-[58px_minmax(0,1fr)] items-center gap-3 font-mono text-[11px] font-semibold text-danger">
            <span className="text-right">{now}</span>
            <i aria-hidden="true" className="relative h-px bg-danger before:absolute before:-left-px before:-top-[3px] before:size-[7px] before:-skew-x-[24deg] before:bg-danger" />
          </div>
        ) : (
          <div key={row.id} className="nx-rise grid grid-cols-[58px_minmax(0,1fr)] items-stretch gap-3">
            <div className="pt-3.5 text-right font-display text-[13px] font-semibold tabular-nums text-muted-foreground">{row.time}</div>
            <div
              className={cn(
                "flex items-center gap-3 rounded-md border border-l-[3px] border-border bg-surface px-3.5 py-3 transition-[opacity,border-color] duration-300",
                row.done ? "border-l-success opacity-[.62]" : row.cancelled ? "border-l-border-strong opacity-50" : "border-l-accent",
              )}
            >
              <span
                className={cn(
                  "grid size-7 shrink-0 place-items-center rounded-md font-display text-[11px] font-bold",
                  row.done || row.cancelled ? "bg-surface-muted text-foreground" : "bg-primary text-primary-foreground",
                )}
              >
                {row.initials}
              </span>
              <div className="min-w-0 flex-1">
                <b className={cn("block truncate font-semibold", (row.done || row.cancelled) && "line-through decoration-muted-foreground")}>{row.title}</b>
                <small className="block truncate text-xs text-muted-foreground">{row.subtitle}</small>
              </div>
              {onToggle && !row.cancelled ? (
                <button
                  type="button"
                  aria-pressed={row.done}
                  aria-label={row.done ? "Atendida" : "Marcar atendida"}
                  disabled={pendingId === row.id || row.done}
                  onClick={(e) => {
                    const el = e.currentTarget;
                    spring(el, "scale", 0.6, 1, { stiffness: 620, damping: 11 });
                    burstFrom(el, 12);
                    onToggle(row);
                  }}
                  className={buttonVariants({ variant: row.done ? "primary" : "outline", size: "icon-sm" })}
                >
                  {pendingId === row.id ? <NMark size={14} state="loop" className="text-current" /> : <Check aria-hidden="true" className="size-4" />}
                </button>
              ) : null}
            </div>
          </div>
        ),
      )}
    </div>
  );
}
