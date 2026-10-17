import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Clases del campo de texto NEXUS THRIVE, compartidas con Textarea y Select:
 * alto `--control-h`, borde gris suave `--border-input` (más marcado al pasar
 * el cursor), radio 4 px,
 * fondo superficie y, al enfocar, borde `--ring` con halo oro de 3 px.
 * `aria-invalid` lo pinta de rojo.
 */
export const fieldClasses =
  "w-full min-w-0 rounded-md border border-border-input bg-surface px-3 text-sm text-foreground transition-[border-color,box-shadow] duration-200 outline-none hover:border-border-input-hover placeholder:text-muted-foreground focus-visible:border-ring focus-visible:shadow-[0_0_0_3px_rgba(212,175,55,0.18)] disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-danger";

/** Campo de una línea: alto de control (40 px; 34 en densidad compacta). */
export const inputClasses = `${fieldClasses} h-[var(--control-h)]`;

/** Área de texto con el mismo borde y foco. */
export const textareaClasses = `${fieldClasses} field-sizing-content min-h-[84px] resize-y py-2.5`;

/** Select nativo: mismo campo con la flecha dibujada (sin icono extra). */
export const selectClasses = `${inputClasses} cursor-pointer appearance-none bg-[linear-gradient(45deg,transparent_50%,var(--foreground-muted)_50%),linear-gradient(135deg,var(--foreground-muted)_50%,transparent_50%)] bg-[length:5px_5px] bg-[position:calc(100%-18px)_50%,calc(100%-13px)_50%] bg-no-repeat pr-[34px]`;

/** Etiqueta de campo (Inter 500 13 px) para formularios sin `Field`. */
export const labelClasses = "mb-2 block text-[13px] font-medium text-foreground";

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
