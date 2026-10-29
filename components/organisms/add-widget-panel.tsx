"use client";

import type { ReactNode } from "react";
import { ListChecks } from "lucide-react";
import { ResponsiveSheet } from "@/components/organisms/responsive-sheet";
import { COMING_SOON, type ChartEntry, type ChartType } from "@/lib/dashboard/chart-catalog";
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

/**
 * Panel lateral «Agregar»: el catálogo de gráficos que se pueden poner en el
 * inicio, con una vista previa de cada uno. Elegir uno lo agrega al borrador del
 * tablero y cierra el panel. Lo que aún no existe (lista de tareas) se muestra
 * con borde de línea, desactivado y marcado «Pronto».
 */
export function AddWidgetPanel({
  open,
  onOpenChange,
  entries,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entries: readonly ChartEntry[];
  onAdd: (type: ChartType) => void;
}) {
  return (
    <ResponsiveSheet
      drawer
      size="lg"
      open={open}
      onOpenChange={onOpenChange}
      title="Agregar al inicio"
      description="Elige un gráfico: aparece al final de tu inicio y lo acomodas arrastrándolo o por las esquinas."
      unsavedGuard={false}
    >
      <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {entries.map((entry) => (
          <li key={entry.type}>
            <button
              type="button"
              onClick={() => onAdd(entry.type)}
              className="group grid h-full w-full gap-2 rounded-lg border border-border bg-card p-3 text-left transition-[border-color,transform] duration-200 hover:border-border-input focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-safe:hover:-translate-y-0.5"
            >
              <Preview>{PREVIEW[entry.type]}</Preview>
              <span className="text-[13px] font-semibold">{entry.label}</span>
              <span className="text-xs text-muted-foreground">{entry.description}</span>
            </button>
          </li>
        ))}
        {COMING_SOON.map((item) => (
          <li key={item.label}>
            <div aria-disabled="true" className={cn("grid h-full gap-2 rounded-lg border border-dashed border-border-strong p-3 text-muted-foreground opacity-80")}>
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
              <span className="flex items-center gap-2 text-[13px] font-semibold">
                <ListChecks aria-hidden="true" className="size-3.5" />
                {item.label}
                <span className="ml-auto rounded-sm border border-border-strong px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider">Pronto</span>
              </span>
              <span className="text-xs">{item.description}</span>
            </div>
          </li>
        ))}
      </ul>
    </ResponsiveSheet>
  );
}
