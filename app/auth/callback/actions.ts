"use server";

import { redirect } from "next/navigation";
import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { createAdminDb } from "@/lib/admin/db";
import { findStaffByEmail } from "@/lib/ops/access";
import { linkStaffAccount, linkedClerkUserId } from "@/lib/ops/team";
import { normalizeEmail, verifiedEmailOf } from "@/lib/auth/session-email";

/**
 * Vincula la ficha del equipo de NEXUS con la cuenta de esta sesión.
 *
 * Se usa cuando el correo ya está en el equipo pero en otra cuenta de Clerk
 * (la persona se registró otra vez, o cambió de cuenta): en vez de dejarla
 * atascada, puede tomar su propia ficha con la cuenta con la que está
 * entrando ahora.
 *
 * La prueba de que es suya es el correo, y tiene que ser fuerte (SEC-01):
 * - el correo principal de la sesión, verificado por Clerk, y comparado de
 *   forma exacta;
 * - si la ficha ya estaba vinculada, la cuenta anterior ya no puede tener ese
 *   correo (Clerk no deja el mismo correo en dos cuentas). Si la anterior
 *   todavía lo tiene, o no se puede comprobar, no se reasigna: la desvincula
 *   un Propietario desde Equipo.
 */
export async function takeoverStaffAccountAction(): Promise<{ ok: true } | { ok: false; message: string }> {
  const { userId } = await auth();
  if (!userId) return { ok: false, message: "Tu sesión expiró. Vuelve a entrar." };

  const user = await currentUser();
  const email = verifiedEmailOf(user);
  if (!email) {
    return { ok: false, message: "Verifica el correo principal de tu cuenta para continuar." };
  }

  const staff = await findStaffByEmail(email);
  if (!staff) {
    return {
      ok: false,
      message: "Tu correo no está en el equipo de NEXUS. Pide que te inviten.",
    };
  }
  if (!staff.active) {
    return {
      ok: false,
      message: "Tu acceso está desactivado. Escríbenos para reactivarlo.",
    };
  }

  const previous = await linkedClerkUserId(staff.id);
  if (previous && previous !== userId && (await accountStillOwnsEmail(previous, email))) {
    return {
      ok: false,
      message:
        "Esta ficha está vinculada a otra cuenta que sigue usando tu correo. Pide a un Propietario que la desvincule desde Equipo.",
    };
  }

  await linkStaffAccount(staff.id, userId);

  try {
    await createAdminDb().logAudit({
      actorId: userId,
      actorEmail: email,
      action: "STAFF_INVITE",
      targetTenantId: null,
      targetTenantName: null,
      metadata: { email, event: "takeover", previousClerkUserId: previous },
    });
  } catch {
    // La auditoría nunca rompe el acceso.
  }

  redirect("/admin");
}

/**
 * ¿La cuenta de Clerk `clerkUserId` todavía tiene `email`? Una cuenta borrada
 * (404) ya no lo tiene. Ante cualquier otro error se responde que sí: sin
 * poder comprobarlo, no se reasigna la ficha.
 */
async function accountStillOwnsEmail(clerkUserId: string, email: string): Promise<boolean> {
  try {
    const client = await clerkClient();
    const account = await client.users.getUser(clerkUserId);
    return account.emailAddresses.some((e) => normalizeEmail(e.emailAddress) === email);
  } catch (error) {
    const status = (error as { status?: number } | null)?.status;
    return status !== 404;
  }
}
