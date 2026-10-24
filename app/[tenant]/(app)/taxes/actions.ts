"use server";

import { revalidatePath } from "next/cache";
import { can } from "@/lib/business/permissions";
import { createResolution, createTaxRate, ensureDefaultTaxes, setResolutionActive, updateTaxRate } from "@/lib/tax/tax-db";
import { logTenantAction } from "@/lib/tenant/audit";
import { requireTenantContext } from "@/lib/tenant/context";

export type TaxActionResult = { ok: true; message: string } | { ok: false; message: string };
const DENIED = { ok: false as const, message: "Solo el dueño o administración maneja impuestos y numeración." };

async function manager(slug: string) {
  const ctx = await requireTenantContext(slug, "/taxes");
  return ctx && can(ctx.role, "business.manage") ? ctx : null;
}
const refresh = (slug: string) => revalidatePath(`/${slug}/taxes`);
const num = (v: unknown) => Number(String(v ?? "").replace(",", "."));

export async function loadDefaultTaxesAction(slug: string): Promise<TaxActionResult> {
  const ctx = await manager(slug);
  if (!ctx) return DENIED;
  const { created } = await ensureDefaultTaxes(ctx.tenantId);
  if (created > 0) await logTenantAction(ctx, "BIZ_TAX_CHANGE", { action: "defaults", created });
  refresh(slug);
  return { ok: true, message: created ? `${created} tarifas cargadas` : "Ya tenías todas las tarifas habituales" };
}

export async function createTaxRateAction(slug: string, input: { code: string; name: string; kind: string; ratePct: string; minBase: string; validFrom: string; validTo: string }): Promise<TaxActionResult> {
  const ctx = await manager(slug);
  if (!ctx) return DENIED;
  const r = await createTaxRate(ctx.tenantId, { code: input.code, name: input.name, kind: input.kind, ratePct: num(input.ratePct), minBase: input.minBase ? num(input.minBase) : 0, validFrom: input.validFrom, validTo: input.validTo || null });
  if (!r.ok) return { ok: false, message: r.message };
  await logTenantAction(ctx, "BIZ_TAX_CHANGE", { action: "create", code: input.code, ratePct: num(input.ratePct) });
  refresh(slug);
  return { ok: true, message: "Tarifa creada" };
}

export async function updateTaxRateAction(slug: string, id: string, patch: { active?: boolean; validTo?: string | null }): Promise<TaxActionResult> {
  const ctx = await manager(slug);
  if (!ctx) return DENIED;
  const r = await updateTaxRate(ctx.tenantId, id, patch);
  if (!r.ok) return { ok: false, message: r.message };
  await logTenantAction(ctx, "BIZ_TAX_CHANGE", { action: "update", id, ...patch });
  refresh(slug);
  return { ok: true, message: "Tarifa actualizada" };
}

export async function createResolutionAction(slug: string, input: { documentKind: string; prefix: string; resolutionNumber: string; rangeFrom: string; rangeTo: string; validFrom: string; validTo: string }): Promise<TaxActionResult> {
  const ctx = await manager(slug);
  if (!ctx) return DENIED;
  const r = await createResolution(ctx.tenantId, { ...input, rangeFrom: num(input.rangeFrom), rangeTo: num(input.rangeTo) });
  if (!r.ok) return { ok: false, message: r.message };
  await logTenantAction(ctx, "BIZ_NUMBERING_CHANGE", { action: "create", kind: input.documentKind, resolution: input.resolutionNumber, range: [num(input.rangeFrom), num(input.rangeTo)] });
  refresh(slug);
  return { ok: true, message: `Resolución registrada: el próximo número es el ${r.nextNumber}` };
}

export async function toggleResolutionAction(slug: string, id: string, active: boolean): Promise<TaxActionResult> {
  const ctx = await manager(slug);
  if (!ctx) return DENIED;
  if (!(await setResolutionActive(ctx.tenantId, id, active))) return { ok: false, message: "No se encontró la resolución." };
  await logTenantAction(ctx, "BIZ_NUMBERING_CHANGE", { action: active ? "activate" : "deactivate", id });
  refresh(slug);
  return { ok: true, message: active ? "Resolución activada" : "Resolución desactivada" };
}
