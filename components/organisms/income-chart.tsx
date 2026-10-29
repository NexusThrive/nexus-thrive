"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motionOff } from "@/lib/motion";
import { cn } from "@/lib/utils";

export type ChartPoint = {
  /** Etiqueta corta del eje ("Lun", "14"). */
  label: string;
  /** Título del tooltip ("Lunes 14 de oct."). */
  full: string;
  income: number;
  expenses: number;
  /** Primer y último día que cubre (YYYY-MM-DD, Bogotá); sin ellos el punto no se puede abrir. */
  from?: string;
  to?: string;
  /** Movimientos del punto (`0` = sin movimientos). */
  count?: number;
  /** `empty`: el negocio ya existía y no hubo movimientos; `nodata`: aún no existía (no es un cero). */
  state?: "data" | "empty" | "nodata";
};

const DEFAULT_H = 220;
const PAD_LEFT = 46;
const PAD_BOTTOM = 24;
const PAD_TOP = 10;
const compact = new Intl.NumberFormat("es-CO", { notation: "compact", maximumFractionDigits: 1 });
const cop = (n: number) => `$ ${Math.round(n).toLocaleString("es-CO")}`;

/** Máximo "redondo" del eje para que las rayas caigan en cifras limpias. */
function niceMax(max: number): number {
  if (max <= 0) return 1;
  const step = 10 ** Math.floor(Math.log10(max));
  let nice = Math.ceil(max / step / 2) * step * 2;
  if (nice / max > 2) nice = Math.ceil(max / step) * step;
  return nice;
}

/**
 * Gráfico de barras de ingresos (tinta) y gastos (gris) a escala (DAT·03).
 * Las barras crecen escalonadas al aparecer, el último día va en oro y la
 * información sigue al cursor o al dedo con un tooltip que rebota.
 */
