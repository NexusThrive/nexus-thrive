"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { formatCount, type CountFormat } from "@/components/atoms/count-up";
import { RollingNumber } from "@/components/atoms/rolling-number";
import { cn } from "@/lib/utils";

/** Barras del minigráfico: las últimas de la serie (como el bento, una docena basta para leer la tendencia). */
const MAX_BARS = 14;

/**
 * Valor + tendencia de un `KpiCard` con la parte interactiva: la cifra crece
 * con el hover de la tarjeta (`group/kpi`) y, al recorrer las barras con el
 * puntero, la cifra rueda hasta el valor de esa barra (los últimos dígitos corren
 * con enfoque); al salir rueda de vuelta a la cifra del KPI. Las barras crecen
 * desde abajo al aparecer, escalonadas. Va aparte para que `KpiCard` siga siendo de servidor.
 */
export function KpiTrendBody({
  value,
  format,
  compact,
  featured = false,
  trend,
  trendColor,
  delay,
  children,
}: {
  value: number | string;
  format: CountFormat;
  compact: boolean;
  /** Pieza principal del bento: cifra grande. */
  featured?: boolean;
  trend?: number[];
  trendColor?: string;
  delay: number;
  /** Variación y pista, que van entre la cifra y la línea. */
  children?: ReactNode;
}) {
  const [point, setPoint] = useState<number | null>(null); // valor de la barra bajo el puntero
  const [hovered, setHovered] = useState<number | null>(null);
  const bars = trend?.slice(-MAX_BARS) ?? [];
  const max = Math.max(...bars, 0);
  const min = Math.min(...bars, 0);
  const scrubbing = point != null && trend != null;
  // Caracteres de la cifra final (no la del punto bajo el puntero, para que el tamaño no salte al recorrer la línea).
  const chars = (typeof value === "number" ? formatCount(format, value) : String(value)).length;

  return (
    <>
      {/* La cifra se ajusta al ancho de su propia tarjeta (consulta de contenedor), no al de la pantalla: con dos columnas
          y una cifra larga se reducía poco y se cortaba. Tamaño habitual de arriba (máx.) y 16 px de suelo. 0,6 em por
          carácter (medido: 0,55–0,59) deja el margen del 8 % que crece al pasar el puntero. */}
      <div className="@container">
        <p
          style={{ "--nx-chars": Math.max(chars, 1) } as CSSProperties}
          className={cn(
            "relative mt-3 origin-left whitespace-nowrap font-display font-normal tabular-nums tracking-tighter text-foreground transition-transform duration-300 ease-[var(--nx-ease-out)] group-hover/kpi:scale-[1.06] motion-reduce:transform-none motion-reduce:transition-none",
            featured
              ? "text-[length:min(clamp(2.5rem,6vw,3.75rem),max(1.25rem,calc(100cqw/(var(--nx-chars)*0.6))))] leading-none"
              : compact
                ? "text-[length:min(1.75rem,max(1rem,calc(100cqw/(var(--nx-chars)*0.6))))] leading-9"
                : "text-[length:min(clamp(1.5rem,3.6vw,1.875rem),max(1rem,calc(100cqw/(var(--nx-chars)*0.6))))] leading-[1.15]",
          )}
        >
          {typeof value === "number" || scrubbing ? (
            <RollingNumber value={scrubbing ? point : (value as number)} format={format} />
          ) : (
            value
          )}
        </p>
      </div>
      {children}
      {bars.length > 1 ? (
        // Barras redondeadas del bento, alineadas abajo a la derecha. Decorativas: el dato real va en la cifra.
        <div
          aria-hidden="true"
          className="relative mt-auto flex h-10 items-end justify-end gap-1 pt-3"
          onPointerLeave={() => {
            setPoint(null);
            setHovered(null);
          }}
        >
          {bars.map((bar, i) => (
            <span
              key={i}
              onPointerEnter={() => {
                setPoint(bar);
                setHovered(i);
              }}
              className={cn(
                "w-1.5 origin-bottom rounded-full bg-foreground transition-opacity duration-200 animate-[nx-bar-grow_0.7s_var(--nx-ease-out)_backwards]",
                hovered != null && hovered !== i && "opacity-35",
              )}
              style={{
                height: `${max === min ? 60 : 12 + ((bar - min) / (max - min)) * 88}%`,
                animationDelay: `${delay + i * 30}ms`,
                backgroundColor: trendColor,
              }}
            />
          ))}
        </div>
      ) : null}
    </>
  );
}
