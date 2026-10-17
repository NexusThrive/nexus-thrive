"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/ops/access";
import { ACCOUNT_STAGES, deleteContact, saveContact, tenantName, updateAccount, type AccountStageValue } from "@/lib/ops/accounts";
import { logOps } from "@/lib/ops/audit";
import { validateContact } from "@/lib/ops/validators";
import { db } from "@/prisma/db";

export type ActionResult = { ok: true } | { ok: false; message: string; errors?: Record<string, string> };
const DENIED: ActionResult = { ok: false, message: "No tienes permiso para esta acción." };

/** Etapa comercial y responsable de cuenta. */
export async function updateAccountAction(tenantId: string, input: { stage: string; managerId: string }): Promise<ActionResult> {
  const ctx = await requireStaff("accounts.edit");
  if (!ctx) return DENIED;
  const name = await tenantName(tenantId);
  if (!name) return { ok: false, message: "El negocio ya no existe." };
  if (!ACCOUNT_STAGES.some((s) => s.value === input.stage)) return { ok: false, message: "Etapa no válida." };
  let managerId: string | null = input.managerId || null;
  if (managerId) {
    const m = await db.orm.public.StaffMember.where({ id: managerId, active: true }).first();
    if (!m) managerId = null;
  }
  await updateAccount(tenantId, { accountStage: input.stage as AccountStageValue, accountManagerId: managerId });
  await logOps(ctx, "ACCOUNT_UPDATE", { targetTenantId: tenantId, targetTenantName: name, metadata: { stage: input.stage, managerId } });
  revalidatePath(`/admin/negocios/${tenantId}`);
  revalidatePath("/admin");
  return { ok: true };
}

export async function saveContactAction(tenantId: string, input: Record<string, unknown> & { id?: string }): Promise<ActionResult> {
  const ctx = await requireStaff("accounts.edit");
  if (!ctx) return DENIED;
  const name = await tenantName(tenantId);
  if (!name) return { ok: false, message: "El negocio ya no existe." };
  const v = validateContact(input);
  if (!v.ok) return { ok: false, message: v.errors.contact ?? "Revisa los campos marcados.", errors: v.errors };
  await saveContact(tenantId, typeof input.id === "string" && input.id ? input.id : undefined, v.value);
  await logOps(ctx, "CONTACT_SAVE", { targetTenantId: tenantId, targetTenantName: name, metadata: { contact: v.value.name, purpose: v.value.purpose } });
  revalidatePath(`/admin/negocios/${tenantId}`);
  return { ok: true };
}

export async function deleteContactAction(tenantId: string, contactId: string): Promise<ActionResult> {
  const ctx = await requireStaff("accounts.edit");
  if (!ctx) return DENIED;
  const name = await tenantName(tenantId);
  if (!name) return { ok: false, message: "El negocio ya no existe." };
  await deleteContact(tenantId, contactId);
  await logOps(ctx, "CONTACT_DELETE", { targetTenantId: tenantId, targetTenantName: name });
  revalidatePath(`/admin/negocios/${tenantId}`);
  return { ok: true };
}
