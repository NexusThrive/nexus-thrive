import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Card NEXUS THRIVE: fondo `--surface`, borde 1 px, radio 6 px, padding 20 px,
 * sin sombra. Altura automática: nunca altura fija con espacio vacío.
 */
function Card({
  className,
  interactive = false,
  ...props
}: React.ComponentProps<"div"> & {
  /** La tarjeta entera es accionable: se eleva 2 px al pasar el puntero. */
  interactive?: boolean;
}) {
  return (
    <div
      data-slot="card"
      className={cn(
        "flex flex-col rounded-lg border border-border bg-card p-5 text-card-foreground",
        interactive && "nx-lift",
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn("flex items-start justify-between gap-3", className)}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("font-display text-base font-semibold text-foreground", className)}
      {...props}
    />
  );
}

function CardDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn("shrink-0", className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-content" className={cn(className)} {...props} />;
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center gap-3", className)}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
};
