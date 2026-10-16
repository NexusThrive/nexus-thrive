"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { FocusText } from "@/components/atoms/focus-text";
import { NMark } from "@/components/atoms/n-mark";

/**
 * Botón NEXUS THRIVE (idéntico a reference/nexus-loaders.html):
 * alto 40 px, padding 0 18px, radio 4 px, Inter 600 13 px, gap 8 px,
 * `whitespace-nowrap`. Primario = Ink (claro) / oro (oscuro) vía --primary.
 * Acento = oro, único CTA por pantalla. Foco dorado, deshabilitado opacidad .5.
 * Estados `loading` / `done` con la N de marca + texto con enfoque.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded border border-transparent text-[13px] font-semibold leading-none transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-primary-hover",
        accent: "bg-accent text-accent-foreground hover:bg-accent-hover",
        outline:
          "border-border-strong bg-transparent text-foreground hover:bg-surface-muted",
        secondary:
          "bg-surface-muted text-foreground hover:bg-border",
        ghost: "bg-transparent text-foreground hover:bg-surface-muted",
        danger: "bg-danger text-white hover:bg-danger/90",
        link: "text-accent-text underline-offset-4 hover:underline",
        // Alias de compatibilidad (shadcn).
        default: "bg-primary text-primary-foreground hover:bg-primary-hover",
        destructive: "bg-danger text-white hover:bg-danger/90",
      },
      size: {
        default: "h-10 px-[18px]",
        sm: "h-8 px-3.5 text-[13px]",
        lg: "h-10 px-6",
        icon: "size-10 p-0",
        "icon-sm": "size-8 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

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
  children,
  disabled,
  ...props
}: ButtonProps) {
  if (asChild) {
    const Comp = Slot as React.ElementType;
    return (
      <Comp
        data-slot="button"
        className={cn(buttonVariants({ variant, size, className }))}
        disabled={disabled}
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
