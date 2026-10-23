import { isModule, type ModuleValue } from "@/lib/admin/catalogs";
import type { CustomerTier, ModuleConfig, ModuleStatus, PlanConfig, VerticalConfig } from "./pricing";

/** Validación de lo que se edita en Planes y módulos (pura). */

type Result<T> = { ok: true; value: T } | { ok: false; message: string };

const clean = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const int = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.round(v) : Number.NaN);
const MAX_CENTS = 100_000_00; // USD 100.000

function cents(v: unknown, label: string): number | string {
  const n = int(v);
  if (!Number.isFinite(n) || n < 0) return `${label}: escribe un valor de 0 o más.`;
  if (n > MAX_CENTS) return `${label}: el valor es demasiado alto.`;
  return n;
}

function pct(v: unknown, label: string): number | string {
  const n = int(v);
  if (!Number.isFinite(n) || n < 0 || n > 100) return `${label}: debe estar entre 0 y 100.`;
  return n;
}

export function validatePlan(raw: PlanConfig): Result<PlanConfig> {
  const name = clean(raw.name);
  const tagline = clean(raw.tagline);
  if (name.length < 2 || name.length > 30) return { ok: false, message: "El nombre del plan debe tener entre 2 y 30 caracteres." };
  if (tagline.length > 140) return { ok: false, message: "La descripción del plan admite hasta 140 caracteres." };
  const features = (raw.features ?? []).map(clean).filter(Boolean).slice(0, 8);
  if (features.some((f) => f.length > 80)) return { ok: false, message: "Cada característica admite hasta 80 caracteres." };
  const base = cents(raw.basePriceUsdCents, "Precio base");
  if (typeof base === "string") return { ok: false, message: base };
  const disc = pct(raw.moduleDiscountPct, "Descuento en módulos");
  if (typeof disc === "string") return { ok: false, message: disc };
  const annual = pct(raw.annualDiscountPct, "Descuento anual");
  if (typeof annual === "string") return { ok: false, message: annual };
  const maxUsers = raw.maxUsers == null ? null : int(raw.maxUsers);
  if (maxUsers != null && (!Number.isFinite(maxUsers) || maxUsers < 1 || maxUsers > 500)) return { ok: false, message: "Usuarios incluidos: de 1 a 500, o vacío para sin límite." };
  return {
    ok: true,
    value: { ...raw, name, tagline, features, basePriceUsdCents: base, moduleDiscountPct: disc, annualDiscountPct: annual, maxUsers, includesAllModules: !!raw.includesAllModules, chargesModules: !!raw.chargesModules || !!raw.includesAllModules, recommended: !!raw.recommended, active: !!raw.active },
  };
}

export function validateModule(raw: ModuleConfig): Result<ModuleConfig> {
  if (!isModule(raw.module)) return { ok: false, message: "Módulo desconocido." };
  const label = clean(raw.label);
  if (label.length < 2 || label.length > 40) return { ok: false, message: "El nombre del módulo debe tener entre 2 y 40 caracteres." };
  const description = clean(raw.description).slice(0, 160);
  const price = cents(raw.priceUsdCents, "Precio");
  if (typeof price === "string") return { ok: false, message: price };
  const status: ModuleStatus = raw.status === "READY" || raw.status === "BETA" ? raw.status : "PLANNED";
  // El Inicio siempre está activo: no se vende aparte ni se apaga.
  if (raw.module === "dashboard") return { ok: true, value: { ...raw, label, description, priceUsdCents: 0, status: "READY", included: true } };
  return { ok: true, value: { ...raw, label, description, priceUsdCents: price, status, included: !!raw.included } };
}

export function validateVertical(raw: VerticalConfig): Result<VerticalConfig> {
  const label = clean(raw.label);
  if (label.length < 2 || label.length > 40) return { ok: false, message: "El nombre del rubro debe tener entre 2 y 40 caracteres." };
  const factor = int(raw.priceFactorPct);
  if (!Number.isFinite(factor) || factor < 10 || factor > 500) return { ok: false, message: "El factor de precio debe estar entre 10 % y 500 %." };
  const modules = [...new Set((raw.modules ?? []).filter(isModule))] as ModuleValue[];
  if (!modules.includes("dashboard")) modules.unshift("dashboard");
  if (modules.length < 2) return { ok: false, message: "El rubro necesita al menos un módulo además del Inicio." };
  const recommended = [...new Set((raw.recommended ?? []).filter((m): m is ModuleValue => isModule(m) && modules.includes(m) && m !== "dashboard"))];
  return { ok: true, value: { ...raw, label, priceFactorPct: factor, modules, recommended, signupEnabled: !!raw.signupEnabled, dashboardTemplate: clean(raw.dashboardTemplate) || null } };
}

/** Tramos de clientes: de menor a mayor y el último sin límite. */
export function validateTiers(raw: CustomerTier[]): Result<CustomerTier[]> {
  if (raw.length === 0) return { ok: false, message: "Agrega al menos un tramo." };
  if (raw.length > 8) return { ok: false, message: "Máximo 8 tramos." };
  const out: CustomerTier[] = [];
  let prev = 0;
  for (const [i, t] of raw.entries()) {
    const label = clean(t.label);
    if (label.length < 2 || label.length > 40) return { ok: false, message: `Tramo ${i + 1}: escribe un nombre (2 a 40 caracteres).` };
    const last = i === raw.length - 1;
    const max = t.maxCustomers == null ? null : int(t.maxCustomers);
    if (!last && (max == null || !Number.isFinite(max))) return { ok: false, message: `Tramo ${i + 1}: indica el máximo de clientes (solo el último puede ser sin límite).` };
    if (last && max != null) return { ok: false, message: "El último tramo debe ser sin límite." };
    if (max != null && max <= prev) return { ok: false, message: `Tramo ${i + 1}: el máximo debe ser mayor que el del tramo anterior.` };
    const price = cents(t.priceUsdCents, `Tramo ${i + 1}`);
    if (typeof price === "string") return { ok: false, message: price };
    out.push({ id: clean(t.id) || `tier-${i}-${Date.now().toString(36)}`, label, maxCustomers: max, priceUsdCents: price, order: i });
    if (max != null) prev = max;
  }
  return { ok: true, value: out };
}
