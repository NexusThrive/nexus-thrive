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
          "flex w-full flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-10 text-center transition",
          dragOver
            ? "border-gold-500 bg-gold-100"
            : "border-border-strong bg-card hover:border-gold-300 hover:bg-gold-100/40",
          pending && "pointer-events-none opacity-60",
        )}
        aria-label="Subir archivo de insumos o APUs"
      >
        <span className="grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground">
          {pending ? (
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-border-strong border-t-foreground/80" />
          ) : (
            <UploadCloud aria-hidden="true" className="h-6 w-6" />
          )}
        </span>
        <span className="text-sm font-medium text-foreground/80">
          {pending ? "Analizando archivo…" : "Arrastra tu archivo o haz clic para elegirlo"}
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <FileSpreadsheet aria-hidden="true" className="h-3.5 w-3.5" />
          .xlsx · .csv · .txt — máx 20 MB. Se aceptan insumos planos o packs APU completos.
        </span>
      </button>
    </div>
  );
}