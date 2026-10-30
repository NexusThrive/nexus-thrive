"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { expoOut, motionOff } from "@/lib/motion";
import { formatCount, type CountFormat } from "./count-up";

/** Cuántos dígitos del final «corren» con enfoque mientras la cifra se mueve. */
const TRAIL = 3;

/**
 * Cifra que rueda hasta su valor: cuenta desde el valor anterior (desde cero la
 * primera vez) y los últimos dígitos corren con un fundido y desenfoque que se
 * aclara al asentarse. Escribe en el DOM con requestAnimationFrame (sin
 * re-renderizar React por cuadro). El texto inicial ya es el valor final (SSR y
 * lectores de pantalla). Con movimiento reducido solo cambia el texto.
 */
export function RollingNumber({
  value,
  format = "number",
  duration = 380,
  firstDuration = 1200,
  className,
}: {
  value: number;
  format?: CountFormat;
  /** Duración de cada cambio de valor (ms). */
  duration?: number;
  /** Duración del primer conteo desde cero (ms). */
  firstDuration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const shown = useRef<number | null>(null);
  const formatRef = useRef(format);
  useLayoutEffect(() => {
    formatRef.current = format;
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const first = shown.current == null;
    const from = shown.current ?? 0;
    const settle = () => {
      el.textContent = formatCount(formatRef.current, value);
      shown.current = value;
    };
    if (motionOff() || from === value) {
      settle();
      return;
    }
    // Primer conteo: curva expo desde cero. Después, la cifra persigue su objetivo con un
    // suavizado exponencial por cuadro: al moverse el puntero sigue fluida, sin reiniciar
    // curvas, y al estar lejos (volver al total) rueda más rápido.
    let frame = 0;
    let last = performance.now();
    const start = last;
    const draw = (current: number, rest: number) => {
      const chars = Array.from(formatCount(formatRef.current, current));
      el.replaceChildren(
        ...chars.map((char, i) => {
          const span = document.createElement("span");
          span.textContent = char;
          const fromEnd = chars.length - 1 - i;
          if (fromEnd < TRAIL && /\d/.test(char)) {
            const weight = (TRAIL - fromEnd) / TRAIL; // el último dígito, el más suelto
            span.style.display = "inline-block";
            span.style.filter = `blur(${(rest * 2.4 * weight).toFixed(2)}px)`;
            span.style.opacity = String(1 - rest * 0.45 * weight);
            span.style.transform = `translateY(${(rest * 3 * weight).toFixed(2)}px)`;
          }
          return span;
        }),
      );
    };
    const tick = (now: number) => {
      let current: number;
      let rest: number;
      if (first) {
        const k = Math.min(1, (now - start) / firstDuration);
        current = from + (value - from) * expoOut(k);
        rest = 1 - k;
        if (k >= 1) {
          settle();
          return;
        }
      } else {
        const dt = Math.min(48, now - last);
        last = now;
        const prev = shown.current ?? from;
        current = prev + (value - prev) * (1 - Math.exp(-dt / (duration / 4.5)));
        const gap = Math.abs(value - current);
        if (gap < 0.5) {
          settle();
          return;
        }
        rest = Math.min(1, gap / Math.max(1, Math.abs(value) * 0.04));
      }
      shown.current = current;
      draw(current, rest);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration, firstDuration]);

  return (
    <span ref={ref} className={className}>
      {formatCount(format, value)}
    </span>
  );
}
