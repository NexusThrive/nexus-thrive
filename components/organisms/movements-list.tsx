"use client";

import { useMemo, useState } from "react";
import { Banknote, MinusCircle } from "lucide-react";
import { EmptyState } from "@/components/molecules/empty-state";
import { SegmentedControl } from "@/components/molecules/segmented-control";
import { cn } from "@/lib/utils";

export type Movement = {
  id: string;
  type: "in" | "out";
  title: string;
  subtitle: string;
  amount: number;
  /** ISO. */
  at: string;
};

type Filter = "all" | "in" | "out";

const dayKey = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" });
const dayLong = new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", weekday: "long", day: "numeric", month: "long" });
const time = new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", hour: "numeric", minute: "2-digit" });
const cop = (n: number) => `$ ${Math.round(Math.abs(n)).toLocaleString("es-CO")}`;

function dayLabel(iso: string, now: Date): string {
  const k = dayKey.format(new Date(iso));
  if (k === dayKey.format(now)) return "Hoy";
  if (k === dayKey.format(new Date(now.getTime() - 86_400_000))) return "Ayer";
  const s = dayLong.format(new Date(iso));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Movimientos del negocio agrupados por día (Finanzas del artefacto): filtro
 * Todo / Ingresos / Gastos con pastilla deslizante, cabecera por día en
 * mayúsculas pequeñas y cada fila con icono, concepto, medio, monto (+ tinta,
 * − rojo) y hora. Las filas entran escalonadas al cambiar el filtro.
 */
export function MovementsList({ items, title = "Movimientos" }: { items: Movement[]; title?: string }) {
  const [filter, setFilter] = useState<Filter>("all");
  const groups = useMemo(() => {
    const now = new Date();
    const out: { day: string; rows: Movement[] }[] = [];
    for (const m of items) {
      if (filter !== "all" && m.type !== filter) continue;
      const day = dayLabel(m.at, now);
      const last = out.at(-1);
      if (last && last.day === day) last.rows.push(m);
      else out.push({ day, rows: [m] });
    }
    return out;
  }, [items, filter]);

  let index = 0;
  return (
    <section aria-labelledby="movements-title" className="min-w-0 rounded-(--radius-widget) border border-border/60 bg-card p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2.5">
        <div className="grid gap-0.5">
          <h2 id="movements-title" className="text-ui font-semibold text-foreground">
            {title}
          </h2>
          <p className="text-xs text-muted-foreground">Cobros y gastos, por día</p>
        </div>
        <SegmentedControl
          ariaLabel="Tipo de movimiento"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "Todo" },
            { value: "in", label: "Ingresos" },
            { value: "out", label: "Gastos" },
          ]}
        />
      </div>
      <div key={filter} className="grid gap-5">
        {groups.length === 0 ? (
          <EmptyState
            mark="center"
            remember={false}
            title={filter === "out" ? "Aún no hay gastos" : filter === "in" ? "Aún no hay ingresos" : "Aún no hay movimientos"}
            description="Los pagos y gastos aparecerán aquí."
          />
        ) : (
          groups.map((g) => (
            <div key={g.day} className="grid gap-2">
              <h3 className="text-xs font-medium text-muted-foreground">{g.day}</h3>
              {g.rows.map((m) => {
                const inn = m.type === "in";
                const Icon = inn ? Banknote : MinusCircle;
                return (
                  <div
                    key={m.id}
                    className="nx-rise flex min-h-[64px] items-center gap-3 rounded-2xl bg-surface-muted/60 px-4 py-3"
                    style={{ ["--i" as string]: Math.min(index++, 12) }}
                  >
                    <span className={cn("grid size-10 shrink-0 place-items-center rounded-full", inn ? "bg-card text-foreground" : "bg-accent-subtle text-accent-text")}>
                      <Icon aria-hidden="true" className="size-4" strokeWidth={1.7} />
                    </span>
                    <div className="min-w-0 flex-1 leading-[1.3]">
                      <p className="truncate font-medium">{m.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{m.subtitle}</p>
                    </div>
                    <div className="text-right">
                      <p className={cn("whitespace-nowrap font-display text-sm font-semibold tabular-nums", !inn && "text-danger")}>
                        {inn ? "+" : "−"}
                        {cop(m.amount)}
                      </p>
                      <p className="whitespace-nowrap text-[11.5px] text-muted-foreground">{time.format(new Date(m.at))}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
