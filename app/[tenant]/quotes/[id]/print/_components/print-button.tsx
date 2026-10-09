"use client";

import { Printer } from "lucide-react";

/**
 * Botón de impresión del documento comercial. Solo interactivo (client);
 * el resto de la página es Server Component.
 */
export default function PrintButton({ label }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border-strong bg-card px-3 text-sm font-medium text-foreground/80 transition hover:bg-muted"
    >
      <Printer aria-hidden="true" className="h-4 w-4" />
      {label ?? "Imprimir / PDF"}
    </button>
  );
}