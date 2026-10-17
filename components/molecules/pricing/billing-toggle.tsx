"use client";

import type { Billing } from "@/lib/pricing/catalog";
import { cn } from "@/lib/utils";

/** Mensual / Anual (−20%) con pastilla deslizante; hereda colores del resumen. */
export function BillingToggle({ value, onChange }: { value: Billing; onChange: (b: Billing) => void }) {
  const options: { value: Billing; label: string; note?: string }[] = [
    { value: "monthly", label: "Mensual" },
    { value: "annual", label: "Anual", note: "−20%" },
  ];
  return (
    <div role="radiogroup" aria-label="Facturación" className="relative grid grid-cols-2 rounded-md border border-[var(--pln)] p-[3px]">
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-y-[3px] left-[3px] w-[calc(50%-3px)] rounded-sm bg-[color-mix(in_oklab,var(--pfg)_9%,transparent)] transition-transform duration-[420ms] ease-[var(--nx-ease-spring)]",
          value === "annual" && "translate-x-full",
        )}
      />
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            "relative z-10 flex h-8 items-center justify-center gap-1.5 rounded-sm text-[12.5px] font-medium transition-colors",
            o.value === value ? "text-[var(--pfg)]" : "text-[var(--pmu)]",
          )}
        >
          {o.label}
          {o.note ? <em className="font-mono text-[10.5px] font-semibold not-italic text-success">{o.note}</em> : null}
        </button>
      ))}
    </div>
  );
}
