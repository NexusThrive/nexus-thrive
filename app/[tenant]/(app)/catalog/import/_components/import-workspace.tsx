"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  RefreshCw,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import { NLoader } from "@/components/atoms/n-loader";
import { Badge } from "@/components/atoms/badge";
import FileDropzone from "./file-dropzone";
import MetricsPanel from "./metrics-panel";
import MappingEditor from "./mapping-editor";
import PreviewTable from "./preview-table";
import { analyzeImportAction, executeSmartImportAction, importMasterPackAction } from "../actions";
import { MasterPackPreview, MasterPackResult } from "./master-pack-panel";
import type { MasterPackSummary } from "@/lib/apu-importer/master-pack-summary";
import type { MasterPackImportResult } from "@/lib/apu-importer/master-pack-import";
import { recomputePreview } from "@/lib/apu-importer/recompute";
import type {
  ColumnMapping,
  ImportPreview,
  ImportResult,
} from "@/lib/apu-importer/types";
import { cn } from "@/lib/cn";
import { buttonVariants } from "@/components/atoms/button-variants";

type Step = "upload" | "preview" | "done" | "pack" | "pack-done";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB (espejo del server)
const VERCEL_BODY_LIMIT = 4.5 * 1024 * 1024; // 4.5 MB — límite de plataforma Vercel

