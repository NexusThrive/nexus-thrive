import type { ReactNode } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { CountUp } from "@/components/atoms/count-up";
import { Sparkline } from "@/components/atoms/sparkline";
import { cn } from "@/lib/utils";

export type KpiFormat = "number" | "cop";

const FORMATTERS: Record<KpiFormat, (n: number) => string> = {
  number: (n) => Math.round(n).toLocaleString("es-CO"),
  cop: (n) => `${n < 0 ? "−" : ""}$ ${Math.round(Math.abs(n)).toLocaleString("es-CO")}`,
};

/**
 * KPI NEXUS THRIVE: etiqueta + icono discreto arriba, valor Montserrat 600
 * tabular que cuenta hasta su cifra, pie con la variación y una tendencia
 * que se dibuja al aparecer. Con `href` toda la tarjeta navega (foco de luz
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
      <p
        className={cn(
          "mt-1.5 whitespace-nowrap font-display font-semibold tabular-nums tracking-[-0.015em] text-foreground",
          compact ? "text-2xl leading-8" : "text-[clamp(20px,3.6vw,28px)] leading-[1.2]",
        )}
      >
        {typeof value === "number" ? <CountUp value={value} format={FORMATTERS[format]} /> : value}
      </p>
      {delta || hint ? (
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          {delta}
          {hint ? <span>{hint}</span> : null}
        </div>
      ) : null}
      {trend ? (
        <Sparkline values={trend} color={trendColor} delay={250 + index * 80} className="mt-auto pt-2" />
      ) : null}
    </>
  );

  const classes = cn(
    "nx-rise nx-spot relative flex h-full flex-col gap-0.5 overflow-hidden rounded-lg border border-border bg-card p-4",
    trend && "min-h-[148px]",
    href && "transition-colors duration-200 hover:border-border-input focus-visible:outline-2 focus-visible:outline-ring",
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
