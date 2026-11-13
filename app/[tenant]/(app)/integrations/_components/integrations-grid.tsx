"use client";

import { useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type GridItem = { id: string; kind: string; card: ReactNode };

/** Rejilla de integraciones con filtro por tipo (Todas · Cobros · Canales…), con el conteo de cada una. */
export function IntegrationsGrid({ items }: { items: GridItem[] }) {
  const [kind, setKind] = useState("all");
  const kinds = useMemo(() => Array.from(new Set(items.map((i) => i.kind))), [items]);
  const shown = kind === "all" ? items : items.filter((i) => i.kind === kind);
  const chip = (value: string, label: string, count: number) => (
    <button
      key={value}
      type="button"
      aria-pressed={kind === value}
      onClick={() => setKind(value)}
      className={cn(
        "inline-flex h-10 items-center gap-2 rounded-full border px-4 text-ui font-medium outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        kind === value ? "border-transparent bg-accent text-ink" : "border-border/60 bg-card text-foreground hover:bg-surface-muted",
      )}
    >
      {label}
      <span className={cn("rounded-full px-2 py-0.5 text-xs", kind === value ? "bg-ink/10" : "bg-surface-muted text-muted-foreground")}>{count}</span>
    </button>
  );
  return (
    <div className="grid gap-5">
      {kinds.length > 1 ? (
        <div role="group" aria-label="Filtrar por tipo" className="flex flex-wrap gap-2">
          {chip("all", "Todas", items.length)}
          {kinds.map((k) => chip(k, k, items.filter((i) => i.kind === k).length))}
        </div>
      ) : null}
      <section aria-label="Herramientas conectadas" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {shown.map((i) => (
          <div key={i.id} className="nx-rise contents">
            {i.card}
          </div>
        ))}
      </section>
    </div>
  );
}
