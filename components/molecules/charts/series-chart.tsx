"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";
import { EASE_OUT, motionOff } from "@/lib/motion";
import { useBox } from "./use-box";

export type Series = {
  name: string;
  values: number[];
  /** `ink` = tinta, `gold` = oro, `soft` = gris. Un solo tono con matices. */
  tone: "ink" | "gold" | "soft";
};

const TONE: Record<Series["tone"], string> = {
  ink: "var(--foreground)",
  gold: "var(--nx-gold-600)",
  soft: "var(--border-strong)",
};

const PAD = { left: 44, right: 8, top: 10, bottom: 22 };
const compact = new Intl.NumberFormat("es-CO", { notation: "compact", maximumFractionDigits: 1 });

/** Techo «redondo» (1, 2, 5 × 10ⁿ) para que las rayas caigan en cifras limpias. */
function niceCeil(value: number): number {
  if (value <= 0) return 0;
  const base = 10 ** Math.floor(Math.log10(value));
  const unit = value / base;
  return (unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 5 ? 5 : 10) * base;
}

/**
 * Gráfico de líneas o de área de una o varias series sobre los mismos puntos
 * (SVG propio, sin librerías). Rellena el alto y el ancho de su contenedor, se
 * revela de izquierda a derecha al aparecer y se recorre con el puntero: una
 * guía y un punto por serie siguen el cursor y la lectura de arriba cambia.
 */
export function SeriesChart({
  labels,
  fulls,
  series,
  area = false,
  format,
  ariaLabel,
}: {
  labels: string[];
  /** Título largo de cada punto, para la lectura. */
  fulls: string[];
  series: Series[];
  area?: boolean;
  format: (n: number) => string;
  ariaLabel: string;
}) {
  const id = `sc${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const [boxRef, { w, h }] = useBox<HTMLDivElement>();
  const svgRef = useRef<SVGSVGElement>(null);
  const [active, setActive] = useState<number | null>(null);
  const n = labels.length;
  const all = series.flatMap((s) => s.values);
  const top = niceCeil(Math.max(0, ...all));
  const bottom = -niceCeil(Math.max(0, -Math.min(0, ...all)));
  const span = top - bottom || 1;
  const innerW = Math.max(1, w - PAD.left - PAD.right);
  const innerH = Math.max(1, h - PAD.top - PAD.bottom);
  const x = (i: number) => PAD.left + (n > 1 ? (i / (n - 1)) * innerW : innerW / 2);
  const y = (v: number) => PAD.top + innerH - ((v - bottom) / span) * innerH;
  const key = series.map((s) => s.values.join(",")).join("|");

  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg || motionOff() || !w) return;
    const animation = svg.animate(
      [{ clipPath: "inset(-6px 100% -6px 0)" }, { clipPath: "inset(-6px -8px -6px 0)" }],
      { duration: 1000, easing: EASE_OUT, fill: "both" },
    );
    animation.onfinish = () => animation.cancel();
    return () => animation.cancel();
  }, [key, w > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  function pick(clientX: number) {
    const el = boxRef.current;
    if (!el || n < 2) return;
    const rect = el.getBoundingClientRect();
    const ratio = (clientX - rect.left - PAD.left) / innerW;
    setActive(Math.max(0, Math.min(n - 1, Math.round(ratio * (n - 1)))));
  }

  const focus = active ?? n - 1;
  const ticks = [0, 1, 2, 3, 4].map((i) => bottom + (span * i) / 4);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <p className="flex min-h-5 flex-wrap items-center gap-x-3 text-xs text-muted-foreground" aria-live="off">
        <span className="font-medium text-foreground">{fulls[focus] ?? ""}</span>
        {series.map((s) => (
          <span key={s.name} className="inline-flex items-center gap-1.5">
            <i aria-hidden="true" className="size-2 shrink-0" style={{ background: TONE[s.tone] }} />
            {s.name} <b className="font-semibold tabular-nums text-foreground">{format(s.values[focus] ?? 0)}</b>
          </span>
        ))}
      </p>
      <div
        ref={boxRef}
        className="relative min-h-0 flex-1 touch-pan-y"
        onPointerMove={(e) => pick(e.clientX)}
        onPointerDown={(e) => pick(e.clientX)}
        onPointerLeave={() => setActive(null)}
      >
        {w > 0 && h > 0 ? (
          <svg ref={svgRef} role="img" aria-label={ariaLabel} width={w} height={h} className="absolute inset-0 block overflow-visible">
            <defs>
              {series.map((s, si) => (
                <linearGradient key={s.name} id={`${id}-${si}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor={TONE[s.tone]} stopOpacity=".2" />
                  <stop offset="1" stopColor={TONE[s.tone]} stopOpacity="0" />
                </linearGradient>
              ))}
            </defs>
            {ticks.map((v, i) => (
              <g key={i}>
                <line x1={PAD.left} x2={w - PAD.right} y1={y(v)} y2={y(v)} className="stroke-border" strokeWidth={1} />
                <text x={PAD.left - 8} y={y(v) + 4} textAnchor="end" className="fill-muted-foreground text-[11px] font-medium">
                  {v === 0 ? "0" : compact.format(v)}
                </text>
              </g>
            ))}
            {series.map((s, si) => {
              const line = s.values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
              return (
                <g key={s.name}>
                  {area ? <path d={`${line} L${x(n - 1).toFixed(1)} ${y(Math.max(0, bottom)).toFixed(1)} L${x(0).toFixed(1)} ${y(Math.max(0, bottom)).toFixed(1)} Z`} fill={`url(#${id}-${si})`} /> : null}
                  <path d={line} fill="none" stroke={TONE[s.tone]} strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" />
                </g>
              );
            })}
            {labels.map((label, i) =>
              i % Math.max(1, Math.ceil(n / Math.max(2, Math.floor(innerW / 48)))) === 0 || i === n - 1 ? (
                <text key={i} x={x(i)} y={h - 6} textAnchor="middle" className="fill-muted-foreground text-[11px] font-medium">
                  {label}
                </text>
              ) : null,
            )}
            {active != null ? (
              <g>
                <line x1={x(active)} x2={x(active)} y1={PAD.top} y2={PAD.top + innerH} className="stroke-border-input" strokeWidth={1} />
                {series.map((s) => (
                  <rect key={s.name} x={x(active) - 3.5} y={y(s.values[active] ?? 0) - 3.5} width={7} height={7} fill={TONE[s.tone]} className="stroke-card" strokeWidth={2} />
                ))}
              </g>
            ) : (
              series.map((s) => <rect key={s.name} x={x(n - 1) - 3} y={y(s.values[n - 1] ?? 0) - 3} width={6} height={6} fill="var(--nx-gold-500)" />)
            )}
          </svg>
        ) : null}
      </div>
    </div>
  );
}
