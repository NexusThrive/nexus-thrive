import { CAPABILITIES } from "@/lib/capabilities/registry";
import { MODULES, SIGNUP_VERTICALS, VERTICALS, VERTICAL_LABELS, VERTICAL_RECIPES, type ModuleValue, type VerticalValue } from "@/lib/admin/catalogs";
import {
  ANNUAL_DISCOUNT,
  GENERAL_MODULES,
  INCLUDED_MODULES,
  MODULE_PRICES,
  PLANS,
  VERTICAL_FACTORS,
  type Billing,
  type PlanKey,
} from "./catalog";

/**
 * Motor de precios configurable de NEXUS THRIVE. Puro: lo usan el
 * onboarding (navegador), el servidor al crear el negocio (fuente de
 * verdad) y el simulador del Operations Center. La configuración vive en la
 * base de datos y se edita desde el panel; `defaultPricingConfig()` son los
 * valores iniciales.
 */

export type ModuleStatus = "READY" | "BETA" | "PLANNED";

export type PlanConfig = {
  key: PlanKey;
  name: string;
  tagline: string;
  features: string[];
  basePriceUsdCents: number;
  /** % de descuento sobre cada módulo (Signature: 40). */
  moduleDiscountPct: number;
  /** Activa todos los módulos ofrecidos al rubro (Signature). */
  includesAllModules: boolean;
  /** Permite sumar módulos de pago (Elite). Sin esto solo van los incluidos (Essential). */
  chargesModules: boolean;
  /** % de descuento por pago anual. */
  annualDiscountPct: number;
  recommended: boolean;
  active: boolean;
  order: number;
  /** Usuarios del negocio incluidos (null = sin límite). */
  maxUsers: number | null;
};

export type ModuleConfig = {
  module: ModuleValue;
  label: string;
  description: string;
  priceUsdCents: number;
  /** READY se vende; BETA se vende marcado; PLANNED no se ofrece ni se cobra. */
  status: ModuleStatus;
  /** Incluido gratis en todos los planes (Clientes, Finanzas). */
  included: boolean;
  order: number;
};

export type VerticalConfig = {
  vertical: VerticalValue;
  label: string;
  /** Aparece en el registro (onboarding). */
  signupEnabled: boolean;
  /** 100 = ×1,00. */
  priceFactorPct: number;
  /** Funciones que el rubro SUGIERE al empezar. No limita: cualquier negocio puede encender cualquiera. */
  modules: ModuleValue[];
  /** Preseleccionados en el plan Elite. */
  recommended: ModuleValue[];
  /** Receta del Inicio para el rubro (ver lib/dashboard). */
  dashboardTemplate: string | null;
  order: number;
};

export type CustomerTier = {
  id: string;
  label: string;
  /** Máximo de clientes del tramo; null = sin límite. */
  maxCustomers: number | null;
  priceUsdCents: number;
  order: number;
};

export type PricingConfig = {
  plans: PlanConfig[];
  modules: ModuleConfig[];
  verticals: VerticalConfig[];
  tiers: CustomerTier[];
};

/** El Inicio no es un módulo que se elige: siempre está activo. */
export const CORE_MODULE: ModuleValue = "dashboard";

// Nombres, descripciones y estado inicial salen del registro de capacidades.
const DESCRIPTIONS = Object.fromEntries(CAPABILITIES.map((c) => [c.id, c.description])) as Record<ModuleValue, string>;
const LABELS = Object.fromEntries(CAPABILITIES.map((c) => [c.id, c.name])) as Record<ModuleValue, string>;
const STATUS = Object.fromEntries(CAPABILITIES.map((c) => [c.id, c.status])) as Record<ModuleValue, ModuleStatus>;

