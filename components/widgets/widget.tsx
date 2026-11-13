import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Widget: la tarjeta de los tableros (Inicio). Esquinas suaves (`--radius-widget`), borde casi invisible y mucho aire; sin sombra.
 * `accent` es la tarjeta de oro (una por tablero, para la cifra que importa). Se compone con `WidgetHead` y los tipos de abajo.
 */
export function Widget({ variant = "default", className, ...props }: React.ComponentProps<"section"> & { variant?: "default" | "accent" }) {
  return (
    <section
      data-slot="widget"
      className={cn(
        "grid min-w-0 grid-cols-1 content-start gap-4 rounded-(--radius-widget) p-5",
        variant === "accent" ? "bg-accent text-ink" : "border border-border/60 bg-card text-card-foreground",
        className,
      )}
      {...props}
    />
  );
}

/** Cabecera: título y subtítulo a la izquierda; a la derecha, el botón circular con flecha (`href` + `actionLabel`) o un nodo propio. */
export function WidgetHead({ id, title, subtitle, href, actionLabel, right, onAccent = false }: { id: string; title: string; subtitle?: string; href?: string; actionLabel?: string; right?: ReactNode; onAccent?: boolean }) {
  return (
    <div className="flex min-h-9 items-start justify-between gap-3">
      <div className="grid min-w-0 gap-0.5">
        <h2 id={id} className="truncate text-ui font-semibold">
          {title}
        </h2>
        {subtitle ? <p className={cn("truncate text-xs", onAccent ? "text-ink/70" : "text-muted-foreground")}>{subtitle}</p> : null}
      </div>
      {href ? (
        <Link
          href={href}
          aria-label={actionLabel ?? title}
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-full outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            onAccent ? "bg-ink/10 hover:bg-ink/20" : "bg-surface-muted hover:bg-accent-subtle",
          )}
        >
          <ArrowUpRight aria-hidden="true" className="size-4" strokeWidth={1.8} />
        </Link>
      ) : (
        right
      )}
    </div>
  );
}

/** Cifra del widget: grande, con tabulares. */
export function WidgetValue({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("text-3xl font-semibold leading-none tracking-tight tabular-nums", className)}>{children}</p>;
}

/** Píldora de variación (+12 %): verde si sube, roja si baja; la flecha y el signo acompañan al color. `null` no pinta nada. */
export function DeltaPill({ value, inverse = false }: { value: number | null | undefined; inverse?: boolean }) {
  if (value == null) return null;
  const up = value > 0;
  const good = value === 0 ? null : inverse ? !up : up;
  return (
    <span className={cn("inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums", good === null ? "bg-surface-muted text-muted-foreground" : good ? "bg-success/15 text-success" : "bg-danger/15 text-danger")}>
      {value === 0 ? "= 0 %" : `${up ? "↗ +" : "↘ −"}${Math.abs(value)} %`}
    </span>
  );
}

/** Fondo rayado de las barras (el «espacio» hasta el máximo). */
const hatch = { backgroundImage: "repeating-linear-gradient(135deg, transparent 0 7px, color-mix(in srgb, var(--border-strong) 45%, transparent) 7px 8px)" };

/**
 * Barras sobre fondo rayado (Analytics): la altura es la parte del mejor valor; el último (hoy) va en oro y los demás en oro suave.
 * Cada barra dice su parte en % y el día debajo; el valor real queda para lectores de pantalla.
 */
