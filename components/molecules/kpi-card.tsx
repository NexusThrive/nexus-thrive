import type { ReactNode } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { CountFormat } from "@/components/atoms/count-up";
import { KpiTrendBody } from "./kpi-trend-body";
import { cn } from "@/lib/utils";

export type KpiFormat = CountFormat;

/**
 * KPI NEXUS THRIVE: etiqueta + icono discreto arriba, valor Montserrat 600
 * tabular que cuenta hasta su cifra, pie con la variación y una tendencia
 * que se revela al aparecer y se puede recorrer con el puntero (la cifra muestra el valor del punto). Con `href` toda la tarjeta navega (foco de luz
 * oro y hundimiento al presionar). Sin chips de color; con `alert` se
 * antepone un punto rojo de 6 px. Acepta `value` numérico (anima) o texto.
 */
export function KpiCard({
  label,
  value,
  format = "number",
  hint,
  delta,
  trend,
  trendColor,
  icon: Icon,
  alert = false,
  compact = false,
  href,
  index = 0,
  className,
  children,
}: {
  label: string;
  value: number | string;
  format?: KpiFormat;
  hint?: ReactNode;
  /** Variación (normalmente un `<Delta>`). */
  delta?: ReactNode;
  /** Serie para el minigráfico. */
  trend?: number[];
  trendColor?: string;
  icon?: LucideIcon;
  alert?: boolean;
  compact?: boolean;
  href?: string;
  /** Posición en la fila: escalona la entrada y el trazo. */
  index?: number;
  className?: string;
  /** Detalle al pie, separado por una línea (p. ej. desglose por método). */
  children?: ReactNode;
}) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-3 text-[12.5px] text-muted-foreground">
        <span className="flex min-w-0 items-center gap-2">
          {alert && <span aria-hidden="true" className="block size-1.5 shrink-0 bg-danger" />}
          <span className="truncate">{label}</span>
        </span>
        {Icon && <Icon aria-hidden="true" strokeWidth={1.6} className="size-4 shrink-0" />}
      </div>
      <KpiTrendBody value={value} format={format} compact={compact} trend={trend} trendColor={trendColor} delay={250 + index * 80}>
        {delta || hint ? (
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            {delta}
            {hint ? <span>{hint}</span> : null}
          </div>
        ) : null}
      </KpiTrendBody>
      {children ? <div className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">{children}</div> : null}
    </>
  );

  const classes = cn(
    "group/kpi nx-rise nx-spot relative flex h-full flex-col gap-0.5 overflow-hidden rounded-lg border border-border bg-card p-4",
    trend && "min-h-[148px]",
    href && "nx-lift focus-visible:outline-2 focus-visible:outline-ring",
    className,
  );
  const style = { ["--i" as string]: index };

  return href ? (
    <Link href={href} className={classes} style={style} data-press="card">
      {body}
    </Link>
  ) : (
    <div className={classes} style={style}>
      {body}
    </div>
  );
}
