"use server";

import { revalidatePath } from "next/cache";
import { can } from "@/lib/core/auth/permissions";
import { logTenantAction } from "@/lib/core/tenancy/audit";
import { requireTenantContext } from "@/lib/core/tenancy/context";
import { OPPORTUNITY_FILE, getOpportunityDetail, searchCustomersForPicker, type OpportunityDetail } from "@/lib/business/growth/pipeline-read";
import { addAttachment, checkAttachment } from "@/lib/business/sales/finance-db";
import { addOpportunityFileEvent } from "@/lib/business/growth/pipeline-db";
import {
  addOpportunityNote,
  completeActivity,
  createQuickOpportunity,
  deleteOpportunity,
  duplicateOpportunity,
  loseWithReason,
  moveToStage,
  reopenOpportunity,
  reorderColumn,
  rescheduleActivity,
  scheduleActivity,
  updateOpportunity,
  winWithOrder,
  type OpportunityPatch,
  type QuickInput,
} from "@/lib/business/growth/pipeline-db";
import type { ActivityKind } from "@/lib/business/growth/pipeline";

export type PipelineResult<T = object> = ({ ok: true; message?: string } & T) | { ok: false; message: string };

const NO_ACCESS = { ok: false as const, message: "No tienes acceso a este negocio." };
const refresh = (slug: string, id?: string) => {
  revalidatePath(`/${slug}/crm`);
  if (id) revalidatePath(`/${slug}/crm/oportunidades/${id}`);
  revalidatePath(`/${slug}/contactos`);
  revalidatePath(`/${slug}`);
};

/** Clientes que coinciden con lo escrito en el contacto de la creación rápida (nombre, teléfono o correo). */
export async function searchContactsAction(slug: string, q: string) {
  const ctx = await requireTenantContext(slug, "/crm");
  if (!ctx) return [];
  return searchCustomersForPicker(ctx.tenantId, q);
}

export async function quickCreateAction(slug: string, input: QuickInput): Promise<PipelineResult<{ id: string }>> {
  const ctx = await requireTenantContext(slug, "/crm");
  if (!ctx) return NO_ACCESS;
  const r = await createQuickOpportunity(ctx.tenantId, ctx.memberId, input);
  if (!r.ok) return r;
  await logTenantAction(ctx, "BIZ_OPPORTUNITY", { action: "create_opportunity", id: r.id });
  refresh(slug);
  return { ok: true, id: r.id, message: "Oportunidad creada" };
}

/** Detalle de una oportunidad para el panel lateral del tablero (solo lectura): se busca por `tenantId`, nunca por el identificador solo. */
export async function previewOpportunityAction(slug: string, id: string): Promise<PipelineResult<{ detail: OpportunityDetail }>> {
  const ctx = await requireTenantContext(slug, "/crm");
  if (!ctx) return NO_ACCESS;
  const detail = await getOpportunityDetail(ctx.tenantId, id);
  if (!detail) return { ok: false, message: "La oportunidad ya no existe." };
  return { ok: true, detail };
}

export async function moveStageAction(slug: string, id: string, stageId: string): Promise<PipelineResult<{ orderId?: string | null }>> {
  const ctx = await requireTenantContext(slug, "/crm");
  if (!ctx) return NO_ACCESS;
  const r = await moveToStage(ctx.tenantId, id, stageId, ctx.memberId);
  if (!r.ok) return r;
  await logTenantAction(ctx, "BIZ_OPPORTUNITY", { action: r.won ? "win_opportunity" : "move_stage", id, stageId });
  refresh(slug, id);
  return { ok: true, orderId: r.orderId, message: r.won ? (r.orderId ? "¡Ganada! Se creó el pedido" : "¡Ganada!") : "Etapa actualizada" };
}

export async function winAction(slug: string, id: string): Promise<PipelineResult<{ orderId: string | null }>> {
  const ctx = await requireTenantContext(slug, "/crm");
  if (!ctx) return NO_ACCESS;
  const r = await winWithOrder(ctx.tenantId, id, ctx.memberId);
  if (!r.ok) return r;
  await logTenantAction(ctx, "BIZ_OPPORTUNITY", { action: "win_opportunity", id, orderId: r.orderId });
  refresh(slug, id);
  return { ok: true, orderId: r.orderId, message: r.orderId ? "¡Ganada! Se creó el pedido en Ventas y cobros" : "¡Ganada!" };
}

export async function loseAction(slug: string, id: string, reasonId: string | null, note: string): Promise<PipelineResult> {
  const ctx = await requireTenantContext(slug, "/crm");
  if (!ctx) return NO_ACCESS;
  const r = await loseWithReason(ctx.tenantId, id, reasonId, note, ctx.memberId);
  if (!r.ok) return r;
  await logTenantAction(ctx, "BIZ_OPPORTUNITY", { action: "lose_opportunity", id });
  refresh(slug, id);
  return { ok: true, message: "Oportunidad perdida: quedó el motivo" };
}

