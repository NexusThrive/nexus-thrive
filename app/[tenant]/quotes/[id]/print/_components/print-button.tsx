"use client";

import { Printer } from "lucide-react";
import { buttonVariants } from "@/components/atoms/button-variants";

/**
 * Botón de impresión del documento comercial. Solo interactivo (client);
 * el resto de la página es Server Component.
 */
export default function PrintButton({ label }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={buttonVariants({ variant: "outline" })}
    >
      <Printer aria-hidden="true" className="h-4 w-4" />
      {label ?? "Imprimir / PDF"}
    </button>
  );
}