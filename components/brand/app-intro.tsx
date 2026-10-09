"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Intro de la app (kit "Intro de la app.html").
 * Se muestra UNA vez por sesión de navegador. Secuencia:
 *  1. tracing: el trazo dorado recorre el contorno de la N.
 *  2. filled:  la N se rellena de tinta (ventana al contenido).
 *  3. leaving: el bloque se desvanece hacia la app.
 * Con prefers-reduced-motion se salta directo a "Todo listo".
 */

const N_PATH =
  "M394.83 874.18 L394.83 239.93 L699.27 239.93 L837.22 525.34 L864.18 511.07 L799.96 371.52 L799.96 239.93 L1129.79 239.93 L1129.79 874.18 L815.82 874.18 L704.04 614.93 L677.87 630.79 L725.44 741.77 L725.44 874.18 Z";

export function AppIntro() {
  const [phase, setPhase] = useState<"idle" | "tracing" | "filled" | "leaving">(
    "idle",
  );
  const [shown, setShown] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("nx-intro-shown")) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timers: number[] = [];

    const onDone = () => {
      sessionStorage.setItem("nx-intro-shown", "1");
      setShown(false);
    };

    // Espera breve para que el layout esté listo.
    timers.push(
      window.setTimeout(() => {
        setShown(true);
        if (reduce) {
          setPhase("filled");
          timers.push(window.setTimeout(() => setPhase("leaving"), 400));
          timers.push(window.setTimeout(onDone, 900));
          return;
        }
        setPhase("tracing"); // 1.8 s de trazo
        timers.push(window.setTimeout(() => setPhase("filled"), 1800)); // relleno + THRIVE
        timers.push(window.setTimeout(() => setPhase("leaving"), 2800)); // salida
        timers.push(window.setTimeout(onDone, 3450));
      }, 250),
    );

    return () => timers.forEach((t) => window.clearTimeout(t));
  }, []);

  if (!shown) return null;

  const traceDone = phase !== "tracing";

  return (
    <div
      data-slot="app-intro"
      role="status"
      aria-label="Iniciando NEXUS THRIVE"
      className={`fixed inset-0 z-[90] grid place-items-center overflow-hidden bg-paper transition-opacity duration-500 ${
        phase === "leaving" ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="flex flex-col items-center px-6">
        {/* N con trazo dorado por el contorno */}
        <svg
          aria-hidden="true"
          viewBox="362 157 800 800"
          className="mx-auto h-40 w-40 text-ink sm:h-52 sm:w-52"
        >
          {/* contorno tenue */}
          <path
            d={N_PATH}
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.14"
            strokeWidth="9"
            strokeLinejoin="round"
          />
          {/* relleno de tinta */}
          <path
            d={N_PATH}
            fill="currentColor"
            fillOpacity={traceDone ? 1 : 0}
            style={{
              transition: "fill-opacity 0.6s ease",
            }}
          />
          {/* trazo dorado */}
          <path
            d={N_PATH}
            fill="none"
            stroke="var(--nx-gold-600)"
            strokeWidth="22"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
            strokeDasharray={phase === "tracing" ? "0.22 1" : "0 1"}
            strokeOpacity={phase === "tracing" ? 1 : 0}
            style={{
              transition: "stroke-opacity 0.4s ease",
            }}
          />
        </svg>

        {/* Wordmark en cascada */}
        <div
          aria-hidden="true"
          className="mt-6 flex items-baseline gap-2"
        >
          <span
            className="nx-wordmark font-display text-lg text-ink"
            style={{
              opacity: phase === "tracing" ? 0 : 1,
              filter:
                phase === "tracing" ? "blur(14px)" : "blur(0)",
              transition:
                "opacity 0.9s ease-out, filter 0.9s ease-out",
              transitionDelay: phase === "tracing" ? "0ms" : "150ms",
            }}
          >
            NEXUS
          </span>
          <span
            className="font-stunt text-base italic text-gold-600"
            style={{
              opacity: phase === "tracing" ? 0 : 1,
              filter:
                phase === "tracing" ? "blur(14px)" : "blur(0)",
              transition:
                "opacity 0.9s ease-out, filter 0.9s ease-out",
              transitionDelay: phase === "tracing" ? "0ms" : "240ms",
            }}
          >
            THRIVE
          </span>
        </div>

        <p
          className="sr-only"
          aria-live="polite"
          aria-label={
            phase === "leaving" ? "Todo listo" : "Iniciando NEXUS THRIVE"
          }
        >
          {phase === "leaving" ? "Todo listo" : "Iniciando NEXUS THRIVE"}
        </p>
      </div>
    </div>
  );
}