import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Badge NEXUS THRIVE: radio 2 px, padding 2px 8px, Inter 500 12 px, fondo
 * `--surface-muted` y borde. Los estados llevan un punto cuadrado de 6 px en
 * lugar de una píldora de color. La variante `gold` es para avisos.
 */
const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-1.5 whitespace-nowrap rounded-sm border px-2 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "border-border bg-surface-muted text-foreground",
        secondary: "border-border bg-surface-muted text-foreground",
        outline: "border-border bg-transparent text-muted-foreground",
        gold: "border-transparent bg-warning text-warning-foreground",
        success: "border-border bg-surface-muted text-foreground",
        destructive: "border-transparent bg-danger/10 text-danger",
        warning: "border-transparent bg-warning text-warning-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

/** Punto cuadrado de 6 px para estados (funcional, no decorativo). */
export function StatusDot({
  className,
  tone = "success",
}: {
  className?: string;
  tone?: "success" | "danger" | "warning" | "muted";
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "block size-1.5 shrink-0",
        tone === "success" && "bg-success",
        tone === "danger" && "bg-danger",
        tone === "warning" && "bg-gold-500",
        tone === "muted" && "bg-muted-foreground",
        className,
      )}
    />
  );
}

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span";
  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
