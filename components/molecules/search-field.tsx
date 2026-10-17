"use client";

import { forwardRef, type ComponentProps } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/atoms/input";
import { Kbd } from "@/components/atoms/kbd";
import { cn } from "@/lib/utils";

/**
 * Campo de búsqueda con lupa a la izquierda y, opcional, la tecla que lo
 * enfoca a la derecha (`shortcut="/"`). Controlado o no: es un Input.
 */
export const SearchField = forwardRef<
  HTMLInputElement,
  Omit<ComponentProps<"input">, "type"> & { shortcut?: string; containerClassName?: string }
>(function SearchField({ shortcut, className, containerClassName, ...props }, ref) {
  return (
    <div className={cn("relative min-w-[200px] flex-1", containerClassName)}>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground"
      />
      <Input
        ref={ref}
        type="search"
        autoComplete="off"
        className={cn("pl-[38px]", shortcut && "pr-10", className)}
        {...props}
      />
      {shortcut ? <Kbd className="absolute right-2.5 top-1/2 -translate-y-1/2">{shortcut}</Kbd> : null}
    </div>
  );
});
