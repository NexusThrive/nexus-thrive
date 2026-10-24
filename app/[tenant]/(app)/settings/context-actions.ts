"use server";

import { revalidatePath } from "next/cache";
import { updateBusinessContext } from "@/lib/tenant/settings-db";
import { parseBusinessContext, type BusinessContext } from "@/lib/tenant/business-context";
import { logTenantAction } from "@/lib/tenant/audit";
import { requireTenantContext } from "@/lib/tenant/context";

export type ContextResult = { ok: true; message: string } | { ok: false; message: string };

/**
 * Guarda el perfil del negocio (perfil de partida, modelo comercial y actividad).
 * Es contexto: cambia vocabulario y sugerencias, no apaga funciones ni borra datos.
 */
export async function updateBusinessContextAction(slug: string, input: { vertical: string; businessModels: string[]; activity: string }): Promise<ContextResult> {
  const ctx = await requireTenantContext(slug);
  if (!ctx) return { ok: false, message: "No tienes acceso a este negocio." };
  if (ctx.role !== "OWNER" && ctx.role !== "SUPERADMIN") return { ok: false, message: "Solo el dueño del negocio cambia su perfil." };
  const parsed = parseBusinessContext(input);
  if (!parsed.ok) return { ok: false, message: parsed.message };
  const value: BusinessContext = parsed.value;
  await updateBusinessContext(ctx.tenantId, value);
  await logTenantAction(ctx, "BIZ_PROFILE_UPDATE", { vertical: value.vertical, businessModels: value.businessModels });
  revalidatePath(`/${slug}`, "layout");
  return { ok: true, message: "Perfil actualizado. Tus funciones y tus datos siguen igual." };
}
