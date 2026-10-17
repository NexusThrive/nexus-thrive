"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { expoOut, motionOff } from "@/lib/motion";

/** Formatos con nombre: se pueden pasar desde componentes de servidor. */
const NAMED_FORMATS = {
  number: (n: number) => Math.round(n).toLocaleString("es-CO"),
  cop: (n: number) => `${n < 0 ? "−" : ""}$ ${Math.round(Math.abs(n)).toLocaleString("es-CO")}`,
} as const;

export type CountFormat = keyof typeof NAMED_FORMATS;

/**
 * Número que cuenta hasta `value` (y desde el valor anterior cuando cambia).
 * Escribe en el DOM con requestAnimationFrame: no re-renderiza React en cada
 * cuadro. El texto inicial ya es el valor final (SSR y lectores de pantalla).
 * Desde un componente de servidor usa un formato con nombre (`"cop"`); una
 * función solo se puede pasar desde un componente de cliente.
 */
export function CountUp({
  value,
  format: formatProp = "number",
  duration = 1200,
  className,
}: {
  value: number;
  format?: CountFormat | ((n: number) => string);
  duration?: number;
  className?: string;
}) {
  const format = typeof formatProp === "string" ? NAMED_FORMATS[formatProp] : formatProp;
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
