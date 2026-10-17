"use client";

import { Delete } from "lucide-react";
import { cn } from "@/lib/utils";

import type { KeypadKey } from "@/lib/keypad";

export { applyKey, type KeypadKey } from "@/lib/keypad";

const KEYS: KeypadKey[] = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "000", "0", "back"];

/**
 * Teclado numérico para cobrar con una mano (CTL·07): 3 × 4 teclas de 52 px
 * con Montserrat 600. Solo emite la tecla; quien lo usa decide el valor
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
          className="grid h-[52px] place-items-center rounded-md border border-border bg-surface font-display text-xl font-semibold tabular-nums transition-colors duration-100 active:bg-surface-muted"
        >
          {key === "back" ? <Delete aria-hidden="true" className="size-5" strokeWidth={1.8} /> : key}
        </button>
      ))}
    </div>
  );
}
