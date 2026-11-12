"use client";

import type { ComponentProps, ReactNode } from "react";
import { spring } from "@/lib/experience/motion/index";
import { cn } from "@/lib/utils";

/**
 * Chip seleccionable (medio de pago, categoría, hora libre) — CTL·04 del
 * artefacto. Píldora de 40 px; sin elegir va en gris suave y al elegirlo se
 * tiñe de oro suave con borde dorado y rebota con un resorte (600 · 12). Es un botón con `aria-pressed`: el grupo decide si es
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
        "inline-flex h-10 pointer-coarse:h-11 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border px-4 text-ui font-medium transition-[background-color,color,border-color] duration-200 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-45",
        selected
          ? "border-accent bg-accent-subtle text-foreground"
          : "border-transparent bg-surface-muted/70 text-foreground hover:bg-surface-muted",
        className,
      )}
      {...props}
    >
      {children}
      {count != null ? (
        <span className={cn("font-mono text-2xs", selected ? "opacity-70" : "text-muted-foreground")}>
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
