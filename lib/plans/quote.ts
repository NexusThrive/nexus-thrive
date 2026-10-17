import { MODULES, VERTICAL_RECIPES, sortModules, type ModuleValue, type VerticalValue } from "@/lib/admin-catalogs";
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

const cents = (usd: number) => Math.round(usd * 100);

/**
 * Módulos que tienen sentido para el rubro: los de su receta más los
 * generales; el resto (p. ej. Membresías en una constructora) no se ofrece.
 */
export function modulesForVertical(vertical: VerticalValue): ModuleValue[] {
  const relevant = new Set<ModuleValue>([...VERTICAL_RECIPES[vertical].modules, ...GENERAL_MODULES, ...INCLUDED_MODULES]);
  return sortModules(MODULES.filter((m) => relevant.has(m)));
}

/** Módulos de pago del rubro (los incluidos no se cobran). */
export function paidModulesForVertical(vertical: VerticalValue): ModuleValue[] {
  return modulesForVertical(vertical).filter((m) => !INCLUDED_MODULES.includes(m));
}

/** Precio mensual de un módulo en centavos de USD para el rubro y el plan. */
export function moduleMonthlyCents(module: ModuleValue, vertical: VerticalValue, plan: PlanKey): number {
  const base = MODULE_PRICES[module];
  if (!base || plan === "ESSENTIAL") return 0;
  const price = Math.max(1, Math.round(base * VERTICAL_FACTORS[vertical]));
  return cents(plan === "SIGNATURE" ? price * SIGNATURE_MODULE_FACTOR : price);
}

/** Precio base del plan para el rubro, en centavos. */
export function planBaseCents(plan: PlanKey, vertical: VerticalValue): number {
  return cents(Math.round(PLANS[plan].base * VERTICAL_FACTORS[vertical]));
}

/**
 * Módulos que quedan activos según el plan: Essential solo los incluidos;
 * Signature todos los del rubro; Elite los incluidos más los elegidos que
 * pertenecen al rubro (lo ajeno se descarta).
 */
export function resolvePlanModules(plan: PlanKey, vertical: VerticalValue, selected: readonly ModuleValue[]): ModuleValue[] {
  if (plan === "ESSENTIAL") return sortModules([...INCLUDED_MODULES]);
  if (plan === "SIGNATURE") return modulesForVertical(vertical);
  const allowed = new Set(modulesForVertical(vertical));
  return sortModules([...new Set([...INCLUDED_MODULES, ...selected.filter((m) => allowed.has(m))])]);
}

export type PlanLine = { label: string; cents: number; module?: ModuleValue };

export type PlanQuote = {
  plan: PlanKey;
  billing: Billing;
  modules: ModuleValue[];
  lines: PlanLine[];
  /** Mensual antes del descuento anual. */
  subtotalCents: number;
  /** Lo que se paga por mes (con descuento si es anual). */
  monthlyCents: number;
  /** Total del año cuando se factura anual (si no, 12 × mensual). */
  yearlyCents: number;
};

/** Cotización completa del plan. La usan la interfaz y el servidor (fuente de verdad). */
export function quotePlan(input: {
  plan: PlanKey;
  vertical: VerticalValue;
  billing: Billing;
  selected: readonly ModuleValue[];
  moduleLabel?: (m: ModuleValue) => string;
}): PlanQuote {
  const modules = resolvePlanModules(input.plan, input.vertical, input.selected);
  const lines: PlanLine[] = [];
  const base = planBaseCents(input.plan, input.vertical);
  lines.push({ label: `Plan ${PLANS[input.plan].name}`, cents: base });
  for (const m of modules) {
    const c = moduleMonthlyCents(m, input.vertical, input.plan);
    if (c > 0) lines.push({ label: input.moduleLabel?.(m) ?? m, cents: c, module: m });
  }
  const subtotal = lines.reduce((sum, l) => sum + l.cents, 0);
  const monthly = input.billing === "ANNUAL" ? Math.round(subtotal * (1 - ANNUAL_DISCOUNT)) : subtotal;
  return {
    plan: input.plan,
    billing: input.billing,
    modules,
    lines,
    subtotalCents: subtotal,
    monthlyCents: monthly,
    yearlyCents: monthly * 12,
  };
}

/** "$29" o "$84.40". */
export function formatUsdCents(value: number): string {
  const usd = value / 100;
  return `$${usd.toLocaleString("en-US", { minimumFractionDigits: value % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;
}
