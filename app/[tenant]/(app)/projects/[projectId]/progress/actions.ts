"use server";

import { revalidatePath } from "next/cache";
import { decimalToMicro } from "@/lib/apu-engine";
import { requireTenantContext } from "@/lib/tenant-context";

export type ProgressActionResult = { ok: true; message: string } | { ok: false; message: string };

function progressErrorMessage(error: unknown): string {
  switch (error instanceof Error ? error.message : "") {
    case "NOT_FOUND":
      return "No se encontró la partida en el presupuesto de esta obra.";
    case "PROJECT_NOT_CONTRACTED":
      return "El avance se registra cuando la obra está contratada (cotización aprobada).";
    case "INVALID_QUANTITY":
      return "La cantidad ejecutada debe ser mayor que cero.";
    case "INVALID_DATE":
      return "La fecha de corte no puede ser posterior a hoy.";
    default:
      return "No se pudo registrar el avance. Inténtalo de nuevo.";
  }
}

/** Registra un acta de avance de una partida (cualquier miembro). */
export async function recordProgressAction(
  tenantSlug: string,
  projectId: string,
  formData: FormData,
): Promise<ProgressActionResult> {
  const context = await requireTenantContext(tenantSlug);
  if (!context) return { ok: false, message: "No tienes acceso a este negocio." };
  const quantityRaw = String(formData.get("executedQuantity") ?? "").trim().replace(",", ".");
  const executed = decimalToMicro(quantityRaw);
  if (executed === null) return { ok: false, message: "Escribe la cantidad ejecutada (ej. 12.5)." };
  const member = await context.tenantDb.users.findByClerkUserId(context.userId);
  try {
    const result = await context.tenantDb.progress.record(projectId, {
      budgetItemId: String(formData.get("budgetItemId") ?? ""),
      cutoffDate: String(formData.get("cutoffDate") ?? ""),
      executedQuantity: executed,
      note: String(formData.get("note") ?? "").slice(0, 300),
      authorName: member?.name?.trim() || member?.email || "Usuario",
    });
    revalidatePath(`/${tenantSlug}/projects/${projectId}`);
    return {
      ok: true,
      message:
        result.projectStatus === "IN_EXECUTION"
          ? "Avance registrado. La obra está en ejecución."
          : "Avance registrado.",
    };
  } catch (error) {
    return { ok: false, message: progressErrorMessage(error) };
  }
}

export async function deleteProgressAction(
  tenantSlug: string,
  projectId: string,
  entryId: string,
): Promise<ProgressActionResult> {
  const context = await requireTenantContext(tenantSlug);
  if (!context) return { ok: false, message: "No tienes acceso a este negocio." };
  await context.tenantDb.progress.remove(entryId);
  revalidatePath(`/${tenantSlug}/projects/${projectId}`);
  return { ok: true, message: "Acta eliminada." };
}
