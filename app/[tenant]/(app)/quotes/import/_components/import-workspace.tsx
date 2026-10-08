"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import FileDropzone from "./file-dropzone";
import MetricsPanel from "./metrics-panel";
import MappingEditor from "./mapping-editor";
import PreviewTable from "./preview-table";
import { parseApuFileAction, executeSmartImportAction } from "../actions";
import { recomputePreview } from "@/lib/apu-importer/recompute";
import type {
  ColumnMapping,
  ImportPreview,
  ImportResult,
} from "@/lib/apu-importer/types";
import { cn } from "@/lib/cn";

type Step = "upload" | "preview" | "done";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB (espejo del server)

/**
 * Workspace del importador (cliente).
 *
 * Fase 1: el usuario sube un archivo → `parseApuFileAction` (server, sin DB)
 * devuelve el preview. Fase 2: confirmación → `executeSmartImportAction`
 * (server, transaccional). El mapeo se puede editar; las filas se re-derivan
 * en cliente con `recomputePreview` y el servidor revalida todo al importar.
 */
export default function ImportWorkspace({ tenantSlug }: { tenantSlug: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("upload");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [draftMapping, setDraftMapping] = useState<ColumnMapping[]>([]);
  const [parsePending, setParsePending] = useState(false);
  const [parseError, setParseError] = useState("");
  const [executePending, setExecutePending] = useState(false);
  const [executeError, setExecuteError] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);

  async function handleFile(file: File) {
    setParsePending(true);
    setParseError("");
    try {
      if (file.size > MAX_FILE_SIZE) {
        setParseError(
          `El archivo pesa ${(file.size / 1024 / 1024).toFixed(1)} MB y supera el límite de 20 MB.`,
        );
        return;
      }
      const formData = new FormData();
      formData.set("file", file);
      const response = await parseApuFileAction({ status: "idle" }, formData);
      if (response.status === "ok" && response.preview) {
        setPreview(response.preview);
        setDraftMapping(response.preview.mapping);
        setStep("preview");
      } else {
        setParseError(response.message ?? "No se pudo analizar el archivo.");
      }
    } catch {
      setParseError(
        "No se pudo analizar el archivo. Verifica que sea un Excel o CSV válido e inténtalo de nuevo.",
      );
    } finally {
      setParsePending(false);
    }
  }

  function handleMappingChange(mapping: ColumnMapping[]) {
    setDraftMapping(mapping);
    setPreview((current) => (current ? recomputePreview(current, mapping) : current));
  }

  async function handleExecute() {
    if (!preview) return;
    setExecutePending(true);
    setExecuteError("");
    try {
      const response = await executeSmartImportAction({
        tenantSlug,
        mapping: draftMapping,
        rows: preview.rows,
        fileName: preview.fileName,
      });
      if (response.status === "ok" && response.result) {
        setResult(response.result);
        setStep("done");
        router.refresh();
      } else {
        setExecuteError(response.message ?? "La importación no se completó.");
      }
    } catch {
      setExecuteError("Ocurrió un error inesperado. No se guardó nada.");
    } finally {
      setExecutePending(false);
    }
  }

  function reset() {
    setStep("upload");
    setPreview(null);
    setDraftMapping([]);
    setParseError("");
    setExecuteError("");
    setResult(null);
  }

  const importable = preview
    ? preview.rows.length - preview.metrics.omittedRows
    : 0;

  return (
    <div className="space-y-6">
      {/* Paso 1: subir archivo */}
      {step === "upload" && (
        <section className="space-y-4">
          <FileDropzone pending={parsePending} onFile={handleFile} />
          {parseError && (
            <p
              role="alert"
              className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
            >
              <AlertTriangle aria-hidden="true" className="h-4 w-4 shrink-0" />
              {parseError}
            </p>
          )}
          <details className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
            <summary className="cursor-pointer font-medium text-slate-700">
              ¿Qué formatos reconoce el importador?
            </summary>
            <ul className="mt-2 list-inside list-disc space-y-1 text-xs leading-relaxed text-slate-500">
              <li>
                <b>Insumos planos</b> (CSV, TXT o XLSX con columnas como código,
                descripción, unidad y precio): se mapean automáticamente.
              </li>
              <li>
                <b>Packs APU</b> (XLSX con bloques por actividad, secciones
                MATERIALES / EQUIPO / MANO DE OBRA y costo directo): cada bloque
                se convierte en una actividad con su composición.
              </li>
              <li>
                Números con formato latino (<code>1.250,50</code>) y unidades
                en español se normalizan solos.
              </li>
              <li>
                Nada se escribe en la base hasta que revises el preview y
                confirmes.
              </li>
            </ul>
          </details>
        </section>
      )}

      {/* Paso 2: preview + mapeo + confirmación */}
      {step === "preview" && preview && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <FileSpreadsheet aria-hidden="true" className="h-4 w-4 text-slate-400" />
              <span className="font-medium">{preview.fileName}</span>
              <span className="text-slate-400">
                · {(preview.fileSize / 1024).toFixed(0)} KB
                {preview.separator ? ` · separador "${preview.separator}"` : ""}
              </span>
              {preview.blockMode && (
                <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700">
                  <Sparkles aria-hidden="true" className="h-3 w-3" />
                  pack APU detectado
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />
              Cambiar archivo
            </button>
          </div>

          {parseError && (
            <p
              role="alert"
              className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
            >
              <AlertTriangle aria-hidden="true" className="h-4 w-4 shrink-0" />
              {parseError}
            </p>
          )}

          <MetricsPanel
            metrics={preview.metrics}
            confidence={preview.confidence}
            blockMode={preview.blockMode}
          />

          <MappingEditor
            mapping={draftMapping}
            columns={preview.columns}
            blockMode={preview.blockMode}
            onChange={handleMappingChange}
          />

          <PreviewTable rows={preview.rows} blockMode={preview.blockMode} />

          {preview.warnings.length > 0 && (
            <details className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 shadow-sm">
              <summary className="cursor-pointer text-sm font-medium text-amber-800">
                {preview.warnings.length} aviso(s) a revisar
              </summary>
              <ul className="mt-2 max-h-40 list-inside list-disc space-y-1 overflow-y-auto text-xs text-amber-800">
                {preview.warnings.map((warning, i) => (
                  <li key={i}>
                    {warning.rowIndex !== undefined && (
                      <span className="tabular-nums">Fila {warning.rowIndex + 1}: </span>
                    )}
                    {warning.message}
                  </li>
                ))}
              </ul>
            </details>
          )}

          {executeError && (
            <p
              role="alert"
              className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
            >
              <AlertTriangle aria-hidden="true" className="h-4 w-4 shrink-0" />
              {executeError}
            </p>
          )}

          <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-600">
              {importable > 0 ? (
                <>
                  Se importarán <b className="tabular-nums">{importable}</b>{" "}
                  {preview.blockMode ? "actividades" : "insumos"} (las{" "}
                  <b className="tabular-nums">{preview.metrics.omittedRows}</b>{" "}
                  omitidas se descartan). La operación es atómica: si falla, no
                  se guarda nada.
                </>
              ) : (
                <span className="text-rose-600">
                  No hay filas válidas para importar: ajusta el mapeo o el
                  archivo.
                </span>
              )}
            </p>
            <button
              type="button"
              disabled={importable === 0 || executePending}
              onClick={handleExecute}
              className={cn(
                "inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600",
                (importable === 0 || executePending) &&
                  "cursor-not-allowed opacity-50 hover:bg-amber-500",
              )}
            >
              {executePending ? (
                <>
                  <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                  Importando…
                </>
              ) : (
                <>
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                  Importar ahora
                </>
              )}
            </button>
          </div>
        </section>
      )}

      {/* Paso 3: reporte */}
      {step === "done" && result && (
        <section className="rounded-xl border border-emerald-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700">
              <CheckCircle2 aria-hidden="true" className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                Importación completada
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                La base ya quedó actualizada. Resumen:
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {(result.createdItems > 0 || result.updatedItems > 0) && (
                  <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                    <p className="text-2xl font-semibold tabular-nums text-slate-800">
                      {result.createdItems + result.updatedItems}
                    </p>
                    <p className="text-xs text-slate-500">
                      insumos ({result.createdItems} nuevos · {result.updatedItems} actualizados)
                    </p>
                  </div>
                )}
                {(result.createdActivities > 0 || result.updatedActivities > 0) && (
                  <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                    <p className="text-2xl font-semibold tabular-nums text-slate-800">
                      {result.createdActivities + result.updatedActivities}
                    </p>
                    <p className="text-xs text-slate-500">
                      actividades ({result.createdActivities} nuevas ·{" "}
                      {result.updatedActivities} actualizadas)
                    </p>
                  </div>
                )}
                <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                  <p className="text-2xl font-semibold tabular-nums text-slate-800">
                    {result.createdCompositions}
                  </p>
                  <p className="text-xs text-slate-500">líneas de composición</p>
                </div>
                <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                  <p className="text-2xl font-semibold tabular-nums text-slate-800">
                    {result.omittedRows + result.warnings}
                  </p>
                  <p className="text-xs text-slate-500">
                    omitidas + avisos
                  </p>
                </div>
              </div>
              {result.errors.length > 0 && (
                <p className="mt-3 text-xs text-rose-600">
                  {result.errors.join(" ")}
                </p>
              )}
              <div className="mt-5 flex flex-wrap gap-2">
                <Link
                  href={`/${tenantSlug}/quotes`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
                >
                  Ir a presupuestos
                </Link>
                <button
                  type="button"
                  onClick={reset}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />
                  Importar otro archivo
                </button>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}