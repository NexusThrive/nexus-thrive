"use server";

import { revalidatePath } from "next/cache";
import { createOpportunityNow, loseOpportunity, moveStage, setNextAction, winOpportunityNow } from "@/lib/business/growth/opportunities-db";
import type { OpportunityStage } from "@/lib/business/growth/opportunities";
import { logTenantAction } from "@/lib/core/tenancy/audit";
import { requireTenantContext } from "@/lib/core/tenancy/context";

export type OppResult = { ok: true; message: string } | { ok: false; message: string };
const refresh = (slug: string) => {
  revalidatePath(`/${slug}/oportunidades`);
  revalidatePath(`/${slug}/crm`);
};
const dayInstant = (day: string) => (/^\d{4}-\d{2}-\d{2}$/.test(day) ? Temporal.Instant.from(`${day}T17:00:00Z`) : null); // 12 m. en Bogotá

async function ctxFor(slug: string) {
  return requireTenantContext(slug, "/oportunidades");
}

export async function createOpportunityAction(slug: string, input: { customerId: string; interest: string; estimatedValue: number | null; nextAction: string; nextActionDay: string }): Promise<OppResult> {
  const ctx = await ctxFor(slug);
  if (!ctx) return { ok: false, message: "No tienes acceso a este negocio." };
  const r = await createOpportunityNow(ctx.tenantId, { customerId: input.customerId, interest: input.interest, estimatedValue: input.estimatedValue, nextAction: input.nextAction, nextActionAt: dayInstant(input.nextActionDay), ownerId: ctx.memberId, source: "MANUAL" });
  if (!r.ok) return r;
  refresh(slug);
  return { ok: true, message: "Oportunidad creada" };
}

export async function moveStageAction(slug: string, id: string, stage: string): Promise<OppResult> {
  const ctx = await ctxFor(slug);
  if (!ctx) return { ok: false, message: "No tienes acceso a este negocio." };
  const r = await moveStage(ctx.tenantId, id, stage as OpportunityStage);
  if (!r.ok) return r;
  refresh(slug);
  return { ok: true, message: "Etapa actualizada" };
}

export async function nextActionAction(slug: string, id: string, action: string, day: string): Promise<OppResult> {
  const ctx = await ctxFor(slug);
  if (!ctx) return { ok: false, message: "No tienes acceso a este negocio." };
  const r = await setNextAction(ctx.tenantId, id, action, dayInstant(day));
  if (!r.ok) return r;
  refresh(slug);
  return { ok: true, message: "Siguiente paso guardado" };
}

export async function winAction(slug: string, id: string): Promise<OppResult> {
  const ctx = await ctxFor(slug);
  if (!ctx) return { ok: false, message: "No tienes acceso a este negocio." };
  const r = await winOpportunityNow(ctx.tenantId, id);
  if (!r.ok) return r;
  await logTenantAction(ctx, "BIZ_OPPORTUNITY", { action: "win_opportunity", id });
  refresh(slug);
  return { ok: true, message: "¡Ganada! El contacto pasa a cliente" };
}

export async function loseAction(slug: string, id: string, reason: string): Promise<OppResult> {
  const ctx = await ctxFor(slug);
  if (!ctx) return { ok: false, message: "No tienes acceso a este negocio." };
  const r = await loseOpportunity(ctx.tenantId, id, reason);
  if (!r.ok) return r;
  await logTenantAction(ctx, "BIZ_OPPORTUNITY", { action: "lose_opportunity", id });
  refresh(slug);
  return { ok: true, message: "Oportunidad perdida: quedó el motivo" };
}
