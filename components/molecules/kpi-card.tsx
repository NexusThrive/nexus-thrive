import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight, type LucideIcon } from "lucide-react";
import { ContextHelp } from "@/components/molecules/context-help";
import type { CountFormat } from "@/components/atoms/count-up";
import { KpiTrendBody } from "./kpi-trend-body";
import { cn } from "@/lib/utils";

export type KpiFormat = CountFormat;

/**
 * KPI NEXUS THRIVE: etiqueta + icono discreto arriba, valor Montserrat 600
 * tabular que cuenta hasta su cifra, pie con la variación y una tendencia
 * que se revela al aparecer y se puede recorrer con el puntero (la cifra muestra el valor del punto). Con `href` toda la tarjeta navega (foco de luz
 * oro y hundimiento al presionar). `info` explica cómo se calcula la cifra
 * (toggletip «?») y `action` dice qué se puede hacer con ella («Ver cobros →»;
 * si la tarjeta ya es un enlace, es solo la etiqueta). Sin chips de color; con `alert` se
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
  info,
  action,
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
  /** Cómo se calcula la cifra (ayuda contextual junto a la etiqueta). */
  info?: ReactNode;
  /** Qué hacer con la cifra; con `href` en la tarjeta es solo la etiqueta del enlace. */
  action?: { label: string; href?: string };
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
          {info ? <span className="relative">
            <ContextHelp topic={label.toLowerCase()}>{info}</ContextHelp>
          </span> : null}
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
      {action ? (
        action.href && !href ? (
          <Link href={action.href} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-accent-text hover:underline focus-visible:outline-2 focus-visible:outline-ring">
            {action.label} <ArrowUpRight aria-hidden="true" className="size-3.5" />
          </Link>
        ) : (
          <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-accent-text">
            {action.label} <ArrowUpRight aria-hidden="true" className="size-3.5" />
          </span>
        )
      ) : null}
      {children ? <div className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">{children}</div> : null}
    </>
  );

  const classes = cn(
    "group/kpi nx-rise nx-spot relative flex h-full flex-col gap-0.5 overflow-hidden rounded-lg border border-border bg-card p-4",
    trend && "min-h-[148px]",
    href && "nx-lift has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-ring",
    className,
  );
  const style = { ["--i" as string]: index };

  // Con `href`, la tarjeta entera navega por un enlace que la cubre (no la envuelve): así la ayuda «?»
  // de dentro es un botón real y no un control anidado en un enlace.
  return (
    <div className={classes} style={style} data-press={href ? "card" : undefined}>
      {href ? <Link href={href} aria-label={label} className="absolute inset-0 rounded-lg outline-none" /> : null}
      {body}
    </div>
  );
}
