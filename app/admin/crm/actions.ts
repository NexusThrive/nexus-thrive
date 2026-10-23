"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/ops/access";
import { logOps } from "@/lib/ops/audit";
import { isLeadStage, LEAD_ACTIVITY_KINDS, stageMeta, validateLead, type LeadInput } from "@/lib/ops/crm-rules";
import { assignManagerIfMissing } from "@/lib/ops/accounts";
import { addLeadActivity, createLead, deleteLead, getLead, touchLead, updateLead } from "@/lib/ops/leads";
import { isActiveStaff } from "@/lib/ops/team";

export type LeadResult = { ok: true; id: string } | { ok: false; message: string; errors?: Partial<Record<keyof LeadInput, string>> };
const DENIED = { ok: false as const, message: "No tienes permiso para esta acción." };

function refresh(id?: string) {
  revalidatePath("/admin/crm");
  revalidatePath("/admin");
  if (id) revalidatePath(`/admin/crm/${id}`);
}

/** Crea o actualiza un lead. Reasignar a otra persona exige leads.assign. */
export async function saveLeadAction(id: string | null, input: LeadInput): Promise<LeadResult> {
  const ctx = await requireStaff("leads.edit");
  if (!ctx) return DENIED;
  const v = validateLead(input);
  if (!v.ok) return { ok: false, message: "Revisa los campos marcados.", errors: v.errors };
  const before = id ? await getLead(id) : null;
  if (id && !before) return { ok: false, message: "El lead no existe." };
  const ownerChanged = before ? before.ownerId !== v.value.ownerId : v.value.ownerId !== ctx.staffId;
  if (ownerChanged && v.value.ownerId && !ctx.permissions.includes("leads.assign")) {
    return { ok: false, message: "Solo puedes asignarte leads a ti; reasignar requiere el permiso de asignar." };
  }
  if (v.value.ownerId) {
    if (!(await isActiveStaff(v.value.ownerId))) return { ok: false, message: "El responsable no existe o está inactivo.", errors: { ownerId: "Elige un responsable activo." } };
  }
  const stageChanged = !!before && before.stage !== v.value.stage;
  let leadId = id;
  if (!id) {
    leadId = await createLead(v.value);
    await addLeadActivity(leadId, "stage", `Lead creado en ${stageMeta(v.value.stage).label}.`, ctx);
  } else {
    await updateLead(id, v.value, stageChanged);
    if (stageChanged) await addLeadActivity(id, "stage", `${stageMeta(before!.stage).label} → ${stageMeta(v.value.stage).label}${v.value.lostReason ? ` (${v.value.lostReason})` : ""}.`, ctx);
  }
  await logOps(ctx, stageChanged ? "LEAD_STAGE" : "LEAD_SAVE", { targetTenantId: v.value.tenantId ?? undefined, targetTenantName: v.value.company, metadata: { leadId, stage: v.value.stage } });
  // Ganado con negocio vinculado: el responsable del lead queda como responsable de la cuenta si no tenía.
  if (v.value.stage === "WON" && v.value.tenantId && v.value.ownerId) {
    await assignManagerIfMissing(v.value.tenantId, v.value.ownerId);
    if (stageChanged) await logOps(ctx, "LEAD_CONVERT", { targetTenantId: v.value.tenantId, targetTenantName: v.value.company, metadata: { leadId } });
  }
  refresh(leadId!);
  return { ok: true, id: leadId! };
}

/** Mueve un lead de etapa desde el tablero (sin perder las reglas). */
export async function moveLeadAction(id: string, stage: string): Promise<LeadResult> {
  const lead = await getLead(id);
  if (!lead) return { ok: false, message: "El lead no existe." };
  if (!isLeadStage(stage)) return { ok: false, message: "Etapa no válida." };
  if (stage === "LOST" || stage === "WON") return { ok: false, message: "Para ganar o perder un lead, ábrelo: hay que indicar el negocio o el motivo." };
  return saveLeadAction(id, { ...lead, stage, nextStepDate: lead.nextStepDate });
}

export async function addLeadActivityAction(id: string, kind: string, body: string): Promise<LeadResult> {
  const ctx = await requireStaff("leads.edit");
  if (!ctx) return DENIED;
  const k = LEAD_ACTIVITY_KINDS.find((x) => x.value === kind)?.value;
  const text = body.trim().slice(0, 2000);
  if (!k || text.length < 2) return { ok: false, message: "Escribe qué pasó." };
  if (!(await getLead(id))) return { ok: false, message: "El lead no existe." };
  await addLeadActivity(id, k, text, ctx);
  await touchLead(id);
  refresh(id);
  return { ok: true, id };
}

export async function deleteLeadAction(id: string): Promise<LeadResult> {
  const ctx = await requireStaff("leads.assign");
  if (!ctx) return DENIED;
  const lead = await getLead(id);
  if (!lead) return { ok: false, message: "El lead no existe." };
  await deleteLead(id);
  await logOps(ctx, "LEAD_SAVE", { targetTenantName: lead.company, metadata: { leadId: id, deleted: true } });
  refresh();
  return { ok: true, id };
}
