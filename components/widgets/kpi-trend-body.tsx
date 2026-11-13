"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { formatCount, type CountFormat } from "@/components/atoms/count-up";
import { RollingNumber } from "@/components/atoms/rolling-number";
import { Sparkline } from "@/components/atoms/sparkline";
import { cn } from "@/lib/utils";

/**
 * Valor + tendencia de un `KpiCard` con la parte interactiva: la cifra crece
 * con el hover de la tarjeta (`group/kpi`) y, al recorrer la línea con el
 * puntero la cifra rueda hasta el valor de ese punto (los últimos dígitos corren
 * con enfoque); al salir rueda de vuelta a la cifra del KPI. Va aparte para que `KpiCard` siga siendo de servidor.
 */
export function KpiTrendBody({
  value,
  format,
  compact,
  trend,
  trendColor,
  delay,
  children,
}: {
  value: number | string;
  format: CountFormat;
  compact: boolean;
  trend?: number[];
  trendColor?: string;
  delay: number;
  /** Variación y pista, que van entre la cifra y la línea. */
  children?: ReactNode;
}) {
  const [point, setPoint] = useState<number | null>(null); // valor bajo el puntero (interpolado)
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
            "mt-1.5 origin-left whitespace-nowrap font-display font-semibold tabular-nums tracking-[-0.015em] text-foreground transition-transform duration-300 ease-[var(--nx-ease-out)] group-hover/kpi:scale-[1.08] motion-reduce:transform-none motion-reduce:transition-none",
            compact
              ? "text-[length:min(1.5rem,max(1rem,calc(100cqw/(var(--nx-chars)*0.6))))] leading-8"
              : "text-[length:min(clamp(1.25rem,3.6vw,1.75rem),max(1rem,calc(100cqw/(var(--nx-chars)*0.6))))] leading-[1.2]",
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
      {trend ? (
        <div className="mt-auto pt-2">
          <Sparkline
            values={trend}
            color={trendColor}
            delay={delay}
            onScrub={(scrubbedValue) => {
              setPoint(scrubbedValue);
            }}
          />
        </div>
      ) : null}
    </>
  );
}
