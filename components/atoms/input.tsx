import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Clases del campo de texto NEXUS THRIVE, compartidas con Textarea y Select:
 * alto `--control-h`, borde `--border-input` (contraste AA), radio 4 px,
 * fondo superficie y, al enfocar, borde `--ring` con halo oro de 3 px.
 * `aria-invalid` lo pinta de rojo.
 */
export const fieldClasses =
  "w-full min-w-0 rounded-md border border-border-input bg-surface px-3 text-sm text-foreground transition-[border-color,box-shadow] duration-200 outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:shadow-[0_0_0_3px_rgba(212,175,55,0.18)] disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-danger";

/** Campo de texto. Para etiqueta, ayuda y error, envolverlo en `Field`. */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        fieldClasses,
        "h-[var(--control-h)] file:mr-3 file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
