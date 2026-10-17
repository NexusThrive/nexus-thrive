"use client";

import { useEffect, useId, useRef } from "react";
import { drawPath } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * Minigráfico de tendencia: línea de 1,6 px con relleno degradado y el último
 * punto en un cuadro oro. Se dibuja de izquierda a derecha al aparecer o al
 * cambiar los datos. Decorativo: el dato real va en el texto de la tarjeta.
 */
export function Sparkline({
  values,
  color = "var(--foreground)",
  delay = 250,
  className,
}: {
  values: number[];
  color?: string;
  /** Retraso del trazo (ms), para escalonar varias tarjetas. */
  delay?: number;
  className?: string;
}) {
  // useId puede traer ":" u otros signos que rompen url(#…).
  const id = `spk${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const lineRef = useRef<SVGPathElement>(null);
  const W = 200;
  const H = 38;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const points = values.map((v, i) => [
    (i / Math.max(1, values.length - 1)) * W,
    H - 3 - ((v - min) / range) * (H - 8),
  ]);
  const d = `M${points.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" L")}`;
  const last = points.at(-1) ?? [W, H / 2];
  const key = values.join(",");

  useEffect(() => {
    drawPath(lineRef.current, { delay });
  }, [key, delay]);

  if (values.length < 2) return null;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      className={cn("h-[38px] w-full overflow-visible", className)}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity=".16" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L${W} ${H} L0 ${H} Z`} fill={`url(#${id})`} />
      <path
        ref={lineRef}
        d={d}
        fill="none"
        stroke={color}
        strokeWidth="1.6"
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
      />
      <rect x={last[0] - 3} y={last[1] - 3} width="6" height="6" fill="var(--nx-gold-500)" />
    </svg>
  );
}
