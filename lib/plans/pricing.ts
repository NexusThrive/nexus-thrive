import { MODULES, SIGNUP_VERTICALS, VERTICALS, VERTICAL_LABELS, VERTICAL_RECIPES, type ModuleValue, type VerticalValue } from "@/lib/admin/catalogs";
import {
  ANNUAL_DISCOUNT,
  GENERAL_MODULES,
  INCLUDED_MODULES,
  MODULE_PRICES,
  PLANS,
  SIGNATURE_MODULE_FACTOR,
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
  /** Módulos que el rubro puede usar (lo demás no se ofrece ni se activa). */
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

const DESCRIPTIONS: Record<ModuleValue, string> = {
  dashboard: "Tu tablero con lo esencial del día a día.",
  crm: "Clientes, fichas 360° y seguimiento.",
  bookings: "Reservas, citas y agenda.",
  payments: "Cobros y control de pagos.",
  billing: "Cuentas de cobro y recibos numerados.",
  inventory: "Productos, servicios, planes y stock.",
  finance: "Cobros, gastos y caja menor.",
  whatsapp: "Plantillas y envío por WhatsApp.",
  memberships: "Planes y membresías recurrentes.",
  orders: "Pedidos y ventas.",
  quotes: "Obras, presupuestos y catálogo APU.",
};

const LABELS: Record<ModuleValue, string> = {
  dashboard: "Inicio",
  crm: "Clientes",
  bookings: "Reservas",
  payments: "Pagos",
  billing: "Facturación",
  inventory: "Catálogo e inventario",
  finance: "Finanzas",
  whatsapp: "WhatsApp",
  memberships: "Membresías",
  orders: "Pedidos",
  quotes: "Obras y presupuestos",
};

/** Módulos que ya funcionan de verdad; el resto empieza como PLANNED. */
const READY_MODULES: ModuleValue[] = ["dashboard", "crm", "bookings", "finance", "payments", "billing", "inventory", "whatsapp", "memberships", "quotes"];

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
      moduleDiscountPct: key === "SIGNATURE" ? Math.round((1 - SIGNATURE_MODULE_FACTOR) * 100) : 0,
      includesAllModules: key === "SIGNATURE",
      chargesModules: key !== "ESSENTIAL",
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
      status: READY_MODULES.includes(m) ? "READY" : "PLANNED",
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
 * Módulos que se ofrecen al rubro: permitidos por el rubro y que no estén
 * PLANNED. El Inicio no se ofrece (siempre está). Ordenados como el catálogo.
 */
export function offeredModules(config: PricingConfig, vertical: VerticalValue): ModuleConfig[] {
  const allowed = new Set(verticalOf(config, vertical)?.modules ?? []);
  return byOrder(config.modules.filter((m) => m.module !== CORE_MODULE && allowed.has(m.module) && m.status !== "PLANNED"));
}

/** Módulos que quedan activos con el plan. Siempre incluye el Inicio. */
export function resolveModules(config: PricingConfig, plan: PlanKey, vertical: VerticalValue, selected: readonly ModuleValue[]): ModuleValue[] {
  const p = planOf(config, plan);
  const offered = offeredModules(config, vertical);
  const included = offered.filter((m) => m.included).map((m) => m.module);
  let picked: ModuleValue[];
  if (!p || (!p.chargesModules && !p.includesAllModules)) picked = included;
  else if (p.includesAllModules) picked = offered.map((m) => m.module);
  else {
    const allowed = new Set(offered.map((m) => m.module));
    picked = [...new Set([...included, ...selected.filter((m) => allowed.has(m))])];
  }
  const set = new Set<ModuleValue>([CORE_MODULE, ...picked]);
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
