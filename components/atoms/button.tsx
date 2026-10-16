"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { FocusText } from "@/components/atoms/focus-text";
import { NMark } from "@/components/atoms/n-mark";

/**
 * Botón NEXUS THRIVE: alto `--control-h` (40 px; 34 px en densidad compacta),
 * padding 0 18px, radio 4 px, Inter 600 13 px. Primario = tinta (claro) / oro
 * (oscuro) vía `--primary`; acento = oro, un único CTA por pantalla. Se hunde
 * al presionarlo y vuelve con un resorte (`data-press`, ver MotionProvider).
 * Estados `loading` / `done` con la N de marca y texto con enfoque.
 */
const buttonVariants = cva(
  "relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-md border border-transparent text-[13px] font-semibold leading-none outline-none transition-[background-color,border-color,filter,box-shadow] duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:brightness-[1.18]",
        accent: "bg-accent text-ink hover:bg-accent-hover",
        outline:
          "border-border-strong bg-transparent text-foreground hover:border-border-input hover:bg-surface-muted",
        secondary: "bg-surface-muted text-foreground hover:bg-surface-hover",
        ghost: "bg-transparent text-foreground hover:bg-surface-muted",
        danger: "bg-danger text-white hover:brightness-110",
        link: "h-auto px-0 text-accent-text underline-offset-4 hover:underline",
        // Alias de compatibilidad (shadcn).
        default: "bg-primary text-primary-foreground hover:brightness-[1.18]",
        destructive: "bg-danger text-white hover:brightness-110",
      },
      size: {
        default: "h-[var(--control-h)] px-[18px]",
        sm: "h-8 px-3 text-[12.5px]",
        lg: "h-12 px-[22px] text-sm",
        icon: "size-[var(--control-h)] p-0",
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
