"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/ops/access";
import { logOps } from "@/lib/ops/audit";
import { OWNER_ROLE_KEY, canGrantAll, normalizePermissions } from "@/lib/ops/permissions";
import {
  activeOwnerCount,
  createRole,
  createStaffInvite,
  deleteRole,
  emailTaken,
  getMember,
  getRole,
  inviteStaff,
  roleKeyTaken,
  roleMemberCount,
  setStaffActive,
  setStaffRole,
  unlinkStaffAccount,
  updateRole,
} from "@/lib/ops/team";
import { roleKeyFrom, validateInvite, validateRole } from "@/lib/ops/validators";

export type ActionResult =
  | { ok: true; token?: string }
  | { ok: false; message: string; errors?: Record<string, string> };

const DENIED: ActionResult = { ok: false, message: "No tienes permiso para esta acción." };
const refresh = () => revalidatePath("/admin/equipo");

/** Invita a un integrante: entra con ese correo y queda vinculado. */
export async function inviteStaffAction(input: { email: string; name: string; title: string; roleId: string }): Promise<ActionResult> {
  const ctx = await requireStaff("team.invite");
  if (!ctx) return DENIED;
  const v = validateInvite(input);
  if (!v.ok) return { ok: false, message: "Revisa los campos marcados.", errors: v.errors };
  const role = await getRole(v.value.roleId);
  if (!role) return { ok: false, message: "El rol ya no existe." };
  // Solo quien puede asignar roles invita con un rol distinto al más básico, y
  // nadie invita con permisos que no tiene.
  if (!ctx.permissions.includes("team.roles") || !canGrantAll(ctx.permissions, role.permissions ?? [])) {
    return { ok: false, message: "No puedes invitar con un rol que tiene más permisos que el tuyo." };
  }
  if (await emailTaken(v.value.email)) return { ok: false, message: "Ese correo ya está en el equipo.", errors: { email: "Ya está en el equipo." } };
  await inviteStaff({ ...v.value, invitedById: ctx.staffId });
  await logOps(ctx, "STAFF_INVITE", { metadata: { email: v.value.email, role: role.key } });
  refresh();
  return { ok: true };
}

/**
 * Suelta la cuenta de Clerk vinculada. Se usa cuando alguien se registró con
 * otra cuenta y por eso no puede entrar al panel: al desvincular, la próxima
 * vez que entre con ese correo se vincula sola.
 */
export async function unlinkStaffAccountAction(memberId: string): Promise<ActionResult> {
  const ctx = await requireStaff("team.roles");
  if (!ctx) return DENIED;
  const member = await getMember(memberId);
  if (!member) return { ok: false, message: "El integrante ya no existe." };
  await unlinkStaffAccount(member.id);
  await logOps(ctx, "STAFF_ROLE_CHANGE", {
    metadata: { email: member.email, event: "unlink" },
  });
  refresh();
  return { ok: true };
}

/**
 * Genera un enlace de invitación de un solo uso para un integrante. El
 * enlace ata su cuenta de Clerk a la ficha, así que da igual con qué correo
 * se registre. Todavía no se manda por correo (falta Resend): se copia y se
 * manda a mano.
 */
export async function createStaffInviteAction(memberId: string): Promise<ActionResult> {
  const ctx = await requireStaff("team.invite");
  if (!ctx) return DENIED;
  const member = await getMember(memberId);
  if (!member) return { ok: false, message: "El integrante ya no existe." };
  const r = await createStaffInvite({ memberId: member.id, createdById: ctx.staffId });
  if (!r.ok) return { ok: false, message: r.message };
  await logOps(ctx, "STAFF_INVITE", {
    metadata: { email: member.email, event: "link" },
  });
  refresh();
  return { ok: true, token: r.token };
}

