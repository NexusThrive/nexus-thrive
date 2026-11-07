"use server";

import { revalidatePath } from "next/cache";
import { createLeadForm, rotateLeadFormKey, setLeadFormEnabled } from "@/lib/business/growth/lead-forms-db";
import { can } from "@/lib/core/auth/permissions";
import { logTenantAction } from "@/lib/core/tenancy/audit";
import { requireTenantContext } from "@/lib/core/tenancy/context";

export type FormResult = { ok: true; message: string } | { ok: false; message: string };
const refresh = (slug: string) => revalidatePath(`/${slug}/crm/formularios`);

async function manager(slug: string) {
  const ctx = await requireTenantContext(slug, "/crm/formularios");
  return ctx && can(ctx.role, "business.manage") ? ctx : null;
}
const DENIED: FormResult = { ok: false, message: "Solo el dueño o administración maneja los formularios." };

export async function createFormAction(slug: string, input: { name: string; origins: string; campaign: string }): Promise<FormResult> {
  const ctx = await manager(slug);
  if (!ctx) return DENIED;
  const r = await createLeadForm(ctx.tenantId, { name: input.name, origins: input.origins.split(/[\s,;]+/).filter(Boolean), campaign: input.campaign });
  if (!r.ok) return r;
  await logTenantAction(ctx, "BIZ_OPPORTUNITY", { action: "create_lead_form", id: r.form.id });
  refresh(slug);
  return { ok: true, message: "Formulario creado: copia el código y pégalo en tu web" };
}

export async function toggleFormAction(slug: string, id: string, enabled: boolean): Promise<FormResult> {
  const ctx = await manager(slug);
  if (!ctx) return DENIED;
  const r = await setLeadFormEnabled(ctx.tenantId, id, enabled);
  if (!r.ok) return r;
  refresh(slug);
  return { ok: true, message: enabled ? "Formulario encendido" : "Formulario apagado: rechaza todo envío" };
}

export async function rotateKeyAction(slug: string, id: string): Promise<FormResult> {
  const ctx = await manager(slug);
  if (!ctx) return DENIED;
  const r = await rotateLeadFormKey(ctx.tenantId, id);
  if (!r.ok) return r;
  await logTenantAction(ctx, "BIZ_OPPORTUNITY", { action: "rotate_lead_form_key", id });
  refresh(slug);
  return { ok: true, message: "Clave cambiada: actualiza el código en tu web, la anterior ya no funciona" };
}
