"use server";

import { requireTenantContext } from "@/lib/core/tenancy/context";
import { saveMemberTheme } from "@/lib/core/tenancy/membership";

/** Guarda el tema (claro u oscuro) en la cuenta de la persona. */
export async function saveThemeAction(tenantSlug: string, theme: string): Promise<void> {
  if (theme !== "light" && theme !== "dark") return;
  const ctx = await requireTenantContext(tenantSlug);
  if (!ctx) return;
  await saveMemberTheme(ctx.tenantId, ctx.memberId, theme);
}
