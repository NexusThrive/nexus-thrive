"use client";

import { useEffect, useId, useLayoutEffect, useRef } from "react";
import { EASE_OUT, motionOff } from "@/lib/motion";
import { cn } from "@/lib/utils";

const W = 200;
const H = 38;
const DRAW_MS = 1100;

/**
 * Minigráfico de tendencia: línea de 1,6 px con relleno degradado y el último
 * punto en un cuadro oro. Se revela de izquierda a derecha al aparecer o al
 * cambiar los datos (un recorte que avanza hasta el final, sin cortes ni saltos).
 * Con el puntero encima se puede recorrer: una guía y un punto siguen la línea y
 * `onScrub` avisa del índice (o `null` al salir) para que la tarjeta muestre ese
 * valor. Decorativo: el dato real va en el texto de la tarjeta.
 */
export function Sparkline({
  values,
  color = "var(--foreground)",
  delay = 250,
  onScrub,
  className,
}: {
  values: number[];
  color?: string;
  /** Retraso del trazo (ms), para escalonar varias tarjetas. */
  delay?: number;
  /** Valor de la serie bajo el puntero (interpolado entre puntos), o `null` al salir. */
  onScrub?: (value: number | null) => void;
  className?: string;
}) {
  // useId puede traer ":" u otros signos que rompen url(#…).
  const id = `spk${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const svgRef = useRef<SVGSVGElement>(null);
  const dotRef = useRef<HTMLSpanElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  // El puntero se sigue sin React: la guía y el punto se mueven directo en el DOM, un
  // cuadro a la vez (sin estado ni transiciones que arrastren), de forma continua entre puntos.
  const guideRef = useRef<HTMLSpanElement>(null);
  const cursorRef = useRef<HTMLSpanElement>(null);
  const frameRef = useRef(0);
  const pendingX = useRef<number | null>(null);
  const onScrubRef = useRef(onScrub);
  useEffect(() => {
    onScrubRef.current = onScrub;
  });
  useEffect(() => () => cancelAnimationFrame(frameRef.current), []);
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

  // El recorte avanza hasta el 100 % y se retira: la línea termina entera y animada.
  useLayoutEffect(() => {
    const svg = svgRef.current;
    const dot = dotRef.current;
    if (!svg || motionOff()) return;
    const open = "inset(-6px -8px -6px 0)";
    const animation = svg.animate(
      [{ clipPath: "inset(-6px 100% -6px 0)" }, { clipPath: open }],
      { duration: DRAW_MS, delay, easing: EASE_OUT, fill: "both" },
    );
    const dotAnimation = dot?.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: 300,
      delay: delay + DRAW_MS * 0.7,
      easing: "ease-out",
      fill: "both",
    });
    animation.onfinish = () => {
      animation.cancel();
      dotAnimation?.cancel();
    };
    return () => {
      animation.cancel();
      dotAnimation?.cancel();
    };
  }, [key, delay]);

  function paint() {
    frameRef.current = 0;
    const host = hostRef.current;
    const clientX = pendingX.current;
    if (!host || clientX == null || values.length < 2) return;
    const rect = host.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / (rect.width || 1)));
    const pos = ratio * (values.length - 1);
    const i = Math.min(values.length - 2, Math.floor(pos));
    const t = pos - i;
    const y = points[i]![1]! + (points[i + 1]![1]! - points[i]![1]!) * t;
    const left = `${ratio * 100}%`;
    for (const el of [guideRef.current, cursorRef.current]) {
      if (!el) continue;
      el.style.left = left;
      el.dataset.on = "";
    }
    if (dotRef.current) dotRef.current.style.opacity = "0"; // el cuadro del último punto cede al cursor
    if (cursorRef.current) cursorRef.current.style.top = `${(y / H) * 100}%`;
    onScrubRef.current?.(values[i]! + (values[i + 1]! - values[i]!) * t);
  }
  function scrub(event: React.PointerEvent) {
    pendingX.current = event.clientX;
    if (!frameRef.current) frameRef.current = requestAnimationFrame(paint);
  }
  function leave() {
    cancelAnimationFrame(frameRef.current);
    frameRef.current = 0;
    pendingX.current = null;
    for (const el of [guideRef.current, cursorRef.current]) el?.removeAttribute("data-on");
    dotRef.current?.style.removeProperty("opacity");
    onScrubRef.current?.(null);
  }

  if (values.length < 2) return null;
  return (
    <div
      ref={hostRef}
      className={cn("relative h-[38px] w-full touch-pan-y before:absolute before:-inset-y-2 before:inset-x-0 before:content-['']", className)}
      onPointerMove={scrub}
      onPointerDown={scrub}
      onPointerLeave={leave}
      onPointerCancel={leave}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        aria-hidden="true"
        className="absolute inset-0 h-full w-full overflow-visible"
      >
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity=".16" />
            <stop offset="1" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${d} L${W} ${H} L0 ${H} Z`} fill={`url(#${id})`} />
        <path d={d} fill="none" stroke={color} strokeWidth="1.6" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      </svg>
      {/* Marcas en HTML: dentro del SVG estirado (`preserveAspectRatio="none"`) se verían deformadas. */}
      <span
        ref={dotRef}
        aria-hidden="true"
        className="absolute size-1.5 -translate-x-1/2 -translate-y-1/2 bg-[var(--nx-gold-500)] transition-opacity duration-200"
        style={{ left: `${(last[0] / W) * 100}%`, top: `${(last[1] / H) * 100}%` }}
      />
      <span
        ref={guideRef}
        aria-hidden="true"
        className="pointer-events-none absolute -inset-y-1.5 left-full w-px -translate-x-1/2 bg-border-input opacity-0 transition-opacity duration-150 ease-out data-[on]:opacity-100"
      />
      <span
        ref={cursorRef}
        aria-hidden="true"
        className="pointer-events-none absolute left-full top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 scale-50 bg-[var(--nx-gold-500)] opacity-0 shadow-[0_0_0_3px_var(--card)] transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none data-[on]:scale-100 data-[on]:opacity-100"
      />
    </div>
  );
}
