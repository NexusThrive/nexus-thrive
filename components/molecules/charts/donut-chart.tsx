"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { EASE_OUT, motionOff } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { useBox } from "./use-box";

const R = 36;
const C = 2 * Math.PI * R;
const cop = (n: number) => `$ ${Math.round(n).toLocaleString("es-CO")}`;

/** Oro para el mayor; el resto, tinta que se aclara (un solo tono con matices). */
const shade = (i: number) => (i === 0 ? { fill: "var(--nx-gold-500)", opacity: 1 } : { fill: "var(--foreground)", opacity: Math.max(0.16, 0.7 - (i - 1) * 0.16) });

/**
 * Dona de reparto (p. ej. ingresos por método de pago). Los arcos se dibujan
 * escalonados al aparecer; al pasar por un arco o por su fila de la leyenda, el
 * centro dice cuánto y qué porcentaje es. Rellena su contenedor: con espacio
 * ancho la leyenda va al lado, si no, debajo.
 */
export function DonutChart({ parts, ariaLabel }: { parts: { label: string; total: number }[]; ariaLabel: string }) {
  const [boxRef, { w, h }] = useBox<HTMLDivElement>();
  const ringRef = useRef<SVGSVGElement>(null);
  const [active, setActive] = useState<number | null>(null);
  const items = parts.filter((p) => p.total > 0).sort((a, b) => b.total - a.total);
  const total = items.reduce((sum, p) => sum + p.total, 0);
  const wide = w > h * 1.25;
  const key = items.map((p) => p.total).join(",");

  useLayoutEffect(() => {
    const arcs = ringRef.current?.querySelectorAll<SVGCircleElement>("[data-arc]");
    if (!arcs || motionOff()) return;
    const animations = Array.from(arcs).map((arc, i) =>
      arc.animate([{ strokeDasharray: `0 ${C}` }, { strokeDasharray: arc.getAttribute("stroke-dasharray") ?? "" }], {
        duration: 800,
        delay: i * 90,
        easing: EASE_OUT,
        fill: "backwards",
      }),
    );
    return () => animations.forEach((a) => a.cancel());
  }, [key]);

  if (total <= 0) return <p className="grid h-full place-items-center text-center text-sm text-muted-foreground">Aún no hay ingresos este mes.</p>;

  const starts = items.map((_, i) => items.slice(0, i).reduce((sum, p) => sum + (p.total / total) * C, 0));
  const focus = active != null ? items[active] : null;
  return (
    <div ref={boxRef} className={cn("flex h-full min-h-0 items-center gap-4", wide ? "flex-row" : "flex-col justify-center")}>
      <div className="relative aspect-square min-h-0 shrink-0" style={{ height: wide ? "100%" : Math.max(96, h - items.length * 24 - 16), maxHeight: "100%" }}>
        <svg ref={ringRef} role="img" aria-label={ariaLabel} viewBox="0 0 100 100" className="size-full -rotate-90 overflow-visible">
          <circle cx="50" cy="50" r={R} fill="none" className="stroke-border" strokeWidth={14} />
          {items.map((p, i) => {
            const len = (p.total / total) * C;
            const start = starts[i]!;
            const s = shade(i);
            return (
              <circle
                key={p.label}
                data-arc=""
                cx="50"
                cy="50"
                r={R}
                fill="none"
                stroke={s.fill}
                strokeOpacity={active == null || active === i ? s.opacity : 0.25}
                strokeWidth={active === i ? 16 : 14}
                strokeDasharray={`${Math.max(0, len - 1.5)} ${C}`}
                strokeDashoffset={-start}
                className="cursor-default transition-[stroke-opacity,stroke-width] duration-200"
                onPointerEnter={() => setActive(i)}
                onPointerLeave={() => setActive(null)}
              />
            );
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 grid place-content-center text-center leading-tight">
          <span className="text-[11px] text-muted-foreground">{focus ? focus.label : "Total del mes"}</span>
          <b className="font-display text-[clamp(14px,2.4vw,20px)] font-semibold tabular-nums">{cop(focus ? focus.total : total)}</b>
          {focus ? <span className="text-[11px] text-muted-foreground">{Math.round((focus.total / total) * 100)} %</span> : null}
        </div>
      </div>
      <ul className={cn("grid min-w-0 gap-1 text-[12.5px]", wide ? "flex-1" : "w-full")}>
        {items.map((p, i) => (
          <li
            key={p.label}
            onPointerEnter={() => setActive(i)}
            onPointerLeave={() => setActive(null)}
            className={cn("flex items-center gap-2 rounded-sm px-1.5 py-0.5 transition-colors", active === i && "bg-surface-muted")}
          >
            <i aria-hidden="true" className="size-2.5 shrink-0" style={{ background: shade(i).fill, opacity: shade(i).opacity }} />
            <span className="min-w-0 flex-1 truncate text-muted-foreground">{p.label}</span>
            <b className="font-semibold tabular-nums">{Math.round((p.total / total) * 100)} %</b>
          </li>
        ))}
      </ul>
    </div>
  );
}
