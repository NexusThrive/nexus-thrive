"use client";

import { Printer } from "lucide-react";
import { buttonVariants } from "@/components/atoms/button-variants";

/** Botón "Imprimir o guardar PDF" (se oculta al imprimir). */
export function PrintButton({ label = "Imprimir o guardar PDF" }: { label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className={buttonVariants({ variant: "outline", size: "sm", className: "print:hidden" })}>
      <Printer aria-hidden="true" className="size-3.5" /> {label}
    </button>
  );
}
