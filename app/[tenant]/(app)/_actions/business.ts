"use server";

import { auth } from "@clerk/nextjs/server";
import { rememberBusiness } from "@/lib/tenant/membership";
import { loadActiveTenant } from "@/lib/tenant/context";

/**
 * La cuenta cambió de organización desde el selector: se recuerda como la última
 * usada para abrirla al volver a entrar. La sesión no cambia; la autorización de
 * cada página sigue saliendo de la membresía en esa organización.
 */
export async function rememberBusinessAction(slug: string): Promise<void> {
  const { userId } = await auth();
  if (!userId) return;
  const tenant = await loadActiveTenant(slug);
  if (tenant) await rememberBusiness(userId, tenant.id);
}
