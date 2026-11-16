"use server";

import { revalidatePath } from "next/cache";
import { normalizeEmail, slugFromName } from "@/lib/platform/admin/account-limits";
import { createManagedBusiness, provisioningErrorMessage } from "@/lib/platform/admin/managed-business";
import { setLimit } from "@/lib/platform/admin/users-db";
import { requireStaff } from "@/lib/platform/team/access";
import { logOps } from "@/lib/platform/team/audit";

export type UserResult = { ok: true; message: string } | { ok: false; message: string };
const DENIED: UserResult = { ok: false, message: "No tienes permiso para esta acción." };
const refresh = () => revalidatePath("/admin/usuarios");

/** Fija (o quita) el máximo de negocios de una persona. */
export async function setUserLimitAction(email: string, raw: string, note: string): Promise<UserResult> {
  const ctx = await requireStaff("accounts.edit");
  if (!ctx) return DENIED;
  const r = await setLimit(email, raw, note);
  if (!r.ok) return r;
  await logOps(ctx, "USER_LIMIT_SET", { metadata: { email: normalizeEmail(email), limit: r.limit } });
  refresh();
  return { ok: true, message: r.limit === null ? "Límite quitado" : `Límite fijado en ${r.limit}` };
}

/** Crea un negocio para una persona (queda con una invitación de dueño a su correo), respetando su límite. */
export async function createUserOrganizationAction(email: string, name: string, _vertical: string, provisioningKey?: string): Promise<UserResult> {
  const ctx = await requireStaff("accounts.create");
  if (!ctx) return DENIED;
  if (!provisioningKey) return { ok: false, message: "Actualiza el formulario para crear una solicitud segura." };
  try {
    const tenant = await createManagedBusiness({ name, ownerEmail: normalizeEmail(email), slug: slugFromName(name, () => false), provisioningKey }, { userId: ctx.clerkUserId, email: ctx.email });
    refresh();
    return { ok: true, message: `Negocio «${tenant.name}» creado en preparación, sin acceso del propietario.` };
  } catch (error) {
    return { ok: false, message: provisioningErrorMessage(error) };
  }
}
