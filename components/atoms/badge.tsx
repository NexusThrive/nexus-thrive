import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Badge NEXUS THRIVE: radio 2 px, padding 2px 8px, Inter 500 12 px, fondo
 * `--surface-muted` y borde. Los estados llevan un punto cuadrado de 6 px
 * (`tone`) en lugar de una píldora de color; `pulse` lo hace latir (avisos
 * que esperan acción). `gold` es para avisos y `solid` para destacar.
 */
const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-1.5 whitespace-nowrap rounded-sm border px-2 py-0.5 text-xs/[18px] font-medium",
  {
    variants: {
      variant: {
        default: "border-border bg-surface-muted text-foreground",
        secondary: "border-border bg-surface-muted text-foreground",
        outline: "border-border bg-transparent text-muted-foreground",
        gold: "border-transparent bg-warning text-warning-foreground",
        solid: "border-transparent bg-primary text-primary-foreground",
        success: "border-border bg-surface-muted text-foreground",
        destructive: "border-transparent bg-danger/10 text-danger",
        warning: "border-transparent bg-warning text-warning-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export type StatusTone = "success" | "danger" | "warning" | "neutral" | "muted";

const DOT_TONES: Record<StatusTone, string> = {
  success: "bg-success",
  danger: "bg-danger",
  warning: "bg-gold-600",
  neutral: "bg-foreground",
  muted: "bg-muted-foreground",
};

/** Punto cuadrado de 6 px para estados (funcional, no decorativo). */
export function StatusDot({
  className,
  tone = "success",
  pulse = false,
}: {
  className?: string;
  tone?: StatusTone;
  /** Late (opacidad) para estados que esperan acción, p. ej. "Por vencer". */
  pulse?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "block size-1.5 shrink-0",
        DOT_TONES[tone],
        pulse && "animate-[nx-pulse_1.6s_ease-in-out_infinite] motion-reduce:animate-none",
        className,
      )}
    />
  );
}

function Badge({
  className,
  variant,
  tone,
  pulse,
  asChild = false,
  children,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & {
    asChild?: boolean;
    /** Antepone un `StatusDot` de ese tono. */
    tone?: StatusTone;
    pulse?: boolean;
  }) {
  const Comp = asChild ? Slot : "span";
  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    >
      {tone && !asChild ? <StatusDot tone={tone} pulse={pulse} /> : null}
      {children}
    </Comp>
  );
}

export { Badge, badgeVariants };
