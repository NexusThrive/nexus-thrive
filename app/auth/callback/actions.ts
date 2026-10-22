"use server";

import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/prisma/db";
import { findStaffByEmail } from "@/lib/ops/access";

/**
 * Vincula la ficha del equipo de NEXUS con la cuenta de esta sesión.
 *
 * Se usa cuando el correo ya está en el equipo pero en otra cuenta de Clerk
 * (la persona se registró otra vez, o cambió de cuenta): en vez de dejarla
 * atascada, puede tomar su propia ficha con la cuenta con la que está
 * entrando ahora.
 *
 * La prueba de que es suyas es el correo: la sesión actual debe tener el
 * mismo correo que la ficha del equipo.
 */
export async function takeoverStaffAccountAction(): Promise<{ ok: true } | { ok: false; message: string }> {
  const { userId } = await auth();
  if (!userId) return { ok: false, message: "Tu sesión expiró. Vuelve a entrar." };

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses?.[0]?.emailAddress;
  if (!email) return { ok: false, message: "No pudimos leer tu correo de sesión." };

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

  await db.orm.public.StaffMember
    .where({ id: staff.id })
    .update({
      clerkUserId: userId,
      joinedAt: Temporal.Instant.fromEpochMilliseconds(Date.now()),
    });

  redirect("/admin");
}
