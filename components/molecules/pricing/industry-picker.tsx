"use client";

import { INDUSTRIES, type IndustryKey } from "@/lib/pricing/catalog";
import { cn } from "@/lib/utils";

/** Rubro del negocio (radiogroup de botones); muestra el factor de precio si no es ×1. */
export function IndustryPicker({ value, onChange }: { value: IndustryKey; onChange: (key: IndustryKey) => void }) {
  return (
    <div role="radiogroup" aria-label="Rubro" className="flex flex-wrap gap-1.5">
      {(Object.keys(INDUSTRIES) as IndustryKey[]).map((key) => {
        const industry = INDUSTRIES[key];
        const checked = key === value;
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={checked}
            onClick={() => onChange(key)}
            data-press=""
            className={cn(
              "inline-flex h-[34px] items-center gap-[7px] rounded-md border px-3 text-[13px] transition-colors duration-200",
              checked ? "border-border-input-hover bg-surface-muted font-semibold text-foreground" : "border-border-input bg-surface text-muted-foreground hover:border-border-input-hover hover:text-foreground",
            )}
          >
            {industry.name}
            {industry.factor !== 1 ? (
              <span className={cn("rounded-sm border border-current px-[5px] py-px font-mono text-[10.5px] font-medium opacity-85", "text-accent-text")}>
                ×{industry.factor.toFixed(2)}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
