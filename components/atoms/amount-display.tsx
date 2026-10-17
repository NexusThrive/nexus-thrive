"use client";

import { useEffect, useRef } from "react";
import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * Cifra grande del cobro: símbolo pequeño arriba y el valor en Montserrat
 * 700 tabular. Cada cambio la hace saltar (escala 1,06 → 1 con resorte
 * 700 · 15), como en el teclado del artefacto.
 */
export function AmountDisplay({ value, symbol = "$", className }: { value: number; symbol?: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    spring(ref.current, "scale", 1.06, 1, { stiffness: 700, damping: 15 });
  }, [value]);
  return (
    <p
      ref={ref}
      aria-live="polite"
      className={cn("text-center font-display text-[clamp(34px,9vw,44px)] font-bold leading-[1.1] tracking-[-0.02em] tabular-nums", className)}
    >
      <span className="mr-1 align-[.5em] text-[.5em] text-muted-foreground">{symbol}</span>
      {value.toLocaleString("es-CO")}
    </p>
  );
}
