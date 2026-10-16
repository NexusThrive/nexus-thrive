"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";

/**
 * Interruptor NEXUS THRIVE: 42×24, esquinas casi rectas. El pulgar se desliza
 * con rebote y se estira mientras se presiona, como un objeto físico.
 */
function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer group relative inline-flex h-6 w-[42px] shrink-0 items-center rounded-sm bg-border-strong outline-none transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none absolute left-[3px] top-[3px] block h-[18px] w-[18px] rounded-[1px] bg-white transition-[translate,width,background-color] duration-[380ms] ease-[var(--nx-ease-bounce)] group-active:w-[22px] data-[state=checked]:translate-x-[18px] data-[state=checked]:bg-primary-foreground group-active:data-[state=checked]:translate-x-[14px]"
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
