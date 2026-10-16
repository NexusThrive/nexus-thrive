import * as React from "react";
import { cn } from "@/lib/utils";
import { selectClasses } from "./input";

/**
 * Select nativo con el estilo de campo de la marca. Nativo a propósito: en
 * el celular abre el selector del sistema (más rápido y accesible que un
 * menú propio) y funciona en formularios de Server Actions sin JS.
 */
function Select({ className, ...props }: React.ComponentProps<"select">) {
  return <select data-slot="select" className={cn(selectClasses, className)} {...props} />;
}

export { Select };
