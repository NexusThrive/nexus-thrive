import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** Tecla o atajo (Ctrl K, /, Esc) en JetBrains Mono. */
export function Kbd({ className, ...props }: ComponentProps<"kbd">) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 items-center rounded-sm border border-border px-1.5 font-mono text-[11px] font-medium text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}
