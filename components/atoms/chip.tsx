"use client";

import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Chip seleccionable (medio de pago, categoría, hora libre). Alto 32 px,
 * radio 2 px; seleccionado se invierte a `--primary`. Es un botón con
 * `aria-pressed`: el grupo decide si es selección única o múltiple.
 */
export function Chip({
  selected = false,
  count,
  className,
  children,
  ...props
}: Omit<ComponentProps<"button">, "type"> & {
  selected?: boolean;
  /** Contador en mono a la derecha (p. ej. minutos o resultados). */
  count?: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      data-press=""
      className={cn(
        "inline-flex h-8 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-sm border px-[13px] text-[13px] font-medium transition-[background-color,color,border-color] duration-200 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-45",
        selected
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border-strong bg-transparent text-foreground hover:border-border-input",
        className,
      )}
      {...props}
    >
      {children}
      {count != null ? (
        <span className={cn("font-mono text-[11px]", selected ? "opacity-70" : "text-muted-foreground")}>
          {count}
        </span>
      ) : null}
    </button>
  );
}

/** Fila de chips con desplazamiento horizontal sin barra visible. */
export function ChipRow({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("flex gap-1.5 overflow-x-auto p-0.5 [scrollbar-width:none]", className)}
      {...props}
    />
  );
}
