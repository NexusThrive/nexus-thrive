"use server";

import { revalidatePath } from "next/cache";
import { DEFAULT_MODULES_BY_VERTICAL, VERTICAL_LABELS, isVertical } from "@/lib/admin/catalogs";
import { normalizeEmail, slugFromName } from "@/lib/admin/account-limits";
import { createAdminDb } from "@/lib/admin/db";
import { organizationLimitProblem, setLimit } from "@/lib/admin/users-db";
import { requireStaff } from "@/lib/ops/access";
import { logOps } from "@/lib/ops/audit";

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
export async function createUserOrganizationAction(email: string, name: string, vertical: string): Promise<UserResult> {
  const ctx = await requireStaff("accounts.create");
  if (!ctx) return DENIED;
  const owner = normalizeEmail(email);
  if (name.trim().length < 3) return { ok: false, message: "Ponle un nombre al negocio (mínimo 3 letras)." };
  if (!isVertical(vertical)) return { ok: false, message: "Elige un rubro." };
  const problem = await organizationLimitProblem(owner);
  if (problem) return { ok: false, message: problem };
  const adminDb = createAdminDb();
  let slug = slugFromName(name, () => false);
  for (let i = 2; await adminDb.slugExists(slug); i++) slug = slugFromName(name, () => false) + `-${i}`;
  try {
    await adminDb.createTenant({ name: name.trim(), slug, vertical, modules: [...DEFAULT_MODULES_BY_VERTICAL[vertical]], tenantType: "COMPANY", ownerEmail: owner });
  } catch {
    return { ok: false, message: "No se pudo crear el negocio. Inténtalo de nuevo." };
  }
  await logOps(ctx, "USER_ORG_CREATE", { targetTenantName: name.trim(), metadata: { email: owner, slug, vertical } });
  refresh();
  return { ok: true, message: `Negocio «${name.trim()}» creado (${VERTICAL_LABELS[vertical]}); ${owner} lo reclama al entrar con ese correo` };
}
