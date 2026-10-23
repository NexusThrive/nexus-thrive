"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/ops/access";
import { ACCOUNT_STAGES, deleteContact, saveContact, tenantName, updateAccount, type AccountStageValue } from "@/lib/ops/accounts";
import { logOps } from "@/lib/ops/audit";
import { validateContact } from "@/lib/ops/validators";
import { isActiveStaff } from "@/lib/ops/team";
import { deleteTenantCompletely } from "@/lib/tenant/deletion";

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
    if (!(await isActiveStaff(managerId))) managerId = null;
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

/**
 * Elimina el negocio de raíz: el negocio y TODOS sus datos (clientes,
 * membresías, dinero, asistencia, proyectos, tickets, leads…). Las cuentas de
 * Clerk de su equipo quedan libres: pueden entrar y volver a crear un
 * negocio.
 *
 * Pide confirmar escribiendo "eliminar" (lo comprueba el servidor, no solo el
 * formulario).
 */
export async function deleteBusinessAction(
  tenantId: string,
  confirm: string,
): Promise<ActionResult & { total?: number }> {
  const ctx = await requireStaff("accounts.edit");
  if (!ctx) return DENIED;
  if (confirm.trim().toLowerCase() !== "eliminar") {
    return { ok: false, message: "Para confirmar, escribe «eliminar»." };
  }
  const name = await tenantName(tenantId);
  if (!name) return { ok: false, message: "El negocio ya no existe." };

  const result = await deleteTenantCompletely(tenantId);
  if (!result.ok) return { ok: false, message: result.message };

  await logOps(ctx, "TENANT_DELETE", {
    targetTenantId: tenantId,
    targetTenantName: name,
    metadata: { tables: result.tables, rows: result.total, clerkUsers: result.clerkUsers.length },
  });
  revalidatePath("/admin/negocios");
  revalidatePath("/admin");
  return { ok: true, total: result.total };
}
