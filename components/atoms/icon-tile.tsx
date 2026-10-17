import type { ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const iconTileVariants = cva("grid shrink-0 place-items-center rounded-md [&_svg]:size-[18px]", {
  variants: {
    tone: {
      neutral: "bg-surface-muted text-foreground",
      gold: "bg-warning text-accent-text",
      ink: "bg-primary text-primary-foreground",
      success: "bg-success-subtle text-success",
      danger: "bg-danger-subtle text-danger",
    },
    size: {
      sm: "size-[30px] [&_svg]:size-4",
      md: "size-9",
      lg: "size-11",
    },
  },
  defaultVariants: { tone: "neutral", size: "md" },
});

/**
 * Cuadro de 36 px que contiene un icono: encabeza filas de lista, acciones
 * rápidas y notificaciones. El tono indica el tipo (ingreso, gasto, alerta).
 */
export function IconTile({
  className,
  tone,
  size,
  ...props
}: ComponentProps<"span"> & VariantProps<typeof iconTileVariants>) {
  return <span aria-hidden="true" className={cn(iconTileVariants({ tone, size }), className)} {...props} />;
}
