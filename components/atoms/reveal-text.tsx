"use client";

import { useEffect, useRef, type ElementType } from "react";
import { cn } from "@/lib/utils";

export type RevealPart = string | { text: string; gold?: boolean; className?: string };

/**
 * Texto que entra letra por letra con enfoque (desenfoque → nítido), como
 * THRIVE en el logo. Las letras se renderizan en el servidor; al montar se
 * añade `nx-fx-go` y la transición CSS hace el resto (28 ms entre letras).
 * Las palabras no se parten al ajustar línea. `{ gold: true }` pinta un
 * tramo con el degradado oro (p. ej. el nombre en el saludo).
 */
export function RevealText({
  parts,
  as: Tag = "span",
  className,
}: {
  parts: RevealPart[];
  as?: ElementType;
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const label = parts.map((p) => (typeof p === "string" ? p : p.text)).join("");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.classList.remove("nx-fx-go");
    void el.offsetWidth;
    const frame = requestAnimationFrame(() => el.classList.add("nx-fx-go"));
    return () => cancelAnimationFrame(frame);
  }, [label]);

  let index = 0;
  return (
    <Tag ref={ref} aria-label={label} className={cn(className)}>
      {parts.map((part, p) => {
        const { text, gold, className: partClass } =
          typeof part === "string" ? { text: part, gold: false, className: undefined } : part;
        return (
          <span key={p} aria-hidden="true" className={cn(gold && "nx-gold-text", partClass)}>
            {text.split(/(\s+)/).map((word, w) =>
              /^\s+$/.test(word) ? (
                word
              ) : (
                <span key={w} className="inline-block whitespace-nowrap">
                  {Array.from(word).map((ch) => (
                    <span
                      key={index}
                      className={cn("nx-fx-ch", gold && "nx-gold-text")}
                      style={{ ["--i" as string]: index++ }}
                    >
                      {ch}
                    </span>
                  ))}
                </span>
              ),
            )}
          </span>
        );
      })}
    </Tag>
  );
}
