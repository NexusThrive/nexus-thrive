"use client";

import { Delete } from "lucide-react";
import { cn } from "@/lib/utils";

import type { KeypadKey } from "@/lib/experience/payment-input/keypad";

export { applyKey, type KeypadKey } from "@/lib/experience/payment-input/keypad";

const KEYS: KeypadKey[] = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "000", "0", "back"];

/**
 * Teclado numérico para cobrar con una mano (CTL·07): 3 × 4 teclas suaves (sin borde, fondo apagado, 48 px; 44 en
 * pantallas de menos de 820 px de alto) con Montserrat 600. Solo emite la tecla; quien lo usa decide el valor
 * (ver `applyKey`).
 */
export function Keypad({ onKey, className }: { onKey: (key: KeypadKey) => void; className?: string }) {
  return (
    <div className={cn("grid grid-cols-3 gap-1.5", className)}>
      {KEYS.map((key) => (
        <button
          key={key}
          type="button"
          data-press=""
          aria-label={key === "back" ? "Borrar" : undefined}
          onClick={() => onKey(key)}
          className="grid h-11 place-items-center rounded-xl bg-surface-muted font-display text-xl font-semibold tabular-nums outline-none transition-[background-color,transform] duration-(--d1) ease-(--nx-ease-out) hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-ring active:scale-[0.96] motion-reduce:transition-none [@media(max-height:700px)]:h-10 [@media(min-height:820px)]:h-12"
        >
          {key === "back" ? <Delete aria-hidden="true" className="size-5" strokeWidth={1.8} /> : key}
        </button>
      ))}
    </div>
  );
}