/**
 * Workspace del importador (cliente).
 *
 * Fase 1: el usuario sube un archivo → `analyzeImportAction`
 *   - ≤ 4.5 MB: FormData directa.
 *   - > 4.5 MB: subida a Vercel Blob con token de un solo uso emitido por
 *     /api/blob-upload (el token de escritura nunca llega al navegador).
 * Fase 2:
 *   - Pack APU completo → resumen → `importMasterPackAction` (el servidor
 *     vuelve a leer el archivo y lo importa sin pérdida de datos).
 *   - Archivo plano → mapeo editable → `executeSmartImportAction`. Las filas
 *     se re-derivan en cliente con `recomputePreview` y el servidor revalida.
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
  const [packSummary, setPackSummary] = useState<MasterPackSummary | null>(null);
  const [packSource, setPackSource] = useState<FormData | null>(null);
  const [packResult, setPackResult] = useState<{ result: MasterPackImportResult; message: string } | null>(null);

  /** FormData con el archivo, o con la URL del blob si supera 4,5 MB. */
  async function buildSource(file: File): Promise<FormData> {
    const formData = new FormData();
    if (file.size <= VERCEL_BODY_LIMIT) {
      formData.set("file", file);
      return formData;
    }
    const { upload } = await import("@vercel/blob/client");
    const blob = await upload(`imports/${tenantSlug}/${file.name}`, file, {
      access: "public",
      handleUploadUrl: "/api/blob-upload",
      multipart: true,
    });
    formData.set("blobUrl", blob.url);
    formData.set("fileName", file.name);
    return formData;
  }

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

      const source = await buildSource(file);
      const response = await analyzeImportAction(tenantSlug, source);
      if (response.status === "error") {
        setParseError(response.message);
        return;
      }
      if (response.kind === "master-pack") {
        setPackSummary(response.summary);
        setPackSource(source);
        setStep("pack");
        return;
      }
      const preview: ImportPreview = response.preview;

      if (preview) {
        setPreview(preview);
        setDraftMapping(preview.mapping);
        setStep("preview");
      }
    } catch (error) {
      console.error("[import-workspace] handleFile", error);
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

  async function handlePackImport(updatePrices: boolean) {
    if (!packSource) return;
    setExecutePending(true);
    setExecuteError("");
    try {
      const formData = new FormData();
      for (const [key, value] of packSource.entries()) formData.set(key, value);
      formData.set("updatePrices", updatePrices ? "true" : "false");
      const response = await importMasterPackAction(tenantSlug, formData);
      if (response.status === "ok") {
        setPackResult({ result: response.result, message: response.message });
        setStep("pack-done");
        router.refresh();
      } else {
        setExecuteError(response.message);
      }
    } catch {
      setExecuteError("Ocurrió un error inesperado. No se guardó nada.");
    } finally {
      setExecutePending(false);
    }
  }

  function reset() {
    setPackSummary(null);
    setPackSource(null);
    setPackResult(null);
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
              className="flex items-center gap-2 rounded-md border-l-[3px] border-l-danger bg-danger-subtle px-3 py-2.5 text-[13px] text-danger"
            >
              <AlertTriangle aria-hidden="true" className="h-4 w-4 shrink-0" />
              {parseError}
            </p>
          )}
          <details className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
            <summary className="cursor-pointer font-medium text-foreground/80">
              ¿Qué formatos reconoce el importador?
            </summary>
            <ul className="mt-2 list-inside list-disc space-y-1 text-xs leading-relaxed text-muted-foreground">
              <li>
                <b>Insumos planos</b> (CSV, TXT o XLSX con columnas como código,
                descripción, unidad y precio): se mapean automáticamente.
              </li>
              <li>
                <b>Libro APU completo</b> (hojas ACTIVIDADES, APU, APU AUXILIARES,
                MATERIALES y CAPITULOS): se importa todo, con capítulos, APU
                auxiliares y las fotos de los insumos. Reimportarlo actualiza sin
                borrar nada.
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
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileSpreadsheet aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{preview.fileName}</span>
              <span className="text-muted-foreground">
                · {(preview.fileSize / 1024).toFixed(0)} KB
                {preview.separator ? ` · separador "${preview.separator}"` : ""}
              </span>
              {preview.blockMode && (
                <Badge variant="gold">
                  <Sparkles aria-hidden="true" className="h-3 w-3" />
                  pack APU detectado
                </Badge>
              )}
            </div>
            <button
              type="button"
              onClick={reset}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />
              Cambiar archivo
            </button>
          </div>

          {parseError && (
            <p
              role="alert"
              className="flex items-center gap-2 rounded-md border-l-[3px] border-l-danger bg-danger-subtle px-3 py-2.5 text-[13px] text-danger"
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
            <details className="rounded-lg border border-gold-300 bg-gold-100/60 p-4">
              <summary className="cursor-pointer text-sm font-medium text-gold-700">
                {preview.warnings.length} aviso(s) a revisar
              </summary>
              <ul className="mt-2 max-h-40 list-inside list-disc space-y-1 overflow-y-auto text-xs text-gold-700">
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
              className="flex items-center gap-2 rounded-md border-l-[3px] border-l-danger bg-danger-subtle px-3 py-2.5 text-[13px] text-danger"
            >
              <AlertTriangle aria-hidden="true" className="h-4 w-4 shrink-0" />
              {executeError}
            </p>
          )}

          <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {importable > 0 ? (
                <>
                  Se importarán <b className="tabular-nums">{importable}</b>{" "}
                  {preview.blockMode ? "actividades" : "insumos"} (las{" "}
                  <b className="tabular-nums">{preview.metrics.omittedRows}</b>{" "}
                  omitidas se descartan). La operación es atómica: si falla, no
                  se guarda nada.
                </>
              ) : (
                <span className="text-destructive">
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
                "inline-flex items-center justify-center gap-2 rounded-lg bg-gold-500 px-5 py-2.5 text-sm font-semibold text-accent-foreground transition hover:bg-gold-600",
                (importable === 0 || executePending) &&
                  "cursor-not-allowed opacity-50 hover:bg-gold-500",
              )}
            >
              {executePending ? (
                <>
                  <NLoader size={16} className="text-current" />
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

      {/* Pack APU completo: resumen y resultado */}
      {step === "pack" && packSummary && (
        <MasterPackPreview
          summary={packSummary}
          pending={executePending}
          error={executeError}
          onImport={handlePackImport}
          onReset={reset}
        />
      )}
      {step === "pack-done" && packResult && (
        <MasterPackResult
          tenantSlug={tenantSlug}
          result={packResult.result}
          message={packResult.message}
          onReset={reset}
        />
      )}

      {/* Paso 3: reporte */}
      {step === "done" && result && (
        <section className="rounded-lg border border-success/30 bg-card p-6">
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-sm bg-success/10 text-success">
              <CheckCircle2 aria-hidden="true" className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Importación completada
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                La base ya quedó actualizada. Resumen:
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {(result.createdItems > 0 || result.updatedItems > 0) && (
                  <div className="rounded-lg border border-border bg-muted/60 p-3">
                    <p className="text-2xl font-semibold tabular-nums text-foreground">
                      {result.createdItems + result.updatedItems}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      insumos ({result.createdItems} nuevos · {result.updatedItems} actualizados)
                    </p>
                  </div>
                )}
                {(result.createdActivities > 0 || result.updatedActivities > 0) && (
                  <div className="rounded-lg border border-border bg-muted/60 p-3">
                    <p className="text-2xl font-semibold tabular-nums text-foreground">
                      {result.createdActivities + result.updatedActivities}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      actividades ({result.createdActivities} nuevas ·{" "}
                      {result.updatedActivities} actualizadas)
                    </p>
                  </div>
                )}
                <div className="rounded-lg border border-border bg-muted/60 p-3">
                  <p className="text-2xl font-semibold tabular-nums text-foreground">
                    {result.createdCompositions}
                  </p>
                  <p className="text-xs text-muted-foreground">líneas de composición</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/60 p-3">
                  <p className="text-2xl font-semibold tabular-nums text-foreground">
                    {result.omittedRows + result.warnings}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    omitidas + avisos
                  </p>
                </div>
              </div>
              {result.errors.length > 0 && (
                <p className="mt-3 text-xs text-destructive">
                  {result.errors.join(" ")}
                </p>
              )}
              <div className="mt-5 flex flex-wrap gap-2">
                <Link
                  href={`/${tenantSlug}/catalog`}
                  className={buttonVariants()}
                >
                  Ir a presupuestos
                </Link>
                <button
                  type="button"
                  onClick={reset}
                  className={buttonVariants({ variant: "outline" })}
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