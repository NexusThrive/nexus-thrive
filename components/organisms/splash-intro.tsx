"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { N_PATH, THRIVE_LETTERS } from "@nexus/brand/BrandLogo";

/* ==========================================================================
   Intro de la app — reference/nexus-splash-intro.html (misma geometría y
   curvas; los tiempos se acortaron y la carga se adapta a la página).
   Un único <svg> a pantalla completa SIN viewBox (unidades = px CSS). Cada
   fotograma se actualiza el atributo `transform` del grupo y de la ruta del
   hueco: nunca se escala un SVG con CSS ni se le aplica blur (perdería
   calidad). El contorno usa `vector-effect: non-scaling-stroke` (3 px).
   Solo se muestra al entrar a la app tras iniciar sesión (`AppEntrySplash`: una vez por sesión, cookie `nx-splash`) y tiene tres
   seguros para no quedarse pegado: tope de espera de fuentes, tope de
   carga y `TIMING.failsafe` + la animación CSS de respaldo.
   ========================================================================== */

const MSGS: [number, string][] = [
  [0, "Iniciando NEXUS THRIVE"],
  [20, "Cargando módulos"],
  [40, "Conectando con tu organización"],
  [60, "Preparando caja menor"],
  [80, "Sincronizando datos"],
];

const SHADOW = [
  { dx: 2.772305, dy: 2.165976, opacity: 0.302 },
  { dx: 1.386151, dy: 1.082976, opacity: 0.502 },
  { dx: 0, dy: 0, opacity: 1 },
] as const;

/* Tiempos (ms). La intro se muestra SIEMPRE en cada carga/recarga y se
   adapta: el trazo dura lo que tarde la página (mín/máx), así una carga
   rápida da una intro rápida. `failsafe` es la red de seguridad: pase lo
   que pase, el splash se retira y nunca se queda pegado. */
const TIMING = {
  traceMin: 700,
  traceMax: 2400,
  hold: 380,
  word: 1250,
  dollyPush: 200,
  dollyZoom: 1000,
  fonts: 600,
  failsafe: 9000,
} as const;

type Phase = "tracing" | "filled" | "word" | "leaving";

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}
function smoothstep(x: number) {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
}
function easeInOutQuart(x: number) {
  return x < 0.5 ? 8 * x ** 4 : 1 - (-2 * x + 2) ** 4 / 2;
}

