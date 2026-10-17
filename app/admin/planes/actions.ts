"use server";

import { revalidatePath } from "next/cache";
import { requireStaff, getStaffContext } from "@/lib/ops/access";
import { logOps } from "@/lib/ops/audit";
import type { CustomerTier, ModuleConfig, PlanConfig, VerticalConfig } from "@/lib/plans/pricing";
import { loadPricingConfig, saveModule, savePlan, saveTiers, saveVertical } from "@/lib/plans/settings";
import { validateModule, validatePlan, validateTiers, validateVertical } from "@/lib/plans/validators";

export type CatalogResult = { ok: true } | { ok: false; message: string };
const DENIED: CatalogResult = { ok: false, message: "No tienes permiso para esta acción." };

function refresh() {
  revalidatePath("/admin/planes");
  revalidatePath("/onboarding");
}

/** ¿El cambio toca precios (pricing.edit), estructura (catalog.edit) o ambos? */
async function allowed(priceChanged: boolean, structureChanged: boolean) {
  const ctx = await getStaffContext();
  if (!ctx) return null;
  if (priceChanged && !ctx.permissions.includes("pricing.edit")) return null;
  if (structureChanged && !ctx.permissions.includes("catalog.edit")) return null;
  if (!priceChanged && !structureChanged) return ctx.permissions.includes("pricing.edit") || ctx.permissions.includes("catalog.edit") ? ctx : null;
  return ctx;
}

export async function savePlanAction(input: PlanConfig): Promise<CatalogResult> {
  const v = validatePlan(input);
  if (!v.ok) return { ok: false, message: v.message };
  const before = (await loadPricingConfig()).plans.find((p) => p.key === input.key);
  if (!before) return { ok: false, message: "El plan no existe." };
  const priceChanged = before.basePriceUsdCents !== v.value.basePriceUsdCents || before.moduleDiscountPct !== v.value.moduleDiscountPct || before.annualDiscountPct !== v.value.annualDiscountPct;
  const structureChanged =
    before.name !== v.value.name || before.tagline !== v.value.tagline || before.features.join("|") !== v.value.features.join("|") || before.includesAllModules !== v.value.includesAllModules || before.chargesModules !== v.value.chargesModules || before.recommended !== v.value.recommended || before.active !== v.value.active;
  const ctx = await allowed(priceChanged, structureChanged);
  if (!ctx) return DENIED;
  await savePlan(v.value);
  await logOps(ctx, "CATALOG_UPDATE", { metadata: { kind: "plan", key: v.value.key, before, after: v.value } });
  refresh();
  return { ok: true };
}

export async function saveModuleAction(input: ModuleConfig): Promise<CatalogResult> {
  const v = validateModule(input);
  if (!v.ok) return { ok: false, message: v.message };
  const before = (await loadPricingConfig()).modules.find((m) => m.module === input.module);
  if (!before) return { ok: false, message: "El módulo no existe." };
  const ctx = await allowed(before.priceUsdCents !== v.value.priceUsdCents, before.status !== v.value.status || before.included !== v.value.included || before.label !== v.value.label || before.description !== v.value.description);
  if (!ctx) return DENIED;
  await saveModule(v.value);
  await logOps(ctx, "CATALOG_UPDATE", { metadata: { kind: "module", module: v.value.module, before, after: v.value } });
  refresh();
  return { ok: true };
}

export async function saveVerticalAction(input: VerticalConfig): Promise<CatalogResult> {
  const v = validateVertical(input);
  if (!v.ok) return { ok: false, message: v.message };
  const before = (await loadPricingConfig()).verticals.find((x) => x.vertical === input.vertical);
  if (!before) return { ok: false, message: "El rubro no existe." };
  const structure = before.label !== v.value.label || before.signupEnabled !== v.value.signupEnabled || before.modules.join() !== v.value.modules.join() || before.recommended.join() !== v.value.recommended.join() || before.dashboardTemplate !== v.value.dashboardTemplate;
  const ctx = await allowed(before.priceFactorPct !== v.value.priceFactorPct, structure);
  if (!ctx) return DENIED;
  await saveVertical(v.value);
  await logOps(ctx, "CATALOG_UPDATE", { metadata: { kind: "vertical", vertical: v.value.vertical, before, after: v.value } });
  refresh();
  return { ok: true };
}

export async function saveTiersAction(input: CustomerTier[]): Promise<CatalogResult> {
  const ctx = await requireStaff("pricing.edit");
  if (!ctx) return DENIED;
  const v = validateTiers(input);
  if (!v.ok) return { ok: false, message: v.message };
  const before = (await loadPricingConfig()).tiers;
  await saveTiers(v.value);
  await logOps(ctx, "CATALOG_UPDATE", { metadata: { kind: "tiers", before, after: v.value } });
  refresh();
  return { ok: true };
}
