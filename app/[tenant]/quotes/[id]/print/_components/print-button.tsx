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
      className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
    >
      <Printer aria-hidden="true" className="h-4 w-4" />
      {label ?? "Imprimir / PDF"}
    </button>
  );
}