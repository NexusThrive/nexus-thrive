"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { expoOut, motionOff } from "@/lib/motion";

/**
 * Número que cuenta hasta `value` (y desde el valor anterior cuando cambia).
 * Escribe en el DOM con requestAnimationFrame: no re-renderiza React en cada
 * cuadro. El texto inicial ya es el valor final (SSR y lectores de pantalla).
 */
export function CountUp({
  value,
  format = (n) => Math.round(n).toLocaleString("es-CO"),
  duration = 1200,
  className,
}: {
  value: number;
  format?: (n: number) => string;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const previous = useRef<number | null>(null);
  const formatRef = useRef(format);
  useLayoutEffect(() => {
    formatRef.current = format;
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const from = previous.current ?? 0;
    previous.current = value;
    if (motionOff() || from === value) {
      el.textContent = formatRef.current(value);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const k = Math.min(1, (now - start) / duration);
      el.textContent = formatRef.current(from + (value - from) * expoOut(k));
      if (k < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return (
    <span ref={ref} className={className}>
      {format(value)}
    </span>
  );
}
