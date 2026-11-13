"use client";

import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";

import { cn } from "@/lib/utils";

/**
 * Casilla NEXUS THRIVE: 20 px, esquinas suaves (6 px), borde gris. Al marcarla
 * se rellena de oro (`--accent`) y la palomita, en tinta, crece con un resorte (CSS puro).
 */
function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer grid size-5 shrink-0 place-items-center rounded-md border-[1.5px] border-border-strong bg-card text-ink outline-none transition-[background-color,border-color] duration-200 hover:border-border-input-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-danger data-[state=checked]:border-accent data-[state=checked]:bg-accent",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        forceMount
        data-slot="checkbox-indicator"
        className="-mt-0.5 h-[5px] w-[9px] -rotate-45 scale-0 border-b-2 border-l-2 border-current transition-transform duration-[260ms] ease-[var(--nx-ease-out)] data-[state=checked]:scale-100"
      />
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
