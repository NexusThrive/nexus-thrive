"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";

/**
 * Interruptor NEXUS THRIVE: 42×24, en píldora y verde al encender. El pulgar se desliza
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
        "peer group relative inline-flex h-6 pointer-coarse:h-11 pointer-coarse:bg-clip-content pointer-coarse:py-[10px] pointer-coarse:px-px pointer-coarse:w-11 w-[42px] shrink-0 items-center rounded-full bg-border-strong/60 outline-none transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-success",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none absolute left-[3px] top-[3px] pointer-coarse:left-[4px] pointer-coarse:top-[13px] block h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-[translate,width,background-color] duration-[380ms] ease-[var(--nx-ease-bounce)] group-active:w-[22px] data-[state=checked]:translate-x-[18px] group-active:data-[state=checked]:translate-x-[14px]"
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