export function IncomeChart({
  data,
  label = "Gráfico de ingresos y gastos",
  height = DEFAULT_H,
  onSelect,
}: {
  data: ChartPoint[];
  label?: string;
  /** Alto del gráfico (px); por defecto 220. */
  height?: number;
  /** Clic (o Enter) en una barra con movimientos: abre sus transacciones. */
  onSelect?: (point: ChartPoint) => void;
}) {
  const H = height;
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(640);
  const [active, setActive] = useState<number | null>(null);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(260, entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const key = data.map((d) => `${d.income}:${d.expenses}`).join(",");
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || motionOff()) return;
    const bars = svg.querySelectorAll<SVGRectElement>("[data-bar]");
    const stagger = bars.length > 28 ? 12 : 35;
    bars.forEach((bar, i) =>
      bar.animate([{ transform: "scaleY(0)" }, { transform: "scaleY(1)" }], {
        duration: 850,
        delay: Math.floor(i / 2) * stagger,
        easing: "cubic-bezier(.16,1,.3,1)",
        fill: "backwards",
      }),
    );
  }, [key]);

  const n = data.length || 1;
  const max = niceMax(Math.max(0, ...data.map((d) => Math.max(d.income, d.expenses))));
  const innerW = width - PAD_LEFT - 6;
  const innerH = H - PAD_BOTTOM - PAD_TOP;
  const gw = innerW / n;
  const bw = Math.max(2, Math.min(18, gw * 0.34));
  const gap = Math.max(1, bw * 0.25);
  const y = (v: number) => PAD_TOP + innerH - (v / max) * innerH;
  const every = n > 14 ? 5 : 1;
  const focus = active ?? n - 1;

  const pick = (clientX: number) => {
    const svg = svgRef.current;
    if (!svg) return;
    const r = svg.getBoundingClientRect();
    const x = ((clientX - r.left) / r.width) * width;
    setActive(Math.max(0, Math.min(n - 1, Math.floor((x - PAD_LEFT) / gw))));
  };

  const selectable = (p: ChartPoint) => Boolean(p.from && p.to && (p.count ?? 1) > 0 && p.state !== "nodata");
  const point = active != null ? data[active] : null;
  const tipX = active != null ? PAD_LEFT + gw * active + gw / 2 : 0;
  const tipY = point ? Math.max(0, y(Math.max(point.income, point.expenses)) - 58) : 0;

  return (
    <div ref={wrapRef} className="relative">
      <svg
        ref={svgRef}
        aria-label={label}
        viewBox={`0 0 ${width} ${H}`}
        style={{ height: H }}
        className={cn("block w-full touch-pan-y overflow-visible outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring", onSelect && point && selectable(point) && "cursor-pointer")}
        onPointerMove={(e) => pick(e.clientX)}
        onPointerDown={(e) => pick(e.clientX)}
        onPointerLeave={() => setActive(null)}
        onClick={() => {
          const at = active != null ? data[active] : null;
          if (at && onSelect && selectable(at)) onSelect(at);
        }}
        onFocus={() => setActive((a) => a ?? n - 1)}
        onBlur={() => setActive(null)}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
            e.preventDefault();
            setActive((a) => Math.max(0, Math.min(n - 1, (a ?? n - 1) + (e.key === "ArrowRight" ? 1 : -1))));
          } else if ((e.key === "Enter" || e.key === " ") && active != null && data[active] && onSelect && selectable(data[active]!)) {
            e.preventDefault();
            onSelect(data[active]!);
          }
        }}
        tabIndex={onSelect ? 0 : undefined}
        role={onSelect ? "group" : "img"}
        aria-roledescription={onSelect ? "gráfico interactivo" : undefined}
      >
        {[0, 1, 2, 3, 4].map((i) => {
          const v = (max * i) / 4;
          const yy = y(v);
          return (
            <g key={i}>
              <line x1={PAD_LEFT} x2={width - 6} y1={yy} y2={yy} className="stroke-border" strokeWidth={1} />
              <text x={PAD_LEFT - 8} y={yy + 4} textAnchor="end" className="fill-muted-foreground text-[11px] font-medium">
                {i ? compact.format(v) : "0"}
              </text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const cx = PAD_LEFT + gw * i + gw / 2;
          const on = i === focus;
          const showLabel = (i % every === 0 || i === n - 1) && (n <= 14 || i < n - 2 || i === n - 1);
          return (
            <g key={`${d.label}-${i}`}>
              {d.state === "nodata" ? (
                <rect x={cx - bw - gap / 2} y={PAD_TOP} width={bw * 2 + gap} height={innerH} className="fill-surface-muted" opacity={on ? 0.9 : 0.5} />
              ) : null}
              {d.state === "empty" ? (
                <line x1={cx - bw - gap / 2} x2={cx + bw + gap / 2} y1={PAD_TOP + innerH - 1} y2={PAD_TOP + innerH - 1} className="stroke-border-strong" strokeWidth={2} strokeDasharray="2 3" />
              ) : null}
              <rect
                data-bar=""
                x={cx - bw - gap / 2}
                y={y(d.income)}
                width={bw}
                height={Math.max(0, PAD_TOP + innerH - y(d.income))}
                style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }}
                className={cn(on ? "fill-accent transition-colors" : "fill-foreground transition-colors", d.state === "nodata" && "hidden")}
              />
              <rect
                data-bar=""
                x={cx + gap / 2}
                y={y(d.expenses)}
                width={bw}
                height={Math.max(0, PAD_TOP + innerH - y(d.expenses))}
                style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }}
                className={cn("fill-border-strong", d.state === "nodata" && "hidden")}
              />
              {showLabel ? (
                <text x={cx} y={H - 6} textAnchor="middle" className="fill-muted-foreground text-[11px] font-medium">
                  {d.label}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      <p className="sr-only" role="status">
        {point ? `${point.full}: ${point.state === "nodata" ? "sin datos" : point.state === "empty" ? "sin movimientos" : `ingresos ${cop(point.income)}, gastos ${cop(point.expenses)}`}` : ""}
      </p>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 whitespace-nowrap rounded-md bg-foreground px-2.5 py-2 text-xs leading-[1.35] text-background transition-[opacity,transform] duration-[260ms] ease-[cubic-bezier(.34,1.3,.64,1)]"
        style={{
          opacity: point ? 1 : 0,
          left: Math.max(70, Math.min(width - 70, tipX)),
          transform: `translate(-50%, ${tipY}px)`,
        }}
      >
        {point ? (
          <>
            <span>{point.full}</span>
            {point.state === "nodata" ? (
              <span className="block opacity-75">Sin datos: el negocio aún no existía</span>
            ) : point.state === "empty" ? (
              <span className="block opacity-75">Sin movimientos</span>
            ) : (
              <>
                <b className="block font-display text-[13px] font-semibold tabular-nums">{cop(point.income)}</b>
                <span className="opacity-75">Gastos {cop(point.expenses)}</span>
                {onSelect && selectable(point) ? <span className="mt-0.5 block text-[11px] opacity-75">Clic para ver los movimientos</span> : null}
              </>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
