"use client";

import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";

import { cn } from "@/lib/utils";

/**
 * Casilla NEXUS THRIVE: 18 px, radio 2 px, borde `--border-input`. Al marcarla
 * se rellena de `--primary` y la palomita crece con un resorte (CSS puro).
 */
function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer grid size-[18px] shrink-0 place-items-center rounded-sm border-[1.5px] border-border-input bg-surface text-primary-foreground outline-none transition-[background-color,border-color] duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-danger data-[state=checked]:border-primary data-[state=checked]:bg-primary",
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
