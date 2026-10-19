"use client";

import { forwardRef, useState } from "react";
import { inputClasses } from "@/components/atoms/input";
import { formatMoneyInput, liveFormat, parseMoney } from "@/lib/business/money";
import { cn } from "@/lib/utils";

/**
 * Campo de dinero en pesos: mientras escribes pone los puntos de miles y
 * acepta coma decimal ("1.250.000,50"). Entrega el número con `onValueChange`
 * y, si tiene `name`, envía en el formulario el valor limpio ("1250000.5").
 */
export const MoneyInput = forwardRef<
  HTMLInputElement,
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "defaultValue" | "onChange" | "type"> & {
    value?: number | null;
    defaultValue?: number | null;
    onValueChange?: (value: number | null) => void;
    currency?: string;
  }
>(function MoneyInput({ value, defaultValue, onValueChange, currency = "$", name, className, ...props }, ref) {
  const controlled = value !== undefined;
  const [text, setText] = useState(() => {
    const v = controlled ? value : defaultValue;
    return v == null ? "" : formatMoneyInput(v, v % 1 ? 2 : 0);
  });
  // Si el valor controlado cambia desde fuera (p. ej. al limpiar), se refleja.
  const external = controlled ? (value == null ? "" : formatMoneyInput(value, value % 1 ? 2 : 0)) : null;
  const shown = controlled && parseMoney(text) !== (value ?? null) ? (external ?? "") : text;
  const parsed = parseMoney(shown);

  return (
    <div className="relative">
      <span aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-muted-foreground">
        {currency}
      </span>
      <input
        ref={ref}
        {...props}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={shown}
        onChange={(e) => {
          const next = liveFormat(e.target.value);
          setText(next);
          onValueChange?.(parseMoney(next));
        }}
        className={cn(inputClasses, "pl-7 font-mono tabular-nums", className)}
      />
      {name ? <input type="hidden" name={name} value={parsed == null ? "" : String(parsed)} /> : null}
    </div>
  );
});
