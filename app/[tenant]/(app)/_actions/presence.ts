"use server";

import { revalidatePath } from "next/cache";
import { requireTenantContext } from "@/lib/tenant/context";
import { scanTenantPresence } from "@/lib/presence/scan";

/**
 * Analiza la presencia digital del negocio autenticado: verifica el sitio,
 * recalcula el puntaje y guarda la foto (PresenceScan). Verifica sesión y
 * pertenencia al negocio (requireTenantContext); sin acceso, no hace nada.
 */
export async function scanPresenceAction(
  tenantSlug: string,
): Promise<{ ok: boolean; score: number }> {
  const ctx = await requireTenantContext(tenantSlug);
  if (!ctx) return { ok: false, score: 0 };

  const score = await scanTenantPresence(ctx.tenantId);
  if (score === null) return { ok: false, score: 0 };

  revalidatePath(`/${tenantSlug}`);
  return { ok: true, score };
}
