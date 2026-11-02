"use client";

import type { ReactNode } from "react";
import { Check, LayoutGrid, ListChecks, Plus } from "lucide-react";
import { ResponsiveSheet } from "@/components/organisms/responsive-sheet";
import { COMING_SOON, type ChartEntry, type ChartType } from "@/lib/experience/dashboard/chart-catalog";
import { cn } from "@/lib/utils";

/** Vista previa de cada gráfico: trazos mono de 60 × 36, solo para reconocerlo. */
const PREVIEW: Record<ChartType, ReactNode> = {
  bars: (
    <g>
      {[8, 14, 10, 20, 16, 26, 18].map((h, i) => (
        <g key={i}>
          <rect x={4 + i * 8} y={34 - h} width="3" height={h} fill="var(--foreground)" />
          <rect x={7.5 + i * 8} y={34 - h * 0.6} width="3" height={h * 0.6} fill="var(--border-strong)" />
        </g>
      ))}
    </g>
  ),
  line: (
    <g fill="none" strokeWidth="1.6" strokeLinejoin="round">
      <path d="M3 28 L14 20 L24 24 L36 10 L47 16 L57 6" stroke="var(--foreground)" />
      <path d="M3 30 L14 27 L24 28 L36 22 L47 25 L57 20" stroke="var(--border-strong)" />
    </g>
  ),
  area: (
    <g>
      <path d="M3 30 L14 24 L24 26 L36 14 L47 18 L57 8 L57 34 L3 34 Z" fill="var(--nx-gold-500)" fillOpacity=".25" />
      <path d="M3 30 L14 24 L24 26 L36 14 L47 18 L57 8" fill="none" stroke="var(--nx-gold-600)" strokeWidth="1.6" strokeLinejoin="round" />
    </g>
  ),
  donut: (
    <g transform="rotate(-90 30 18)" fill="none" strokeWidth="7">
      <circle cx="30" cy="18" r="11" stroke="var(--border)" />
      <circle cx="30" cy="18" r="11" stroke="var(--nx-gold-500)" strokeDasharray="30 69" />
      <circle cx="30" cy="18" r="11" stroke="var(--foreground)" strokeOpacity=".6" strokeDasharray="20 69" strokeDashoffset="-31" />
      <circle cx="30" cy="18" r="11" stroke="var(--foreground)" strokeOpacity=".25" strokeDasharray="12 69" strokeDashoffset="-52" />
    </g>
  ),
  gauge: (
    <g fill="none" strokeWidth="6">
      <path d="M12 30 A18 18 0 0 1 48 30" pathLength={100} stroke="var(--border)" />
      <path d="M12 30 A18 18 0 0 1 48 30" pathLength={100} stroke="var(--nx-gold-500)" strokeDasharray="64 100" />
    </g>
  ),
  customers: (
    <g>
      <path d="M3 30 L12 26 L22 28 L32 18 L42 20 L57 8 L57 34 L3 34 Z" fill="var(--foreground)" fillOpacity=".1" />
      <path d="M3 30 L12 26 L22 28 L32 18 L42 20 L57 8" fill="none" stroke="var(--foreground)" strokeWidth="1.6" strokeLinejoin="round" />
    </g>
  ),
};

function Preview({ children }: { children?: ReactNode }) {
  return (
    <svg viewBox="0 0 60 36" aria-hidden="true" className="h-14 w-full rounded-sm bg-surface-muted p-1.5">
      {children}
    </svg>
  );
}

/** Un bloque del inicio que se puede mostrar u ocultar (las tarjetas de cifras, los accesos rápidos, la actividad…). */
export type BlockOption = { id: string; label: string; hidden: boolean };

const rowClass = "flex min-h-12 w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-ui";
const disabledClass = "cursor-not-allowed border-dashed border-border-strong text-muted-foreground opacity-70";

/** Etiqueta de lo que ya está puesto: no se puede volver a elegir. */
function InHome() {
  return (
    <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-sm border border-border-strong px-1.5 py-0.5 text-2xs font-semibold uppercase tracking-wider">
      <Check aria-hidden="true" className="size-3" /> En tu inicio
    </span>
  );
}

