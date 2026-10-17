import { cache } from "react";
import { db } from "@/prisma/db";
import { isModule, isVertical, type ModuleValue } from "@/lib/admin-catalogs";
import type { PlanKey } from "./catalog";
import {
  defaultPricingConfig,
  type CustomerTier,
  type ModuleConfig,
  type ModuleStatus,
  type PlanConfig,
  type PricingConfig,
  type VerticalConfig,
} from "./pricing";

/**
 * Catálogo comercial guardado en la base de datos (Planes y módulos del
 * Operations Center). Si falta algo —primera vez, o un módulo o rubro nuevo
 * en el código— se completa con los valores iniciales y se guarda.
 */

const STATUSES: ModuleStatus[] = ["READY", "BETA", "PLANNED"];
const PLAN_KEYS: PlanKey[] = ["ESSENTIAL", "ELITE", "SIGNATURE"];
const mods = (list: readonly string[] | null | undefined) => (list ?? []).filter(isModule) as ModuleValue[];

/** Inserta lo que falte con los valores iniciales (idempotente). */
export async function ensureCatalogSeeded(): Promise<void> {
  const d = defaultPricingConfig();
  const [plans, modules, verticals, tiers] = await Promise.all([
    db.orm.public.PlanSetting.select("key").all(),
    db.orm.public.ModuleSetting.select("module").all(),
    db.orm.public.VerticalSetting.select("vertical").all(),
    db.orm.public.CustomerTierSetting.select("id").all(),
  ]);
  const has = { p: new Set(plans.map((x) => x.key)), m: new Set(modules.map((x) => x.module)), v: new Set(verticals.map((x) => x.vertical)) };
  for (const p of d.plans) if (!has.p.has(p.key)) await db.orm.public.PlanSetting.create({ ...p });
  for (const m of d.modules) if (!has.m.has(m.module)) await db.orm.public.ModuleSetting.create({ ...m });
  for (const v of d.verticals) if (!has.v.has(v.vertical)) await db.orm.public.VerticalSetting.create({ ...v });
  if (tiers.length === 0) for (const t of d.tiers) await db.orm.public.CustomerTierSetting.create({ ...t });
}

/** Configuración vigente (una lectura por petición). */
export const loadPricingConfig = cache(async (): Promise<PricingConfig> => {
  await ensureCatalogSeeded();
  const [plans, modules, verticals, tiers] = await Promise.all([
    db.orm.public.PlanSetting.all(),
    db.orm.public.ModuleSetting.all(),
    db.orm.public.VerticalSetting.all(),
    db.orm.public.CustomerTierSetting.all(),
  ]);
  return {
    plans: plans
      .filter((p) => PLAN_KEYS.includes(p.key as PlanKey))
      .map(
        (p): PlanConfig => ({
          key: p.key as PlanKey,
          name: p.name,
          tagline: p.tagline,
          features: [...(p.features ?? [])],
          basePriceUsdCents: p.basePriceUsdCents,
          moduleDiscountPct: p.moduleDiscountPct,
          includesAllModules: p.includesAllModules,
          chargesModules: p.chargesModules,
          annualDiscountPct: p.annualDiscountPct,
          recommended: p.recommended,
          active: p.active,
          order: p.order,
        }),
      ),
    modules: modules
      .filter((m) => isModule(m.module))
      .map(
        (m): ModuleConfig => ({
          module: m.module as ModuleValue,
          label: m.label,
          description: m.description,
          priceUsdCents: m.priceUsdCents,
          status: STATUSES.includes(m.status as ModuleStatus) ? (m.status as ModuleStatus) : "PLANNED",
          included: m.included,
          order: m.order,
        }),
      ),
    verticals: verticals
      .filter((v) => isVertical(v.vertical))
      .map(
        (v): VerticalConfig => ({
          vertical: v.vertical as VerticalConfig["vertical"],
          label: v.label,
          signupEnabled: v.signupEnabled,
          priceFactorPct: v.priceFactorPct,
          modules: mods(v.modules),
          recommended: mods(v.recommended),
          dashboardTemplate: v.dashboardTemplate,
          order: v.order,
        }),
      ),
    tiers: tiers.map(
      (t): CustomerTier => ({ id: t.id, label: t.label, maxCustomers: t.maxCustomers, priceUsdCents: t.priceUsdCents, order: t.order }),
    ),
  };
});

export async function savePlan(p: PlanConfig) {
  const { key, ...rest } = p;
  await db.orm.public.PlanSetting.where({ key }).update(rest);
}

export async function saveModule(m: ModuleConfig) {
  const { module, ...rest } = m;
  await db.orm.public.ModuleSetting.where({ module }).update(rest);
}

export async function saveVertical(v: VerticalConfig) {
  const { vertical, ...rest } = v;
  await db.orm.public.VerticalSetting.where({ vertical }).update(rest);
}

/** Reemplaza los tramos de clientes (borra los que ya no están). */
export async function saveTiers(tiers: CustomerTier[]) {
  const existing = await db.orm.public.CustomerTierSetting.select("id").all();
  const keep = new Set(tiers.map((t) => t.id));
  for (const e of existing) if (!keep.has(e.id)) await db.orm.public.CustomerTierSetting.where({ id: e.id }).delete();
  for (const t of tiers) {
    await db.orm.public.CustomerTierSetting.upsert({ create: { ...t }, update: { label: t.label, maxCustomers: t.maxCustomers, priceUsdCents: t.priceUsdCents, order: t.order }, conflictOn: { id: t.id } });
  }
}
