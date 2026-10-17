"use client";

import { useEffect, useRef } from "react";
import { motionOff } from "@/lib/motion";
import { cn } from "@/lib/utils";

const DIGITS = "0123456789".split("");

/**
 * Cifra tipo cuentakilómetros: cada dígito es una columna 0–9 que rueda hasta
 * su valor (de derecha a izquierda, 45 ms entre columnas) con un leve
 * desenfoque de movimiento, y la cifra da un pequeño salto al cambiar. Cada
 * columna conserva su nodo entre renders, así que la transición CSS rueda
 * sola desde el dígito anterior; solo se animan transforms.
 */
export function Odometer({
  value,
  prefix,
  className,
}: {
  /** Texto ya formateado: "84.40", "1,234". */
  value: string;
  /** Símbolo antes de la cifra ("$"). */
  prefix?: string;
  className?: string;
}) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const previous = useRef<string | null>(null);
  const chars = value.split("");

  useEffect(() => {
    const root = rootRef.current;
    const changed = previous.current !== null && previous.current !== value;
    previous.current = value;
    if (!root || !changed || motionOff()) return;
    const columns = Array.from(root.querySelectorAll<HTMLElement>("[data-digit]"));
    columns.forEach((col, j) => {
      col.animate([{ filter: "blur(0)" }, { filter: "blur(2.5px)", offset: 0.35 }, { filter: "blur(0)" }], {
        duration: 760,
        delay: (columns.length - j) * 45,
      });
    });
    root.animate([{ transform: "scale(1)" }, { transform: "scale(1.045)", offset: 0.3 }, { transform: "scale(1)" }], {
      duration: 620,
      easing: "cubic-bezier(.16,1,.3,1)",
    });
  }, [value]);

  const digitCount = chars.filter((c) => /\d/.test(c)).length;
  let digitIndex = 0;

  return (
    <span ref={rootRef} aria-label={`${prefix ?? ""}${value}`} className={cn("inline-flex items-start tabular-nums", className)}>
      {prefix ? (
        <span aria-hidden="true" className="mr-[0.06em] mt-[0.16em] text-[0.46em] font-semibold opacity-70">
          {prefix}
        </span>
      ) : null}
      {chars.map((ch, i) => {
        // Clave desde la derecha: las unidades siguen siendo la misma columna
        // aunque la cifra gane o pierda dígitos.
        const key = `${chars.length - i}`;
        if (!/\d/.test(ch)) {
          return (
            <span key={key} aria-hidden="true" className="inline-block leading-none">
              {ch}
            </span>
          );
        }
        const delay = (digitCount - digitIndex++) * 45;
        return (
          <span key={key} aria-hidden="true" className="relative inline-block h-[1em] overflow-hidden">
            <span
              data-digit={ch}
              className="block transition-transform duration-[760ms] ease-[var(--nx-ease-out)] motion-reduce:transition-none"
              style={{ transform: `translateY(-${ch}em)`, transitionDelay: `${delay}ms` }}
            >
              {DIGITS.map((d) => (
                <span key={d} className="block h-[1em] text-center leading-none">
                  {d}
                </span>
              ))}
            </span>
          </span>
        );
      })}
    </span>
  );
}