/**
 * Panel lateral «Elementos del inicio»: todo lo que se puede poner en el inicio, en un solo lugar. «Bloques» son los del
 * sistema (cifras, accesos rápidos, actividad…): los ocultos se agregan con un toque. «Gráficos» son el catálogo con su
 * vista previa y se agregan al final. Lo que ya está en el inicio sale atenuado, con borde de línea y sin poder
 * elegirse (se quita desde su tarjeta); lo que aún no existe va marcado «Pronto».
 */
export function AddWidgetPanel({
  open,
  onOpenChange,
  entries,
  blocks,
  presentCharts,
  onAdd,
  onShowBlock,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entries: readonly ChartEntry[];
  blocks: readonly BlockOption[];
  /** Tipos de gráfico que ya están en el inicio. */
  presentCharts: ReadonlySet<ChartType>;
  onAdd: (type: ChartType) => void;
  onShowBlock: (id: string) => void;
}) {
  return (
    <ResponsiveSheet
      drawer
      size="lg"
      open={open}
      onOpenChange={onOpenChange}
      title="Elementos del inicio"
      description="Elige qué mostrar. Lo que ya está en tu inicio aparece atenuado: se quita desde su tarjeta."
      unsavedGuard={false}
    >
      <div className="grid gap-6">
        {blocks.length > 0 ? (
          <section aria-labelledby="add-blocks">
            <h3 id="add-blocks" className="mb-2 text-2xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Bloques</h3>
            <ul className="grid gap-1.5">
              {blocks.map((block) => (
                <li key={block.id}>
                  {block.hidden ? (
                    <button type="button" onClick={() => onShowBlock(block.id)} className={cn(rowClass, "border-border bg-card transition-colors hover:border-border-input hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring")}>
                      <LayoutGrid aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate font-medium">{block.label}</span>
                      <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-accent-text"><Plus aria-hidden="true" className="size-3.5" /> Agregar</span>
                    </button>
                  ) : (
                    <button type="button" disabled className={cn(rowClass, disabledClass)}>
                      <LayoutGrid aria-hidden="true" className="size-4 shrink-0" />
                      <span className="min-w-0 flex-1 truncate font-medium">{block.label}</span>
                      <InHome />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {entries.length > 0 || COMING_SOON.length > 0 ? (
          <section aria-labelledby="add-charts">
            <h3 id="add-charts" className="mb-2 text-2xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Gráficos</h3>
            <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {entries.map((entry) => {
                const present = presentCharts.has(entry.type);
                return (
                  <li key={entry.type}>
                    <button
                      type="button"
                      disabled={present}
                      onClick={() => onAdd(entry.type)}
                      className={cn(
                        "group grid h-full w-full gap-2 rounded-lg border p-3 text-left transition-[border-color,transform] duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                        present ? "cursor-not-allowed border-dashed border-border-strong text-muted-foreground opacity-70" : "border-border bg-card hover:border-border-input motion-safe:hover:-translate-y-0.5",
                      )}
                    >
                      <Preview>{PREVIEW[entry.type]}</Preview>
                      <span className="flex items-center gap-2 text-ui font-semibold">
                        {entry.label}
                        {present ? <InHome /> : null}
                      </span>
                      <span className="text-xs text-muted-foreground">{entry.description}</span>
                    </button>
                  </li>
                );
              })}
              {COMING_SOON.map((item) => (
                <li key={item.label}>
                  <div aria-disabled="true" className="grid h-full gap-2 rounded-lg border border-dashed border-border-strong p-3 text-muted-foreground opacity-80">
                    <Preview>
                      <g fill="none" stroke="var(--border-strong)" strokeWidth="1.2">
                        {[8, 17, 26].map((y) => (
                          <g key={y}>
                            <rect x="6" y={y - 3} width="5" height="5" />
                            <path d={`M15 ${y} H${y === 17 ? 42 : y === 8 ? 52 : 36}`} />
                          </g>
                        ))}
                      </g>
                    </Preview>
                    <span className="flex items-center gap-2 text-ui font-semibold">
                      <ListChecks aria-hidden="true" className="size-3.5" />
                      {item.label}
                      <span className="ml-auto rounded-sm border border-border-strong px-1.5 py-0.5 text-2xs font-semibold uppercase tracking-wider">Pronto</span>
                    </span>
                    <span className="text-xs">{item.description}</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </ResponsiveSheet>
  );
}