/** Configuración inicial (la que había en el código). */
export function defaultPricingConfig(): PricingConfig {
  const order: PlanKey[] = ["ESSENTIAL", "ELITE", "SIGNATURE"];
  return {
    plans: order.map((key, i) => ({
      key,
      name: PLANS[key].name,
      tagline: PLANS[key].tagline,
      features: [...PLANS[key].features],
      basePriceUsdCents: PLANS[key].base * 100,
      // Todo está incluido: ningún plan descuenta ni cobra funciones; los planes se diferencian por uso.
      moduleDiscountPct: 0,
      includesAllModules: false,
      chargesModules: true,
      annualDiscountPct: Math.round(ANNUAL_DISCOUNT * 100),
      recommended: key === "ELITE",
      active: true,
      order: i,
      maxUsers: key === "ESSENTIAL" ? 1 : key === "ELITE" ? 3 : null,
    })),
    modules: MODULES.map((m, i) => ({
      module: m,
      label: LABELS[m],
      description: DESCRIPTIONS[m],
      priceUsdCents: (MODULE_PRICES[m] ?? 0) * 100,
      status: STATUS[m],
      included: m === "dashboard" || INCLUDED_MODULES.includes(m),
      order: i,
    })),
    verticals: VERTICALS.map((v, i) => {
      const recipe = VERTICAL_RECIPES[v].modules as readonly ModuleValue[];
      const modules = MODULES.filter((m) => m === "dashboard" || recipe.includes(m) || GENERAL_MODULES.includes(m) || INCLUDED_MODULES.includes(m));
      return {
        vertical: v,
        label: VERTICAL_LABELS[v],
        signupEnabled: (SIGNUP_VERTICALS as readonly VerticalValue[]).includes(v),
        priceFactorPct: Math.round(VERTICAL_FACTORS[v] * 100),
        modules,
        recommended: recipe.filter((m) => m !== "dashboard"),
        dashboardTemplate: null,
        order: i,
      };
    }),
    tiers: [
      { id: "tier-100", label: "Hasta 100 clientes", maxCustomers: 100, priceUsdCents: 0, order: 0 },
      { id: "tier-500", label: "Hasta 500 clientes", maxCustomers: 500, priceUsdCents: 1000, order: 1 },
      { id: "tier-2000", label: "Hasta 2.000 clientes", maxCustomers: 2000, priceUsdCents: 2500, order: 2 },
      { id: "tier-unlimited", label: "Más de 2.000 clientes", maxCustomers: null, priceUsdCents: 4900, order: 3 },
    ],
  };
}

const byOrder = <T extends { order: number }>(list: T[]) => [...list].sort((a, b) => a.order - b.order);

export function planOf(config: PricingConfig, key: PlanKey): PlanConfig | undefined {
  return config.plans.find((p) => p.key === key);
}

export function verticalOf(config: PricingConfig, vertical: VerticalValue): VerticalConfig | undefined {
  return config.verticals.find((v) => v.vertical === vertical);
}

export function moduleOf(config: PricingConfig, module: ModuleValue): ModuleConfig | undefined {
  return config.modules.find((m) => m.module === module);
}

export function activePlans(config: PricingConfig): PlanConfig[] {
  return byOrder(config.plans.filter((p) => p.active));
}

export function signupVerticals(config: PricingConfig): VerticalConfig[] {
  return byOrder(config.verticals.filter((v) => v.signupEnabled));
}

/**
 * Funciones que se ofrecen a un negocio: TODAS las operativas (no PLANNED), sea
 * cual sea su rubro. El Inicio no se ofrece (siempre está). Ordenadas como el catálogo.
 */
export function offeredModules(config: PricingConfig, _vertical?: VerticalValue): ModuleConfig[] {
  return byOrder(config.modules.filter((m) => m.module !== CORE_MODULE && m.status !== "PLANNED"));
}

/** Lo que el rubro sugiere al empezar (su receta): preselecciona y recomienda, nunca bloquea. */
export function suggestedModules(config: PricingConfig, vertical: VerticalValue): ModuleConfig[] {
  const suggested = new Set(verticalOf(config, vertical)?.modules ?? []);
  return offeredModules(config).filter((m) => suggested.has(m.module));
}

