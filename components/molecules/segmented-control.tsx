"use client";

import { cn } from "@/lib/utils";

export type SegmentedOption<T extends string> = { value: T; label: string };

/**
 * Control segmentado NEXUS THRIVE: alto 28 px, borde 1 px con radio 2 px y
 * padding 2 px; la opción activa va en `--surface-muted` y tinta, el resto en
 * muted. Para filtrar una lista en el cliente (no navega). Accesible como
 * `tablist`: cada opción es un `tab` con `aria-selected`.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex h-7 items-stretch rounded-sm border border-border p-0.5",
        className,
      )}
    >
      {options.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-[2px] px-2.5 text-xs font-medium tabular-nums transition-colors",
              active
                ? "bg-surface-muted text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
