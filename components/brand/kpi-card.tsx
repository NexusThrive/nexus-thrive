import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * KPI NEXUS THRIVE: etiqueta + icono discreto arriba, valor en Montserrat 600
 * tabular-nums, pie de una línea. Sin chips de color. Con `alert` se antepone
 * un punto cuadrado de 6 px (el número sigue en tinta). Altura automática y
 * `h-full` para que las tarjetas de una fila se estiren.
 */
export function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  alert = false,
  compact = false,
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
  /** Muestra el punto de alerta real (#B3261E) antes de la etiqueta. */
  alert?: boolean;
  /** 24 px en lugar de 28 px (tarjetas compactas). */
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-full flex-col rounded-lg border border-border bg-card p-5",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2">
          {alert && (
            <span aria-hidden="true" className="block size-1.5 shrink-0 bg-danger" />
          )}
          <span className="truncate text-[13px] text-muted-foreground">{label}</span>
        </span>
        {Icon && (
          <Icon
            aria-hidden="true"
            strokeWidth={1.5}
            className="size-[18px] shrink-0 text-muted-foreground"
          />
        )}
      </div>

      <p
        className={cn(
          "mt-2 font-display font-semibold tabular-nums text-foreground",
          compact ? "text-2xl leading-8" : "text-[28px] leading-9",
        )}
      >
        {value}
      </p>

      {hint && (
        <p className="mt-auto pt-2 text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}
