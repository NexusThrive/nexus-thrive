"use client";

import { useRef, useState } from "react";
import { FileSpreadsheet, UploadCloud } from "lucide-react";
import { cn } from "@/lib/cn";

const ACCEPTED = ".xlsx,.xls,.csv,.txt";

/**
 * Zona de arrastre + selector de archivo. Solo valida extensión/memoria;
 * el análisis real lo hace la Server Action (`parseApuFileAction`).
 */
export default function FileDropzone({
  pending,
  onFile,
}: {
  pending: boolean;
  onFile: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  function handleFile(file: File | undefined | null) {
    if (!file || pending) return;
    onFile(file);
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        className="sr-only"
        onChange={(event) => handleFile(event.target.files?.[0])}
        data-testid="import-file-input"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          handleFile(event.dataTransfer.files?.[0]);
        }}
        className={cn(
          "flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition",
          dragOver
            ? "border-amber-400 bg-amber-50"
            : "border-slate-300 bg-white hover:border-amber-300 hover:bg-amber-50/40",
          pending && "pointer-events-none opacity-60",
        )}
        aria-label="Subir archivo de insumos o APUs"
      >
        <span className="grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-500">
          {pending ? (
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
          ) : (
            <UploadCloud aria-hidden="true" className="h-6 w-6" />
          )}
        </span>
        <span className="text-sm font-medium text-slate-700">
          {pending ? "Analizando archivo…" : "Arrastra tu archivo o haz clic para elegirlo"}
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
          <FileSpreadsheet aria-hidden="true" className="h-3.5 w-3.5" />
          .xlsx · .csv · .txt — máx 20 MB. Se aceptan insumos planos o packs APU completos.
        </span>
      </button>
    </div>
  );
}