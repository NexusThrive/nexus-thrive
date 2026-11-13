import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Badge NEXUS THRIVE: píldora (`rounded-full`), padding 2px 10px, Inter 500 12 px, fondo
 * `--surface-muted` y borde. Los estados llevan un glifo de 10 px (`tone`: ✓ × ! ● –) junto
 * al texto, para no depender solo del color; `pulse` lo hace latir (avisos
 * que esperan acción). `gold` es para avisos y `solid` para destacar.
 */
const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs/[18px] font-medium",
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
  success: "text-success",
  danger: "text-danger",
  warning: "text-gold-600",
  neutral: "text-foreground",
  muted: "text-muted-foreground",
};

/** Glifo de cada estado (DR-27): el estado se distingue por forma y por el texto del badge, no solo por color. */
const DOT_GLYPHS: Record<StatusTone, React.ReactNode> = {
  success: <path d="M2.5 6.5 5 9l4.5-5.5" />,
  danger: <path d="M3 3l6 6M9 3l-6 6" />,
  warning: <path d="M6 2.5v4.2M6 9.3v.01" />,
  neutral: <circle cx="6" cy="6" r="2" fill="currentColor" stroke="none" />,
  muted: <path d="M3 6h6" />,
};

/**
 * Indicador de estado: un glifo de 10 px (✓ éxito, × peligro, ! aviso, ● neutro, – inactivo) en el color del estado.
 * Va siempre junto al texto del estado; la forma permite distinguirlo sin color (D7).
 */
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
    <svg
      viewBox="0 0 12 12"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(
        "block size-2.5 shrink-0",
        DOT_TONES[tone],
        pulse && "animate-[nx-pulse_1.6s_ease-in-out_infinite] motion-reduce:animate-none",
        className,
      )}
    >
      {DOT_GLYPHS[tone]}
    </svg>
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
