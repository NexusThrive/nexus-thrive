"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import type { VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { FocusText } from "@/components/atoms/focus-text";
import { NMark } from "@/components/atoms/n-mark";
import { buttonVariants } from "./button-variants";

/**
 * Botón NEXUS THRIVE: alto `--control-h` (40 px; 34 px en densidad compacta),
 * padding 0 18px, radio 4 px, Inter 600 13 px. Primario = tinta (claro) / oro
 * (oscuro) vía `--primary`; acento = oro, un único CTA por pantalla. Se hunde
 * al presionarlo y vuelve con un resorte (`data-press`, ver MotionProvider).
 * Estados `loading` / `done` con la N de marca y texto con enfoque.
 */
export interface ButtonProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /** Mientras la mutación real está en curso. */
  loading?: boolean;
  /** Cuando la mutación terminó correctamente (se muestra ~1.3 s). */
  done?: boolean;
  /** Texto de estado; por defecto "Guardando…". */
  loadingText?: string;
  /** Texto de éxito; por defecto "Guardado". */
  doneText?: string;
  /** El botón se deja atraer por el cursor (CTA principal de la vista). */
  magnetic?: boolean;
}

function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  done = false,
  loadingText = "Guardando…",
  doneText = "Guardado",
  magnetic = false,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const motionProps = {
    "data-press": variant === "link" ? undefined : "",
    "data-mag": magnetic ? "" : undefined,
  };
  if (asChild) {
    const Comp = Slot as React.ElementType;
    return (
      <Comp
        data-slot="button"
        className={cn(buttonVariants({ variant, size, className }))}
        disabled={disabled}
        {...motionProps}
        {...props}
      >
        {children}
      </Comp>
    );
  }

  const busy = loading || done;

  return (
    <button
      data-slot="button"
      data-state={busy ? (done ? "done" : "loading") : "idle"}
      aria-busy={loading || undefined}
      {...motionProps}
      className={cn(
        buttonVariants({ variant, size, className }),
        busy && "min-w-[176px]",
      )}
      disabled={disabled || busy}
      {...props}
    >
      {busy ? (
        <>
          <NMark size={16} state={done ? "done" : "loop"} />
          <FocusText text={done ? doneText : loadingText} />
        </>
      ) : (
        children
      )}
    </button>
  );
}

export { Button, buttonVariants };
