"use client";

import { useState } from "react";
import { inputClasses } from "@/components/atoms/input";
import { cn } from "@/lib/utils";

const toText = (cents: number) => (cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2));

/**
 * Valor en dólares que se guarda en centavos ("29" → 2900, "12.5" → 1250).
 * Acepta punto o coma decimal; al salir del campo muestra el valor limpio.
 */
export function UsdInput({
  id,
  value,
  onChange,
  disabled,
  className,
  "aria-label": ariaLabel,
}: {
  id?: string;
  value: number;
  onChange: (cents: number) => void;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}) {
  const [text, setText] = useState(toText(value));
  const [focused, setFocused] = useState(false);
  const shown = focused ? text : toText(value);
  return (
    <div className={cn("relative", className)}>
      <span aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-muted-foreground">
        $
      </span>
      <input
        id={id}
        aria-label={ariaLabel}
        inputMode="decimal"
        disabled={disabled}
        value={shown}
        onFocus={() => {
          setText(toText(value));
          setFocused(true);
        }}
        onBlur={() => setFocused(false)}
        onChange={(e) => {
          const raw = e.target.value.replace(",", ".").replace(/[^\d.]/g, "");
          setText(raw);
          const n = Number.parseFloat(raw);
          onChange(Number.isFinite(n) ? Math.round(n * 100) : 0);
        }}
        className={cn(inputClasses, "pl-6 pr-12 font-mono tabular-nums")}
      />
      <span aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground">
        USD
      </span>
    </div>
  );
}
