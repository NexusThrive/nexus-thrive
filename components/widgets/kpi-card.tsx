import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight, type LucideIcon } from "lucide-react";
import { ContextHelp } from "@/components/molecules/context-help";
import type { CountFormat } from "@/components/atoms/count-up";
import { KpiTrendBody } from "./kpi-trend-body";
import { cn } from "@/lib/utils";

export type KpiFormat = CountFormat;

/**
 * KPI NEXUS THRIVE con el estilo bento: tarjeta de radio 24 sobre gris suave, etiqueta en versalitas espaciadas, icono en un
 * círculo claro, cifra grande y apretada que cuenta hasta su valor, pie con la variación y la tendencia en barras redondeadas
 * que crecen al aparecer y se pueden recorrer con el puntero (la cifra muestra el valor de la barra). La destacada (`inverse`)
 * es la pieza principal del bento: tinta con rayas diagonales que se desvanecen, la etiqueta en una píldora y la cifra en grande. Con `href` toda la tarjeta navega (foco de luz
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
  inverse = false,
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
  /** Tarjeta destacada (la principal del bento): tinta con rayas diagonales y cifra grande (tokens del tema oscuro). Una por pantalla. */
  inverse?: boolean;
  className?: string;
  /** Detalle al pie, separado por una línea (p. ej. desglose por método). */
  children?: ReactNode;
}) {
  const body = (
    <>
      {inverse ? (
        // Rayas diagonales de la pieza principal: nacen arriba a la derecha y se desvanecen hacia la cifra.
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(45deg,var(--foreground-muted)_0px_1px,transparent_1px_10px)] opacity-30 mask-[radial-gradient(ellipse_80%_50%_at_100%_0%,var(--nx-ink)_70%,transparent_110%)]"
        />
      ) : null}
      <div className="relative flex items-start justify-between gap-3">
        <span
          className={cn(
            "flex min-w-0 items-center gap-2 font-semibold uppercase tracking-widest text-muted-foreground",
            inverse ? "rounded-full bg-foreground/10 px-3 py-1 text-2xs text-foreground/60" : "text-2xs",
          )}
        >
          {alert && <span aria-hidden="true" className="block size-1.5 shrink-0 rounded-full bg-danger" />}
          <span className="truncate">{label}</span>
          {info ? <span className="relative normal-case tracking-normal max-sm:hidden">
            <ContextHelp topic={label.toLowerCase()}>{info}</ContextHelp>
          </span> : null}
        </span>
        {Icon && !inverse ? (
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-background text-foreground shadow-sm">
            <Icon aria-hidden="true" strokeWidth={1.6} className="size-[18px]" />
          </span>
        ) : null}
      </div>
      <KpiTrendBody value={value} format={format} compact={compact} featured={inverse} trend={trend} trendColor={trendColor} delay={250 + index * 80}>
        {delta || hint ? (
          <div className={cn("relative flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground", inverse && "mt-auto max-w-xs pt-6 text-sm text-foreground/60")}>
            {delta}
            {hint ? <span className="max-sm:hidden">{hint}</span> : null}
          </div>
        ) : null}
      </KpiTrendBody>
      {action ? (
        action.href && !href ? (
          <Link href={action.href} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-accent-text max-sm:hidden hover:underline focus-visible:outline-2 focus-visible:outline-ring">
            {action.label} <ArrowUpRight aria-hidden="true" className="size-3.5" />
          </Link>
        ) : (
          <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-accent-text max-sm:hidden">
            {action.label} <ArrowUpRight aria-hidden="true" className="size-3.5" />
          </span>
        )
      ) : null}
      {children ? <div className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">{children}</div> : null}
    </>
  );

  const classes = cn(
    "group/kpi nx-rise nx-spot relative flex h-full flex-col gap-0.5 overflow-hidden rounded-3xl border border-border bg-surface-muted p-5 sm:p-6",
    trend && "min-h-[132px] sm:min-h-[164px]",
    href && "nx-lift has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-ring",
    inverse && "dark min-h-[180px] border-transparent bg-background sm:min-h-[220px] sm:p-8",
    className,
  );
  const style = { ["--i" as string]: index };

  // Con `href`, la tarjeta entera navega por un enlace que la cubre (no la envuelve): así la ayuda «?»
  // de dentro es un botón real y no un control anidado en un enlace.
  return (
    <div className={classes} style={style} data-press={href ? "card" : undefined}>
      {href ? <Link href={href} aria-label={label} className="absolute inset-0 rounded-3xl outline-none" /> : null}
      {body}
    </div>
  );
}