export async function reopenAction(slug: string, id: string): Promise<PipelineResult> {
  const ctx = await requireTenantContext(slug, "/crm");
  if (!ctx) return NO_ACCESS;
  const r = await reopenOpportunity(ctx.tenantId, id, ctx.memberId);
  if (!r.ok) return r;
  await logTenantAction(ctx, "BIZ_OPPORTUNITY", { action: "reopen_opportunity", id });
  refresh(slug, id);
  return { ok: true, message: "Oportunidad reabierta" };
}

export async function reorderAction(slug: string, orderedIds: string[]): Promise<PipelineResult> {
  const ctx = await requireTenantContext(slug, "/crm");
  if (!ctx) return NO_ACCESS;
  const r = await reorderColumn(ctx.tenantId, orderedIds);
  refresh(slug);
  return r;
}

export async function updateOpportunityAction(slug: string, id: string, patch: OpportunityPatch): Promise<PipelineResult> {
  const ctx = await requireTenantContext(slug, "/crm");
  if (!ctx) return NO_ACCESS;
  const r = await updateOpportunity(ctx.tenantId, id, patch, ctx.memberId);
  if (!r.ok) return r;
  refresh(slug, id);
  return { ok: true, message: "Cambios guardados" };
}

export async function scheduleActivityAction(slug: string, id: string, input: { kind: ActivityKind; title?: string; dueAt: string; assigneeId?: string | null }): Promise<PipelineResult> {
  const ctx = await requireTenantContext(slug, "/crm");
  if (!ctx) return NO_ACCESS;
  const r = await scheduleActivity(ctx.tenantId, id, input, ctx.memberId);
  if (!r.ok) return r;
  refresh(slug, id);
  revalidatePath(`/${slug}/crm/tareas`);
  return { ok: true, message: "Actividad programada" };
}

export async function completeActivityAction(slug: string, taskId: string): Promise<PipelineResult<{ opportunityId: string | null }>> {
  const ctx = await requireTenantContext(slug, "/crm");
  if (!ctx) return NO_ACCESS;
  const r = await completeActivity(ctx.tenantId, taskId, ctx.memberId);
  if (!r.ok) return r;
  refresh(slug, r.opportunityId ?? undefined);
  revalidatePath(`/${slug}/crm/tareas`);
  return { ok: true, opportunityId: r.opportunityId, message: "Actividad hecha" };
}

export async function rescheduleActivityAction(slug: string, taskId: string, dueAt: string, opportunityId: string): Promise<PipelineResult> {
  const ctx = await requireTenantContext(slug, "/crm");
  if (!ctx) return NO_ACCESS;
  const r = await rescheduleActivity(ctx.tenantId, taskId, dueAt, ctx.memberId);
  if (!r.ok) return r;
  refresh(slug, opportunityId);
  return { ok: true, message: "Actividad reprogramada" };
}

export async function addNoteAction(slug: string, id: string, text: string): Promise<PipelineResult> {
  const ctx = await requireTenantContext(slug, "/crm");
  if (!ctx) return NO_ACCESS;
  const r = await addOpportunityNote(ctx.tenantId, id, text, ctx.memberId);
  if (!r.ok) return r;
  refresh(slug, id);
  return { ok: true, message: "Nota registrada" };
}

export async function duplicateOpportunityAction(slug: string, id: string): Promise<PipelineResult<{ id: string }>> {
  const ctx = await requireTenantContext(slug, "/crm");
  if (!ctx) return NO_ACCESS;
  const r = await duplicateOpportunity(ctx.tenantId, id, ctx.memberId);
  if (!r.ok) return r;
  refresh(slug);
  return { ok: true, id: r.id, message: "Oportunidad duplicada" };
}

export async function deleteOpportunityAction(slug: string, id: string): Promise<PipelineResult> {
  const ctx = await requireTenantContext(slug, "/crm");
  if (!ctx) return NO_ACCESS;
  if (!can(ctx.role, "customers.delete")) return { ok: false, message: "Tu rol no puede eliminar oportunidades." };
  const r = await deleteOpportunity(ctx.tenantId, id);
  if (!r.ok) return r;
  await logTenantAction(ctx, "BIZ_OPPORTUNITY", { action: "delete_opportunity", id });
  refresh(slug);
  return { ok: true, message: "Oportunidad eliminada" };
}

/** Adjunta un archivo (PDF o imagen) a la oportunidad desde su actividad. */
export async function attachOpportunityFileAction(form: FormData): Promise<PipelineResult> {
  const slug = String(form.get("slug") ?? "");
  const id = String(form.get("id") ?? "");
  const file = form.get("file");
  const ctx = await requireTenantContext(slug, "/crm");
  if (!ctx) return NO_ACCESS;
  if (!(file instanceof File)) return { ok: false, message: "Elige un archivo." };
  const invalid = checkAttachment(file);
  if (invalid) return { ok: false, message: invalid };
  const r = await addOpportunityFileEvent(ctx.tenantId, id, file.name, ctx.memberId);
  if (!r.ok) return r;
  await addAttachment(ctx.tenantId, OPPORTUNITY_FILE, id, file, ctx.memberId);
  refresh(slug, id);
  return { ok: true, message: "Archivo adjuntado" };
}
