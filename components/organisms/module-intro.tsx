"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { N_PATH } from "@/components/atoms/n-path";

/* ==========================================================================
   Carga 12 · Entrada a un módulo (reference/nexus-loaders.html, bloque
   "Entrada a un módulo"). Dentro del panel: la N se traza, se rellena y se
   abre como ventana con bordes siempre nítidos (vector-effect). Se muestra
   la primera vez por sesión y por módulo. Duración total ≤ 4 s.
   Valores copiados literalmente de la referencia; no aproximar.
   ========================================================================== */

const A = 762.31;
const B = 557.06;

function easeInOutQuart(x: number) {
  return x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2;
}

function smoothstep(x: number) {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
}

export function ModuleIntro({
  moduleKey,
  className,
  children,
}: {
  /** Identifica el módulo: la intro corre una vez por sesión y por clave. */
  moduleKey: string;
  className?: string;
  children: React.ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const groupRef = useRef<SVGGElement>(null);
  const holeRef = useRef<SVGPathElement>(null);
  const backdropRef = useRef<SVGRectElement>(null);
  const fillRef = useRef<SVGPathElement>(null);
  const edgeRef = useRef<SVGPathElement>(null);
  const traceRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const svg = svgRef.current;
    const group = groupRef.current;
    const hole = holeRef.current;
    const backdrop = backdropRef.current;
    const fill = fillRef.current;
    const edge = edgeRef.current;
    const trace = traceRef.current;
    if (!root || !svg || !group || !hole || !backdrop || !fill || !edge || !trace) {
      return;
    }

    const sessionKey = `nx-module:${moduleKey}`;
    svg.style.display = "none";
    if (sessionStorage.getItem(sessionKey)) return;

    const timers: number[] = [];
    let raf = 0;
    let cancelled = false;

    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        timers.push(window.setTimeout(resolve, ms));
      });

    const tw = (duration: number, step: (x: number) => void) =>
      new Promise<void>((resolve) => {
        const start = performance.now();
        const tick = (now: number) => {
          if (cancelled) return;
          const x = Math.min(1, (now - start) / duration);
          step(x);
          if (x < 1) {
            raf = requestAnimationFrame(tick);
          } else {
            resolve();
          }
        };
        raf = requestAnimationFrame(tick);
      });

    async function run() {
      const W = root!.clientWidth;
      const H = root!.clientHeight;
      const S = Math.min(120, H * 0.6);
      const k = S / 800;
      const ox = W / 2 + (540 - A) * k;
      const oy = H / 2 + (560 - B) * k;
      const SE = Math.max(30, (Math.max(W, H) * 1.15) / (150 * k));

      const transform = (s: number) =>
        `translate(${ox} ${oy}) scale(${s}) translate(${-ox} ${-oy}) translate(${W / 2} ${H / 2}) scale(${k}) translate(${-A} ${-B})`;
      const T = (s: number) => {
        const t = transform(s);
        group!.setAttribute("transform", t);
        hole!.setAttribute("transform", t);
      };

      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce) {
        sessionStorage.setItem(sessionKey, "1");
        return;
      }

      // Reset al montar / al cambiar de módulo.
      svg!.style.display = "block";
      backdrop!.style.opacity = "0";
      fill!.style.transition = "none";
      fill!.style.fillOpacity = "0";
      edge!.style.strokeOpacity = "0";
      hole!.style.fillOpacity = "0";
      trace!.style.strokeDasharray = "0 1";
      trace!.style.strokeOpacity = "0";
      T(1);
      void svg!.getBoundingClientRect();
      backdrop!.style.transition = "opacity .2s ease";
      backdrop!.style.opacity = "1";

      // Trazo → relleno → ventana.
      await tw(1200, (x) => {
        trace!.style.strokeDasharray = `${x} 1`;
        trace!.style.strokeOpacity = x > 0 ? "1" : "0";
      });

      fill!.style.transition = "fill-opacity .5s ease";
      fill!.style.fillOpacity = "1";
      edge!.style.strokeOpacity = "1";
      trace!.style.strokeOpacity = "0";

      await wait(700);

      fill!.style.transition = "none";
      await tw(1200, (x) => {
        let s: number;
        let b = 0;
        if (x < 0.14) {
          s = 1 - 0.03 * (1 - Math.pow(1 - x / 0.14, 3));
        } else {
          b = (x - 0.14) / 0.86;
          s = 0.97 * Math.pow(SE / 0.97, easeInOutQuart(b));
        }
        T(s);
        const h = smoothstep(b / 0.22);
        hole!.style.fillOpacity = String(h);
        fill!.style.fillOpacity = String(1 - h);
      });

      await wait(700);
      svg!.style.display = "none";
      sessionStorage.setItem(sessionKey, "1");
    }

    run();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [moduleKey]);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      {children}
      <svg
        ref={svgRef}
        aria-hidden="true"
        style={{ display: "none" }}
        className="pointer-events-none absolute inset-0 h-full w-full"
      >
        <defs>
          <mask
            id={`nx-module-mask-${moduleKey}`}
            maskUnits="userSpaceOnUse"
            x="0"
            y="0"
            width="100%"
            height="100%"
          >
            <rect width="100%" height="100%" fill="#fff" />
            <path ref={holeRef} d={N_PATH} fill="#000" fillOpacity={0} />
          </mask>
        </defs>

        <rect
          ref={backdropRef}
          width="100%"
          height="100%"
          fill="var(--surface)"
          mask={`url(#nx-module-mask-${moduleKey})`}
        />

        <g ref={groupRef}>
          <path
            d={N_PATH}
            fill="none"
            stroke="var(--foreground)"
            strokeOpacity={0.18}
            strokeWidth={8}
            strokeLinejoin="round"
          />
          <path
            ref={fillRef}
            d={N_PATH}
            fill="var(--foreground)"
            fillOpacity={0}
          />
          <path
            ref={edgeRef}
            d={N_PATH}
            fill="none"
            stroke="var(--foreground)"
            strokeWidth={2.5}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            strokeOpacity={0}
          />
          <path
            ref={traceRef}
            d={N_PATH}
            fill="none"
            stroke="var(--accent-hover)"
            strokeWidth={18}
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
            strokeDasharray="0 1"
            strokeOpacity={0}
          />
        </g>
      </svg>
    </div>
  );
}

/**
 * Envuelve el contenido de un módulo y dispara la intro una vez por sesión
 * según el primer segmento de la ruta (`/{tenant}/{modulo}`).
 */
export function ModuleEntry({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const moduleKey = pathname?.split("/")[2] || "dashboard";
  return <ModuleIntro moduleKey={moduleKey}>{children}</ModuleIntro>;
}

export default ModuleIntro;