/**
 * Funciones que quedan ENCENDIDAS al empezar: el Inicio, lo esencial (`included`)
 * y lo que se eligió. Con `includesAllModules` (Signature) entra además todo lo
 * que el rubro sugiere. El plan no recorta funciones: todas se pueden encender
 * después; el plan limita usuarios y clientes.
 */
export function resolveModules(config: PricingConfig, plan: PlanKey, vertical: VerticalValue, selected: readonly ModuleValue[]): ModuleValue[] {
  const p = planOf(config, plan);
  const offered = offeredModules(config);
  const allowed = new Set(offered.map((m) => m.module));
  const included = offered.filter((m) => m.included).map((m) => m.module);
  const suggested = p?.includesAllModules ? suggestedModules(config, vertical).map((m) => m.module) : [];
  const set = new Set<ModuleValue>([CORE_MODULE, ...included, ...suggested, ...selected.filter((m) => allowed.has(m))]);
  return MODULES.filter((m) => set.has(m));
}

/** Precio mensual de un módulo para el rubro y el plan (0 si está incluido). */
export function modulePriceCents(config: PricingConfig, module: ModuleValue, vertical: VerticalValue, plan: PlanKey): number {
  const m = moduleOf(config, module);
  const p = planOf(config, plan);
  if (!m || !p || m.included || m.module === CORE_MODULE) return 0;
  if (!p.chargesModules && !p.includesAllModules) return 0;
  const factor = (verticalOf(config, vertical)?.priceFactorPct ?? 100) / 100;
  const withFactor = Math.round((m.priceUsdCents * factor) / 100) * 100;
  return Math.round(withFactor * (1 - p.moduleDiscountPct / 100));
}

export type QuoteLine = { kind: "plan" | "module" | "tier"; label: string; cents: number; module?: ModuleValue };

export type Quote = {
  plan: PlanKey;
  billing: Billing;
  modules: ModuleValue[];
  tierId: string | null;
  lines: QuoteLine[];
  subtotalCents: number;
  monthlyCents: number;
  yearlyCents: number;
};

export function quote(
  config: PricingConfig,
  input: { plan: PlanKey; vertical: VerticalValue; billing: Billing; selected: readonly ModuleValue[]; tierId?: string | null },
): Quote {
  const p = planOf(config, input.plan);
  const factor = (verticalOf(config, input.vertical)?.priceFactorPct ?? 100) / 100;
  const modules = resolveModules(config, input.plan, input.vertical, input.selected);
  const lines: QuoteLine[] = [];
  lines.push({ kind: "plan", label: `Plan ${p?.name ?? input.plan}`, cents: Math.round(((p?.basePriceUsdCents ?? 0) * factor) / 100) * 100 });
  for (const m of modules) {
    const cents = modulePriceCents(config, m, input.vertical, input.plan);
    if (cents > 0) lines.push({ kind: "module", label: moduleOf(config, m)?.label ?? m, cents, module: m });
  }
  const tier = config.tiers.find((t) => t.id === input.tierId) ?? null;
  if (tier && tier.priceUsdCents > 0) lines.push({ kind: "tier", label: tier.label, cents: tier.priceUsdCents });
  const subtotal = lines.reduce((s, l) => s + l.cents, 0);
  const monthly = input.billing === "ANNUAL" ? Math.round(subtotal * (1 - (p?.annualDiscountPct ?? 0) / 100)) : subtotal;
  return { plan: input.plan, billing: input.billing, modules, tierId: tier?.id ?? null, lines, subtotalCents: subtotal, monthlyCents: monthly, yearlyCents: monthly * 12 };
}

/** Tramo que corresponde a una cantidad de clientes. */
export function tierFor(config: PricingConfig, customers: number): CustomerTier | undefined {
  return byOrder(config.tiers).find((t) => t.maxCustomers == null || customers <= t.maxCustomers);
}

/** "$29" o "$84.40". */
export function formatUsdCents(value: number): string {
  const usd = value / 100;
  return `$${usd.toLocaleString("en-US", { minimumFractionDigits: value % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;
}
