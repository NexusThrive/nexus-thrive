"use server";

import { requireTenantContext as requireSharedTenantContext } from "@/lib/tenant/context";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { createTenantDb } from "@/lib/tenant/db";
import { getQuoteTerms } from "@/lib/vertical-terms";
import { analyzeFile, buildExecutionPlan } from "@/lib/construction/apu-importer";
import { executeImport } from "@/lib/construction/apu-importer/execute";
import { isMasterPackWorkbook, parseMasterPack } from "@/lib/construction/apu-importer/master-pack";
import { buildMasterPackPlan } from "@/lib/construction/apu-importer/master-pack-plan";
import {
  executeMasterPackImport,
  type MasterPackImportResult,
} from "@/lib/construction/apu-importer/master-pack-import";
import {
  summarizeMasterPack,
  type MasterPackSummary,
} from "@/lib/construction/apu-importer/master-pack-summary";
import { discardImportBlob, readImportSource } from "@/lib/construction/apu-importer/upload-source";
import { canGovernBudget } from "@/lib/tenant/context";
import * as XLSX from "xlsx";
import type {
  ColumnMapping,
  ImportPreview,
  ImportResult,
  ParsedRow,
} from "@/lib/construction/apu-importer/types";

/* ------------------------------------------------------------------ */
/* Límites de seguridad                                                */
/* ------------------------------------------------------------------ */

const MAX_ITEMS_PER_IMPORT = 50_000;
const MAX_ACTIVITY_LINES_TOTAL = 200_000;

/* ------------------------------------------------------------------ */
/* Tipos de estado (firma useActionState)                              */
/* ------------------------------------------------------------------ */

/**
 * Resultado del análisis de un archivo: un pack APU completo (resumen contra
 * el catálogo) o un archivo plano (vista previa con mapeo de columnas).
 */
export type AnalyzeImportState =
  | { status: "error"; message: string }
  | { status: "ok"; kind: "master-pack"; summary: MasterPackSummary }
  | { status: "ok"; kind: "generic"; preview: ImportPreview };

export type MasterPackImportState =
  | { status: "error"; message: string }
  | { status: "ok"; result: MasterPackImportResult; message: string };

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
  | {
      tenantId: string;
      tenantDb: TenantDb;
      terms: ReturnType<typeof getQuoteTerms>;
      userId: string;
      canImport: boolean;
    }
  | null
> {
  const context = await requireSharedTenantContext(tenantSlug, "/catalog");
  if (!context) {
    return null;
  }
  return {
    tenantId: context.tenantId,
    tenantDb: context.tenantDb,
    terms: getQuoteTerms(context.vertical),
    userId: context.userId,
    canImport: canGovernBudget(context.role),
  };
}

function isWorkbookPack(buffer: ArrayBuffer, fileName: string): boolean {
  if (!/\.xlsx?$/i.test(fileName)) return false;
  try {
    const workbook = XLSX.read(new Uint8Array(buffer), { type: "array", bookSheets: true });
    return isMasterPackWorkbook(workbook.SheetNames);
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* Fase 1 — Análisis (sin escribir en la base)                         */
/* ------------------------------------------------------------------ */

/**
 * Analiza el archivo subido (FormData con `file`, o `blobUrl` de Vercel Blob
 * para archivos grandes). Un pack APU completo devuelve un resumen contra el
 * catálogo; un archivo plano, la vista previa con mapeo de columnas.
 */
export async function analyzeImportAction(
  tenantSlug: string,
  formData: FormData,
): Promise<AnalyzeImportState> {
  const context = await requireTenantContext(tenantSlug);
  if (!context) return { status: "error", message: "No tienes acceso a este negocio." };

  let source;
  try {
    source = await readImportSource(formData);
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "No se pudo leer el archivo." };
  }

  try {
    if (isWorkbookPack(source.buffer, source.fileName)) {
      const parse = parseMasterPack(source.buffer);
      const plan = buildMasterPackPlan(parse);
      const summary = await summarizeMasterPack({
        tenantId: context.tenantId,
        fileName: source.fileName,
        parse,
        plan,
      });
      return { status: "ok", kind: "master-pack", summary };
    }
    const preview = analyzeFile({
      buffer: source.buffer,
      fileName: source.fileName,
      fileSize: source.size,
    });
    if (preview.errors.length > 0 && preview.rows.length === 0) {
      return { status: "error", message: preview.errors.join(" ") };
    }
    return { status: "ok", kind: "generic", preview };
  } catch (error) {
    console.error("[apu-importer] analyzeImportAction", error);
    return {
      status: "error",
      message: "No se pudo leer el archivo. Verifica que sea un Excel o CSV válido.",
    };
  }
}

/* ------------------------------------------------------------------ */
/* Fase 2a — Importación del pack APU completo                         */
/* ------------------------------------------------------------------ */

/**
 * Importa un pack APU completo. Vuelve a leer y verificar el archivo en el
 * servidor (nunca confía en el resumen del cliente) y escribe todo en una
 * transacción. Solo OWNER y SUPERADMIN: cambia el catálogo de todo el negocio.
 */
export async function importMasterPackAction(
  tenantSlug: string,
  formData: FormData,
): Promise<MasterPackImportState> {
  const context = await requireTenantContext(tenantSlug);
  if (!context) return { status: "error", message: "No tienes acceso a este negocio." };
  if (!context.canImport) {
    return { status: "error", message: "Solo el dueño del negocio puede importar el catálogo APU." };
  }

  let source;
  try {
    source = await readImportSource(formData);
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "No se pudo leer el archivo." };
  }

  try {
    const parse = parseMasterPack(source.buffer);
    const plan = buildMasterPackPlan(parse);
    const result = await executeMasterPackImport({
      tenantId: context.tenantId,
      parse,
      plan,
      fileName: source.fileName,
      fileSha256: source.sha256,
      importedBy: context.userId,
      updatePrices: formData.get("updatePrices") !== "false",
    });
    await discardImportBlob(source.blobUrl);
    revalidatePath(`/${tenantSlug}/catalog`, "page");
    revalidatePath(`/${tenantSlug}/catalog/import`, "page");
    const created = result.items.created + result.activities.created;
    return {
      status: "ok",
      result,
      message:
        created > 0
          ? `Catálogo importado: ${result.activities.created} actividades y ${result.items.created} insumos nuevos.`
          : "Catálogo actualizado. No faltaba nada: se refrescaron las líneas del archivo.",
    };
  } catch (error) {
    console.error("[apu-importer] importMasterPackAction", error);
    return {
      status: "error",
      message: "La importación falló y no se guardó nada. Revisa el archivo e inténtalo de nuevo.",
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

    revalidatePath(`/${input.tenantSlug}/catalog`, "page");
    revalidatePath(`/${input.tenantSlug}/catalog/import`, "page");

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