export function HatchBars({ values, labels, format, ariaLabel, height = 190 }: { values: number[]; labels: string[]; format: (n: number) => string; ariaLabel: string; height?: number }) {
  const max = Math.max(...values, 0);
  return (
    <ol aria-label={ariaLabel} className="grid h-full gap-2" style={{ gridTemplateColumns: `repeat(${values.length}, minmax(0, 1fr))`, minHeight: height }}>
      {values.map((v, i) => {
        const share = max > 0 ? Math.round((v / max) * 100) : 0;
        const last = i === values.length - 1;
        return (
          <li key={i} className="grid min-h-0 gap-2" style={{ gridTemplateRows: "minmax(0, 1fr) auto" }}>
            <span className="relative flex min-h-0 items-end overflow-hidden rounded-xl" style={hatch}>
              <span className={cn("grid w-full content-start rounded-xl px-0 pt-2 text-center text-2xs font-medium tabular-nums", last ? "bg-accent text-ink" : "bg-accent-subtle text-foreground")} style={{ height: `${Math.max(share, v > 0 ? 8 : 0)}%` }}>
                {share > 0 ? `${share}%` : null}
              </span>
              <span className="sr-only">{`${labels[i]}: ${format(v)}`}</span>
            </span>
            <span aria-hidden="true" className="text-center text-xs text-muted-foreground">
              {labels[i]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** Curva suave (Catmull-Rom → Bézier) por los puntos dados. */
function smooth(points: [number, number][]): string {
  if (points.length < 2) return "";
  let d = `M ${points[0]![0]} ${points[0]![1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]!;
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    const p3 = points[i + 2] ?? p2;
    d += ` C ${p1[0] + (p2[0] - p0[0]) / 6} ${p1[1] + (p2[1] - p0[1]) / 6}, ${p2[0] - (p3[0] - p1[0]) / 6} ${p2[1] - (p3[1] - p1[1]) / 6}, ${p2[0]} ${p2[1]}`;
  }
  return d;
}

/**
 * Línea suave sobre el widget de oro (Estadísticas): guías verticales finas, el punto más alto marcado con su globo de valor y las
 * etiquetas de los extremos debajo. Sin movimiento; el texto alternativo resume el rango y el máximo.
 */
export function LineArea({ values, labels, format, ariaLabel }: { values: number[]; labels: string[]; format: (n: number) => string; ariaLabel: string }) {
  const n = values.length;
  if (n < 2) return null;
  const W = 300;
  const H = 110;
  const max = Math.max(...values, 1);
  // La curva usa el promedio de tres días vecinos para que no salte; el globo y el máximo siguen siendo los valores reales.
  const calm = values.map((_, i) => ((values[i - 1] ?? values[i]!) + values[i]! + (values[i + 1] ?? values[i]!)) / 3);
  const pts: [number, number][] = calm.map((v, i) => [(i / (n - 1)) * W, H - 14 - (v / max) * (H - 34)]);
  const top = values.indexOf(Math.max(...values));
  const left = (top / (n - 1)) * 100;
  return (
    <div className="grid h-full gap-2" style={{ gridTemplateRows: "minmax(0, 1fr) auto" }}>
      <div className="relative h-full pt-8" style={{ minHeight: 140 }}>
        <svg role="img" aria-label={`${ariaLabel}. Máximo ${format(values[top]!)}.`} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="block h-full w-full overflow-visible">
          {Array.from({ length: 7 }).map((_, i) => (
            <line key={i} x1={(i / 6) * W} x2={(i / 6) * W} y1="0" y2={H} stroke="currentColor" strokeOpacity="0.18" vectorEffect="non-scaling-stroke" />
          ))}
          <rect x={pts[top]![0] - 9} y={pts[top]![1]} width="18" height={H - pts[top]![1]} rx="9" fill="currentColor" fillOpacity="0.14" />
          <path d={smooth(pts)} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </svg>
        <span aria-hidden="true" className="absolute top-0 -translate-x-1/2 whitespace-nowrap rounded-full bg-card px-2.5 py-1 text-xs font-semibold tabular-nums text-foreground" style={{ left: `${Math.min(Math.max(left, 12), 88)}%` }}>
          {format(values[top]!)}
        </span>
      </div>
      <div aria-hidden="true" className="flex justify-between text-xs text-ink/70">
        <span>{labels[0]}</span>
        <span>{labels[labels.length - 1]}</span>
      </div>
    </div>
  );
}

/** Ficha de acceso rápido (Request / Send / Receive): icono arriba y nombre; es un enlace o un botón. */
export function QuickTile({ icon: Icon, label, href, onClick }: { icon: LucideIcon; label: string; href?: string; onClick?: () => void }) {
  const cls = "group grid h-full min-w-0 content-center justify-items-center gap-2 rounded-2xl bg-surface-muted/60 px-2 py-4 text-center outline-none transition-colors hover:bg-accent-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
  const body = (
    <>
      <Icon aria-hidden="true" className="size-5 text-foreground" strokeWidth={1.6} />
      <span className="w-full text-xs font-medium leading-tight text-foreground">{label}</span>
    </>
  );
  return href ? (
    <Link href={href} className={cls}>
      {body}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {body}
    </button>
  );
}

/** Fila interior de un widget (tarea, movimiento, cita): fondo gris suave, sin borde. */
export const widgetRow = "rounded-2xl bg-surface-muted/60 p-3.5";
