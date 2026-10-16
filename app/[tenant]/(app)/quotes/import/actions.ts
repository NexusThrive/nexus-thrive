"use server";

import { requireTenantContext as requireSharedTenantContext } from "@/lib/tenant-context";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { createTenantDb } from "@/lib/tenant-db";
import { getQuoteTerms } from "@/lib/vertical-terms";
import { analyzeFile, buildExecutionPlan } from "@/lib/apu-importer";
import { executeImport } from "@/lib/apu-importer/execute";
import type {
  ColumnMapping,
  ImportPreview,
  ImportResult,
  ParsedRow,
} from "@/lib/apu-importer/types";

/* ------------------------------------------------------------------ */
/* Límites de seguridad                                                */
/* ------------------------------------------------------------------ */

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB (el MASTER PACK pesa ~16 MB)
const ALLOWED_EXTENSIONS = new Set(["xlsx", "xls", "csv", "txt"]);
const MAX_ITEMS_PER_IMPORT = 50_000;
const MAX_ACTIVITY_LINES_TOTAL = 200_000;

/* ------------------------------------------------------------------ */
/* Tipos de estado (firma useActionState)                              */
/* ------------------------------------------------------------------ */

export type ParseFileState = {
  status: "idle" | "error" | "ok";
  message?: string;
  preview?: ImportPreview;
};

export type ExecuteImportState = {
  status: "idle" | "error" | "ok";
  message?: string;
  result?: ImportResult;
};

const ACCESS_DENIED_FORM = {
  status: "error",
  message: "No tienes acceso a este negocio.",
} as const;

type TenantDb = ReturnType<typeof createTenantDb>;

async function requireTenantContext(tenantSlug: string): Promise<
  | { tenantId: string; tenantDb: TenantDb; terms: ReturnType<typeof getQuoteTerms> }
  | null
> {
  const context = await requireSharedTenantContext(tenantSlug);
  if (!context) {
    return null;
  }
  return {
    tenantId: context.tenantId,
    tenantDb: context.tenantDb,
    terms: getQuoteTerms(context.vertical),
  };
}

/* ------------------------------------------------------------------ */
/* Fase 1 — Parse y preview (sin tocar la base)                        */
/* ------------------------------------------------------------------ */

export async function parseApuFileAction(
  _prevState: ParseFileState,
  formData: FormData,
): Promise<ParseFileState> {
  const { userId } = await auth();
  if (!userId) {
    return { status: "error", message: "Debes iniciar sesión para importar." };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { status: "error", message: "Selecciona un archivo (.xlsx, .csv o .txt)." };
  }
  if (file.size === 0) {
    return { status: "error", message: "El archivo está vacío." };
  }
  if (file.size > MAX_FILE_SIZE) {
    return {
      status: "error",
      message: `El archivo supera el límite de ${Math.round(MAX_FILE_SIZE / 1024 / 1024)} MB.`,
    };
  }

  const extension = file.name.toLowerCase().split(".").pop() ?? "";
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    return {
      status: "error",
      message: "Formato no soportado. Usa .xlsx, .csv o .txt.",
    };
  }

  try {
    const buffer = await file.arrayBuffer();
    const preview = analyzeFile({
      buffer,
      fileName: file.name,
      fileSize: file.size,
    });
    if (preview.errors.length > 0 && preview.rows.length === 0) {
      return {
        status: "error",
        message: preview.errors.join(" "),
        preview,
      };
    }
    return { status: "ok", preview };
  } catch (error) {
    console.error("[apu-importer] parseApuFileAction", error);
    return {
      status: "error",
      message:
        "No se pudo leer el archivo. Verifica que sea un Excel o CSV válido.",
    };
  }
}

/* ------------------------------------------------------------------ */
/* Fase 2 — Importación transaccional                                  */
/* ------------------------------------------------------------------ */

/**
 * Ejecuta la importación validando TODO de nuevo (nunca confía en el preview).
 *
 * - Re-deriva cada fila desde `raw` + mapping (buildExecutionPlan).
 * - Upsert de insumos por código (tenantId+code) o por nombre normalizado.
 * - Upsert de actividades por código o por nombre; composiciones reemplazadas.
 * - Todo dentro de UNA transacción: si algo falla, ROLLBACK completo.
 */