export async function changeStaffRoleAction(memberId: string, roleId: string): Promise<ActionResult> {
  const ctx = await requireStaff("team.roles");
  if (!ctx) return DENIED;
  const [member, role] = await Promise.all([getMember(memberId), getRole(roleId)]);
  if (!member || !role) return { ok: false, message: "El integrante o el rol ya no existen." };
  if (member.id === ctx.staffId) return { ok: false, message: "No puedes cambiar tu propio rol." };
  if (!canGrantAll(ctx.permissions, role.permissions ?? [])) return { ok: false, message: "No puedes asignar un rol con más permisos que el tuyo." };
  if (member.role?.key === OWNER_ROLE_KEY && role.key !== OWNER_ROLE_KEY && (await activeOwnerCount()) <= 1) {
    return { ok: false, message: "Es el único Propietario: asigna otro antes de cambiarle el rol." };
  }
  await setStaffRole(member.id, role.id);
  await logOps(ctx, "STAFF_ROLE_CHANGE", { metadata: { email: member.email, from: member.role?.key, to: role.key } });
  refresh();
  return { ok: true };
}

export async function setStaffActiveAction(memberId: string, active: boolean): Promise<ActionResult> {
  const ctx = await requireStaff("team.roles");
  if (!ctx) return DENIED;
  const member = await getMember(memberId);
  if (!member) return { ok: false, message: "El integrante ya no existe." };
  if (member.id === ctx.staffId) return { ok: false, message: "No puedes desactivarte a ti mismo." };
  if (!active && member.role?.key === OWNER_ROLE_KEY && (await activeOwnerCount()) <= 1) {
    return { ok: false, message: "Es el único Propietario activo." };
  }
  await setStaffActive(member.id, active);
  await logOps(ctx, active ? "STAFF_REACTIVATE" : "STAFF_DEACTIVATE", { metadata: { email: member.email } });
  refresh();
  return { ok: true };
}

/** Crea o actualiza un rol personalizado (constructor de permisos). */
export async function saveRoleAction(input: { id?: string; name: string; description: string; permissions: string[] }): Promise<ActionResult> {
  const ctx = await requireStaff("team.permissions");
  if (!ctx) return DENIED;
  const v = validateRole(input);
  if (!v.ok) return { ok: false, message: "Revisa los campos marcados.", errors: v.errors };
  const permissions = normalizePermissions(v.value.permissions);
  if (!canGrantAll(ctx.permissions, permissions)) return { ok: false, message: "No puedes conceder permisos que no tienes." };

  if (input.id) {
    const role = await getRole(input.id);
    if (!role) return { ok: false, message: "El rol ya no existe." };
    if (role.key === OWNER_ROLE_KEY) return { ok: false, message: "El rol Propietario siempre tiene todos los permisos." };
    await updateRole(role.id, { name: v.value.name, description: v.value.description, permissions });
    await logOps(ctx, "ROLE_UPDATE", { metadata: { role: role.key, permissions } });
  } else {
    let key = roleKeyFrom(v.value.name);
    if (await roleKeyTaken(key)) key = `${key}-${Date.now().toString(36).slice(-4)}`;
    await createRole({ key, name: v.value.name, description: v.value.description, permissions });
    await logOps(ctx, "ROLE_CREATE", { metadata: { role: key, permissions } });
  }
  refresh();
  return { ok: true };
}

export async function deleteRoleAction(id: string): Promise<ActionResult> {
  const ctx = await requireStaff("team.permissions");
  if (!ctx) return DENIED;
  const role = await getRole(id);
  if (!role) return { ok: false, message: "El rol ya no existe." };
  if (role.system) return { ok: false, message: "Los roles base no se eliminan; edita sus permisos." };
  if ((await roleMemberCount(id)) > 0) return { ok: false, message: "Reasigna a sus integrantes antes de eliminarlo." };
  await deleteRole(id);
  await logOps(ctx, "ROLE_DELETE", { metadata: { role: role.key } });
  refresh();
  return { ok: true };
}
