"use client";

import type { ComponentProps, ReactNode } from "react";
import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * Chip seleccionable (medio de pago, categoría, hora libre) — CTL·04 del
 * artefacto. Alto 32 px, radio 2 px; sin elegir lleva borde gris suave y al
 * elegirlo se rellena de tinta (oro en oscuro) y rebota con un resorte
 * (600 · 12). Es un botón con `aria-pressed`: el grupo decide si es
 * selección única o múltiple.
 */
export function Chip({
  selected = false,
  count,
  className,
  children,
  onClick,
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
      onClick={(event) => {
        if (!selected) spring(event.currentTarget, "scale", 0.9, 1, { stiffness: 600, damping: 12 });
        onClick?.(event);
      }}
      className={cn(
        "inline-flex h-8 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-sm border px-[13px] text-[13px] font-medium transition-[background-color,color,border-color] duration-200 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-45",
        selected
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border-input bg-transparent text-foreground hover:border-border-input-hover",
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