export async function executeSmartImportAction(input: {
  tenantSlug: string;
  mapping: ColumnMapping[];
  rows: ParsedRow[];
  fileName?: string;
  updatePrices?: boolean;
}): Promise<ExecuteImportState> {
  const context = await requireTenantContext(input.tenantSlug);
  if (!context) return ACCESS_DENIED_FORM;

  const { tenantId } = context;

  try {
    const plan = buildExecutionPlan({ mapping: input.mapping, rows: input.rows });

    if (plan.items.length === 0 && plan.activities.length === 0) {
      return {
        status: "error",
        message:
          "No hay filas válidas para importar. Revisa el mapeo y las filas omitidas.",
      };
    }
    if (plan.items.length > MAX_ITEMS_PER_IMPORT) {
      return {
        status: "error",
        message: `El archivo importa más de ${MAX_ITEMS_PER_IMPORT} insumos; divídelo en lotes.`,
      };
    }
    const totalLines = plan.activities.reduce((acc, a) => acc + a.lines.length, 0);
    if (totalLines > MAX_ACTIVITY_LINES_TOTAL) {
      return {
        status: "error",
        message: `El archivo contiene más de ${MAX_ACTIVITY_LINES_TOTAL} líneas de composición; divídelo en lotes.`,
      };
    }

    const result = await executeImport(tenantId, plan, input.updatePrices === true);
    const warnings = plan.warnings.length + result.warnings;

    revalidatePath(`/${input.tenantSlug}/quotes`, "page");
    revalidatePath(`/${input.tenantSlug}/quotes/import`, "page");

    const summary = [];
    if (result.createdItems > 0) summary.push(`${result.createdItems} insumos creados`);
    if (result.updatedItems > 0) summary.push(`${result.updatedItems} insumos actualizados`);
    if (result.createdActivities > 0)
      summary.push(`${result.createdActivities} actividades creadas`);
    if (result.updatedActivities > 0)
      summary.push(`${result.updatedActivities} actividades actualizadas`);

    const priceChangeCount = result.priceChanges?.length ?? 0;
    const priceChangeMsg = priceChangeCount > 0
      ? ` (${priceChangeCount} precios ${input.updatePrices ? "actualizados" : "detectados, no aplicados"})`
      : "";
    return {
      status: "ok",
      message: `Importación completada: ${summary.join(", ") || "sin cambios"}.${priceChangeMsg}`,
      result: { ...result, warnings },
    };
  } catch (error) {
    console.error("[apu-importer] executeSmartImportAction", error);
    return {
      status: "error",
      message:
        "La importación falló y no se guardó nada. Revisa el archivo e inténtalo de nuevo.",
    };
  }
}

/* ------------------------------------------------------------------ */
/* Fase 1b — Parse desde Vercel Blob (archivos > 4.5 MB)               */
/* ------------------------------------------------------------------ */

export type ParseBlobState = {
  status: "idle" | "error" | "ok";
  message?: string;
  preview?: ImportPreview;
};

export async function parseApuFromBlobAction(
  _prevState: ParseBlobState,
  formData: FormData,
): Promise<ParseBlobState> {
  const { userId } = await auth();
  if (!userId) {
    return { status: "error", message: "Debes iniciar sesión para importar." };
  }

  const blobUrl = formData.get("blobUrl");
  const fileName = formData.get("fileName");
  const fileSize = formData.get("fileSize");

  if (!blobUrl || typeof blobUrl !== "string") {
    return { status: "error", message: "Falta la URL del archivo en Blob." };
  }
  if (!fileName || typeof fileName !== "string") {
    return { status: "error", message: "Falta el nombre del archivo." };
  }
  if (!fileSize || typeof fileSize !== "string") {
    return { status: "error", message: "Falta el tamaño del archivo." };
  }

  const size = Number.parseInt(fileSize, 10);
  if (Number.isNaN(size) || size === 0) {
    return { status: "error", message: "Tamaño de archivo inválido." };
  }
  if (size > MAX_FILE_SIZE) {
    return {
      status: "error",
      message: `El archivo supera el límite de ${Math.round(MAX_FILE_SIZE / 1024 / 1024)} MB.`,
    };
  }

  const extension = fileName.toLowerCase().split(".").pop() ?? "";
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    return {
      status: "error",
      message: "Formato no soportado. Usa .xlsx, .csv o .txt.",
    };
  }

  const tStart = Date.now();
  try {
    console.log("[apu-importer] parseApuFromBlobAction:START", { blobUrl, fileName, size });

    // Descarga con timeout (10s)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);
    let res: Response;
    try {
      res = await fetch(blobUrl, { signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }
    if (!res.ok) {
      return {
        status: "error",
        message: `No se pudo descargar el archivo desde Blob (${res.status}).`,
      };
    }
    const buffer = await res.arrayBuffer();
    console.log("[apu-importer] parseApuFromBlobAction:DOWNLOAD_OK", { ms: Date.now() - tStart, bufferSize: buffer.byteLength });

    const preview = analyzeFile({
      buffer,
      fileName,
      fileSize: size,
    });
    console.log("[apu-importer] parseApuFromBlobAction:PARSE_OK", { ms: Date.now() - tStart, rows: preview.rows.length });

    if (preview.errors.length > 0 && preview.rows.length === 0) {
      return {
        status: "error",
        message: preview.errors.join(" "),
        preview,
      };
    }
    console.log("[apu-importer] parseApuFromBlobAction:TOTAL_OK", { ms: Date.now() - tStart });
    return { status: "ok", preview };
  } catch (error) {
    console.error("[apu-importer] parseApuFromBlobAction:ERROR", { ms: Date.now() - tStart, error });
    return {
      status: "error",
      message:
        "No se pudo procesar el archivo desde Blob. Verifica que sea un Excel o CSV válido.",
    };
  }
}
