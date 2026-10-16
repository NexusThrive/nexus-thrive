import * as React from "react";

import { cn } from "@/lib/utils";
import { fieldClasses } from "./input";

/** Área de texto: mismo estilo que Input y crece con el contenido. */
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(fieldClasses, "field-sizing-content min-h-[84px] resize-y py-2.5", className)}
      {...props}
    />
  );
}

export { Textarea };