export function SplashIntro({
  progress,
  onDone,
}: {
  /** Progreso real 0..1 (opcional). Se pinta min(real, por-tiempo). */
  progress?: number;
  onDone?: () => void;
}) {
  const [visible, setVisible] = useState(true);
  const [phase, setPhase] = useState<Phase>("tracing");

  const rootRef = useRef<HTMLDivElement>(null);
  const markRef = useRef<SVGGElement>(null);
  const holeRef = useRef<SVGPathElement>(null);
  const fillRef = useRef<SVGPathElement>(null);
  const msgRef = useRef<HTMLParagraphElement>(null);
  const progressRef = useRef(progress ?? 1);
  const lastPaintedRef = useRef(0);
  const msgRef0 = useRef("");

  useEffect(() => {
    if (progress !== undefined) progressRef.current = progress;
  }, [progress]);

  const setMsg = useCallback((text: string) => {
    const host = msgRef.current;
    if (!host || text === msgRef0.current) return;
    msgRef0.current = text;
    host.querySelectorAll(".nx-splash-line").forEach((old) => {
      old.classList.add("is-out");
      window.setTimeout(() => old.remove(), 320);
    });
    const line = document.createElement("span");
    line.className = "nx-splash-line";
    text.split("").forEach((char, i) => {
      const span = document.createElement("span");
      span.className = "nx-splash-ch";
      span.textContent = char;
      span.style.transitionDelay = `${i * 14}ms`;
      line.appendChild(span);
    });
    host.appendChild(line);
    void line.offsetWidth;
    line.classList.add("is-in");
  }, []);

  const clearMsg = useCallback(() => {
    msgRef0.current = "";
    msgRef.current?.replaceChildren();
  }, []);

  const setP = useCallback(
    (p: number) => {
      const clamped = clamp01(p);
      const trace = rootRef.current?.querySelector<SVGPathElement>(".nx-splash-trace");
      if (trace) {
        trace.setAttribute("stroke-dasharray", `${clamped} 1`);
        trace.style.strokeOpacity = clamped > 0 ? "1" : "0";
      }
      const value = Math.round(clamped * 100);
      rootRef.current?.setAttribute("aria-valuenow", String(value));
      let message = MSGS[0][1];
      for (const [threshold, label] of MSGS) {
        if (value >= threshold) message = label;
      }
      setMsg(message);
    },
    [setMsg],
  );

  useEffect(() => {
    const root = rootRef.current;
    const group = markRef.current;
    const hole = holeRef.current;
    const fill = fillRef.current;
    if (!root || !group || !hole || !fill) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let cancelled = false;
    let finished = false;
    let raf = 0;
    const timers: number[] = [];

    // --- Geometría (copia literal) ---
    let W = 0;
    let H = 0;
    let k = 0;
    let ox = 0;
    let oy = 0;
    let currentScale = 1;

    function transform(s: number) {
      return `translate(${ox} ${oy}) scale(${s}) translate(${-ox} ${-oy}) translate(${W / 2} ${H / 2}) scale(${k}) translate(-762.31 -557.06)`;
    }
    function T(s: number) {
      group!.setAttribute("transform", transform(s));
      hole!.setAttribute("transform", transform(s));
      currentScale = s;
    }
    function layout() {
      W = window.innerWidth;
      H = window.innerHeight;
      // El vmin manda; en pantallas pequeñas el logo baja de escala (en CSS
      // hay el mismo corte por si aún no hay JS).
      const m = Math.min(W, H);
      const S = Math.max(m < 640 ? 118 : 150, Math.min(250, (m < 640 ? 0.32 : 0.27) * m));
      k = S / 950;
      // Pivote del dolly = centro de la N = centro del viewport. Antes pivotaba
      // en (540, 560) —222 u a la izquierda del centro— y el zoom salía del
      // lado izquierdo de la N en vez de crecer desde el centro.
      ox = W / 2;
      oy = H / 2;
      root!.style.setProperty("--nx-splash-s", `${S}px`);
      // Recién aquí el grupo está colocado: hasta este momento está oculto
      // (en SSR/escala 1 la N se vería gigante y descentrada).
      root!.dataset.positioned = "1";
      T(currentScale);
    }
    layout();
    window.addEventListener("resize", layout);

    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        timers.push(window.setTimeout(resolve, ms));
      });

    // Retira el splash una sola vez (intro terminada, red de seguridad…).
    function finish() {
      if (finished) return;
      finished = true;
      cancelled = true;
      cancelAnimationFrame(raf);
      setVisible(false);
      onDone?.();
    }

    // --- Carga: trazo lineal. Termina cuando la página está lista (mín
    // `traceMin`, tope `traceMax`) → carga rápida, intro rápida.
    function load(): Promise<void> {
      return new Promise((resolve) => {
        const start = performance.now();
        let pageReady = document.readyState === "complete";
        const onReady = () => {
          pageReady = true;
        };
        if (!pageReady) {
          window.addEventListener("load", onReady, { once: true });
          // Tope duro: aunque "load" no llegue, la intro no espera más.
          timers.push(window.setTimeout(onReady, TIMING.traceMax));
        }
        const tick = (now: number) => {
          if (cancelled) return;
          const t = now - start;
          const timeP = clamp01(t / TIMING.traceMax);
          const painted = Math.max(
            lastPaintedRef.current,
            Math.min(timeP, progressRef.current),
          );
          lastPaintedRef.current = painted;
          setP(painted);
          if (t >= TIMING.traceMin && pageReady) {
            window.removeEventListener("load", onReady);
            setP(1);
            resolve();
            return;
          }
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      });
    }

    // --- Dolly: retroceso + empuje logarítmico ---
    function dolly(): Promise<void> {
      return new Promise((resolve) => {
        const A = TIMING.dollyPush;
        const B = TIMING.dollyZoom;
        const S0 = 0.97;
        const SE = Math.max(30, (Math.max(W, H) * 1.15) / (150 * k));
        const start = performance.now();
        const tick = (now: number) => {
          if (cancelled) return;
          const t = now - start;
          let b = 0;
          let s: number;
          if (t < A) {
            s = 1 - 0.03 * (1 - (1 - t / A) ** 3);
          } else {
            b = Math.min(1, (t - A) / B);
            s = S0 * (SE / S0) ** easeInOutQuart(b);
          }
          T(s);
          const h = smoothstep(b / 0.22);
          hole!.style.fillOpacity = String(h);
          fill!.style.fillOpacity = String(1 - h);
          if (b < 1) {
            raf = requestAnimationFrame(tick);
            return;
          }
          resolve();
        };
        raf = requestAnimationFrame(tick);
      });
    }

    async function intro() {
      if (cancelled) return;
      if (reduce) {
        setP(1);
        setPhase("filled");
        setPhase("word");
        setMsg("Todo listo");
        await wait(800);
        finish();
        return;
      }

      await load();
      if (cancelled) return;
      setPhase("filled");
      setMsg("Todo listo");
      await wait(TIMING.hold);
      setPhase("word");
      await wait(TIMING.word);
      if (cancelled) return;
      // "Todo listo" ya cumplió: se retira ANTES de que arranque el dolly.
      clearMsg();
      setPhase("leaving");
      await dolly();
      finish();
    }

    // Las fuentes no deben bloquear la intro: si no están listas en 600 ms,
    // arranca igual (la Geometría del logo es un path, no depende de fuentes).
    const fontsReady = document.fonts?.ready ?? Promise.resolve();
    Promise.race([fontsReady, wait(TIMING.fonts)])
      .catch(() => {})
      .then(() => wait(120))
      .then(intro);

    // Red de seguridad: pase lo que pase, el splash se retira.
    timers.push(window.setTimeout(finish, TIMING.failsafe));

    return () => {
      cancelled = true;
      finished = true;
      cancelAnimationFrame(raf);
      timers.forEach((t) => window.clearTimeout(t));
      window.removeEventListener("resize", layout);
    };
  }, [onDone, setP, setMsg, clearMsg]);

  if (!visible) return null;

  return (
    <div
      ref={rootRef}
      data-slot="splash-intro"
      role="progressbar"
      aria-label="Iniciando NEXUS THRIVE"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={0}
      className={[
        "nx-splash",
        phase === "filled" || phase === "word" ? "is-filled" : "",
        phase === "word" ? "is-word" : "",
        phase === "leaving" ? "is-leaving" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <svg className="nx-splash-stage" aria-hidden="true">
        <defs>
          <mask
            id="nx-splash-mask"
            maskUnits="userSpaceOnUse"
            x="0"
            y="0"
            width="100%"
            height="100%"
          >
            <rect width="100%" height="100%" fill="#fff" />
            <path ref={holeRef} id="hp" d={N_PATH} fill="#000" fillOpacity={0} />
          </mask>
        </defs>

        <rect
          width="100%"
          height="100%"
          fill="#fff"
          mask="url(#nx-splash-mask)"
        />

        <g ref={markRef} className="nx-splash-mark">
          {/* contorno tenue */}
          <path
            d={N_PATH}
            fill="none"
            stroke="#000"
            strokeOpacity={0.14}
            strokeWidth={8}
            strokeLinejoin="round"
          />
          {/* relleno (se abre como ventana) */}
          <path
            ref={fillRef}
            className="nx-splash-fill"
            d={N_PATH}
            fill="#000"
            fillOpacity={0}
          />
          {/* borde nítido constante */}
          <path
            className="nx-splash-edge"
            d={N_PATH}
            fill="none"
            stroke="#000"
            strokeWidth={3}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            strokeOpacity={0}
          />
          {/* línea de carga */}
          <path
            className="nx-splash-trace"
            d={N_PATH}
            fill="none"
            stroke="#B8921F"
            strokeWidth={18}
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
            strokeDasharray="0 1"
            style={{ strokeOpacity: 0 }}
          />

          {/* THRIVE, exactamente como en el logo */}
          <g role="img" aria-label="THRIVE">
            {THRIVE_LETTERS.map((letter, i) => (
              <g
                key={i}
                className="nx-splash-lt"
                style={{ ["--d" as string]: `${i * 80}ms` }}
              >
                {SHADOW.map((layer, j) => (
                  <path
                    key={j}
                    fill="#000"
                    fillOpacity={layer.opacity}
                    transform={`translate(${letter.x + layer.dx} ${letter.y + layer.dy})`}
                    d={letter.d}
                  />
                ))}
              </g>
            ))}
          </g>
        </g>
      </svg>

      <p ref={msgRef} className="nx-splash-msg" aria-live="polite" />
    </div>
  );
}

export default SplashIntro;
