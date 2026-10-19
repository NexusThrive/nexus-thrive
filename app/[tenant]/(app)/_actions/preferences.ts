"use server";

import { db } from "@/prisma/db";
import { requireTenantContext } from "@/lib/tenant-context";

/** Guarda el tema (claro u oscuro) en la cuenta de la persona. */
export async function saveThemeAction(tenantSlug: string, theme: string): Promise<void> {
  if (theme !== "light" && theme !== "dark") return;
  const ctx = await requireTenantContext(tenantSlug);
  if (!ctx) return;
  await db.orm.public.User.where({ id: ctx.memberId }).update({ theme });
}
