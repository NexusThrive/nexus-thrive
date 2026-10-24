"use server";

import { revalidatePath } from "next/cache";
import { can } from "@/lib/business/permissions";
import { importCustomers, importProducts, type ImportKind, type ImportReport } from "@/lib/data-exchange/exchange-db";
import { readTable } from "@/lib/data-exchange/table";
import { logTenantAction } from "@/lib/tenant/audit";
import { requireTenantContext } from "@/lib/tenant/context";

export type ImportActionResult = { ok: true; report: ImportReport } | { ok: false; message: string };

/**
 * Vista previa y carga comparten el mismo camino: la carga vuelve a leer y
 * validar el archivo en el servidor (nunca confía en lo que mostró la vista previa).
 */
async function run(slug: string, kind: ImportKind, formData: FormData, dryRun: boolean): Promise<ImportActionResult> {
  const ctx = await requireTenantContext(slug);
  if (!ctx) return { ok: false, message: "No tienes acceso a este negocio." };
  if (!can(ctx.role, "data.exchange")) return { ok: false, message: "Solo el dueño o administración puede importar datos." };
  if (kind !== "customers" && kind !== "products") return { ok: false, message: "Tipo de datos desconocido." };
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "Elige un archivo CSV o Excel." };
  const table = readTable(await file.arrayBuffer(), file.name);
  if (!table.ok) return { ok: false, message: table.message };
  const report = kind === "customers" ? await importCustomers(ctx.tenantId, table.table, { dryRun }) : await importProducts(ctx.tenantId, table.table, { dryRun });
  if (report.missingColumns.length) return { ok: false, message: `Al archivo le falta la columna ${report.missingColumns.join(" y ")}. Descarga la plantilla para ver cómo va.` };
  if (!dryRun) {
    await logTenantAction(ctx, "BIZ_DATA_IMPORT", { kind, file: file.name.slice(0, 120), created: report.created, updated: report.updated, unchanged: report.unchanged, errors: report.errors.length });
    revalidatePath(`/${slug}/${kind === "customers" ? "crm" : "inventory"}`);
  }
  return { ok: true, report };
}

export async function previewImportAction(slug: string, kind: ImportKind, formData: FormData): Promise<ImportActionResult> {
  return run(slug, kind, formData, true);
}

export async function commitImportAction(slug: string, kind: ImportKind, formData: FormData): Promise<ImportActionResult> {
  return run(slug, kind, formData, false);
}
