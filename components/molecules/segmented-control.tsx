"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type SegmentedOption<T extends string> = {
  value: T;
  label: ReactNode;
  /** Contador en mono junto a la etiqueta (p. ej. resultados del filtro). */
  count?: number;
  /** Nombre accesible si `label` es solo un icono. */
  ariaLabel?: string;
};

/**
 * Control segmentado NEXUS THRIVE: fondo `--surface-muted`, borde 1 px, radio
 * 4 px. La opción activa queda sobre una pastilla blanca que se desliza con
 * un rebote corto (`--nx-ease-spring`, 420 ms) y se reacomoda sola si cambia
 * el ancho (fuentes, idioma, ventana). Para filtros y periodos en el cliente;
 * no navega.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  size = "md",
  className,
}: {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const indicator = indicatorRef.current;
    if (!root || !indicator) return;
    const place = () => {
      const active = root.querySelector<HTMLElement>('[aria-pressed="true"]');
      if (!active) return;
      indicator.style.width = `${active.offsetWidth}px`;
      indicator.style.transform = `translateX(${active.offsetLeft}px)`;
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(root);
    return () => observer.disconnect();
  }, [value, options]);

  return (
    <div
      ref={rootRef}
      role="group"
      aria-label={ariaLabel}
      className={cn(
        "relative inline-flex max-w-full gap-0.5 rounded-md border border-border bg-surface-muted p-[3px]",
        className,
      )}
    >
      <span
        ref={indicatorRef}
        aria-hidden="true"
        className="absolute inset-y-[3px] left-0 z-0 rounded-sm bg-surface shadow-[0_1px_2px_rgba(0,0,0,.08),0_0_0_1px_var(--border)] transition-[transform,width] duration-[420ms] ease-[var(--nx-ease-spring)]"
      />
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            aria-label={option.ariaLabel}
            data-press=""
            onClick={() => onChange(option.value)}
            className={cn(
              "relative z-10 inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-sm font-medium transition-colors duration-200 outline-none focus-visible:outline-2 focus-visible:outline-ring [&_svg]:size-4",
              size === "sm" ? "h-[22px] px-2.5 text-xs" : "h-[30px] px-[13px] text-[13px]",
              active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
            {option.count != null ? (
              <span className="font-mono text-[11px] tabular-nums opacity-60">{option.count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
