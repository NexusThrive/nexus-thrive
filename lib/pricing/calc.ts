import {
  GENERAL_MODULES,
  INDUSTRIES,
  PRICING,
  type Billing,
  type EffectiveTier,
  type IndustryKey,
  type ModuleDef,
  type TierKey,
} from "./catalog";

export type PricingState = {
  tier: TierKey;
  industry: IndustryKey;
  clients: number;
  billing: Billing;
  /** Claves de los módulos marcados. */
  modules: string[];
};

export type PriceLine = {
  label: string;
  /** USD; negativo = descuento; `null` = texto (p. ej. "Gratis"). */
  amount: number | null;
  /** Valor a mostrar cuando `amount` es null. */
  text?: string;
};

export type Quote = {
  /** Total mensual a pagar (con descuento anual si aplica). */
  monthly: number;
  /** Total del año cuando se factura anual. */
  annual: number;
  /** Total mensual antes del descuento anual. */
  raw: number;
  lines: PriceLine[];
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Módulos disponibles para el rubro: los propios primero, luego los generales. */
export function availableModules(industry: IndustryKey): ModuleDef[] {
  return [...INDUSTRIES[industry].modules, ...GENERAL_MODULES];
}

/** Precio mensual de un módulo con el factor del rubro (mínimo 1 USD). */
export function modulePrice(module: ModuleDef, industry: IndustryKey): number {
  return Math.max(1, Math.round(module.price * INDUSTRIES[industry].factor));
}

/** Precio del módulo en Signature (40 % menos). */
export function signatureModulePrice(module: ModuleDef, industry: IndustryKey): number {
  return round2(modulePrice(module, industry) * PRICING.signature.moduleFactor);
}

export function selectedModules(state: PricingState): ModuleDef[] {
  const chosen = new Set(state.modules);
  return availableModules(state.industry).filter((m) => chosen.has(m.key));
}

/** Elite con más de 150 clientes y 4 módulos o menos pasa a Pre Signature. */
export function effectiveTier(state: PricingState): EffectiveTier {
  if (
    state.tier === "elite" &&
    state.clients > PRICING.elite.max &&
    selectedModules(state).length <= PRICING.preSignatureMaxModules
  ) {
    return "pre";
  }
  return state.tier;
}

export function tierBasePrice(tier: "elite" | "signature", industry: IndustryKey): number {
  return Math.round(PRICING[tier].base * INDUSTRIES[industry].factor);
}

/** Cotización completa con el desglose línea por línea. */
export function quote(state: PricingState, tier: EffectiveTier = effectiveTier(state)): Quote {
  if (tier === "essential") {
    return { monthly: 0, annual: 0, raw: 0, lines: [{ label: "Plan Essential", amount: null, text: "Gratis" }] };
  }
  const lines: PriceLine[] = [];
  let total = 0;
  const add = (label: string, amount: number) => {
    lines.push({ label, amount });
    total += amount;
  };

  if (tier === "signature") {
    add("Plan Signature", tierBasePrice("signature", state.industry));
    for (const m of selectedModules(state)) add(m.name, signatureModulePrice(m, state.industry));
  } else {
    add("Plan base", tierBasePrice("elite", state.industry));
    const { includedClients, max, perClient, perClientOver } = PRICING.elite;
    const extra = Math.max(0, Math.min(state.clients, max) - includedClients);
    const over = Math.max(0, state.clients - max);
    if (extra) add(`${extra} clientes adicionales`, round2(extra * perClient));
    if (over) add(`${over} clientes sobre ${max}`, round2(over * perClientOver));
    for (const m of selectedModules(state)) add(m.name, modulePrice(m, state.industry));
  }

  const raw = round2(total);
  let monthly = raw;
  if (state.billing === "annual") {
    const discount = round2(raw * PRICING.annualDiscount);
    lines.push({ label: "Pago anual (−20%)", amount: -discount });
    monthly = round2(raw - discount);
  }
  return { monthly, annual: round2(monthly * 12), raw, lines };
}

/** Lo que costaría Signature con todos los módulos (para sugerirlo). */
export function signatureAllIn(state: PricingState): number {
  return quote(
    { ...state, billing: "monthly", modules: availableModules(state.industry).map((m) => m.key) },
    "signature",
  ).monthly;
}

/** ¿Conviene sugerir Signature? (Elite que ya cuesta ≥ 92 % de Signature completo). */
export function shouldSuggestSignature(state: PricingState): boolean {
  return state.tier === "elite" && quote(state).raw >= signatureAllIn(state) * 0.92;
}

/** Lo que incluye cada nivel (✓ / ✗) para el resumen. */
export function tierFeatures(state: PricingState, tier: EffectiveTier = effectiveTier(state)): [boolean, string][] {
  if (tier === "essential") {
    return [
      [true, `${PRICING.essentialClients} clientes de prueba`],
      [true, "1 usuario"],
      [true, "Clientes, agenda y finanzas básicas"],
      [false, "Sin WhatsApp ni facturación"],
      [false, "Marca NEXUS en recibos"],
    ];
  }
  if (tier === "signature") {
    return [
      [true, "Clientes ilimitados"],
      [true, "Usuarios ilimitados"],
      [true, "Módulos con 40% menos"],
      [true, "Migración de datos incluida"],
      [true, "Asesor dedicado y soporte prioritario"],
    ];
  }
  return [
    [true, `${state.clients.toLocaleString("en-US")} clientes`],
    [true, "Hasta 3 usuarios"],
    [true, `${selectedModules(state).length} módulos a la medida`],
    [true, "Soporte por chat"],
    tier === "pre" ? [true, "Precio por cliente reducido sobre 150"] : [false, "Sin asesor dedicado"],
  ];
}

/** Cambia de nivel con las reglas del configurador. */
export function changeTier(state: PricingState, tier: TierKey, kept?: string[]): PricingState & { kept?: string[] } {
  if (tier === state.tier) return state;
  let modules = state.modules;
  let nextKept = kept;
  if (tier === "signature") {
    // Signature incluye todo: se guarda la selección para volver a ella.
    nextKept = state.modules;
    modules = availableModules(state.industry).map((m) => m.key);
  } else if (state.tier === "signature" && kept) {
    modules = kept;
    nextKept = undefined;
  }
  const clients = tier === "elite" && state.clients <= PRICING.essentialClients ? 50 : state.clients;
  return { ...state, tier, modules, clients, kept: nextKept };
}

/** Cambia de rubro: quita los módulos del rubro anterior y sugiere los nuevos. */
export function changeIndustry(state: PricingState, industry: IndustryKey): PricingState {
  if (industry === state.industry) return state;
  const old = new Set(INDUSTRIES[state.industry].modules.map((m) => m.key));
  const modules = state.modules.filter((key) => !old.has(key));
  if (state.tier !== "essential") {
    const suggested = INDUSTRIES[industry].modules.slice(0, state.tier === "signature" ? 3 : 1);
    modules.push(...suggested.map((m) => m.key));
  }
  return { ...state, industry, modules };
}

export function clampClients(n: number): number {
  return Math.max(PRICING.minClients, Math.min(PRICING.maxClients, Math.round(n)));
}

export function formatUSD(value: number): string {
  const decimals = value % 1 ? 2 : 0;
  return `$${(Math.round(value * 100) / 100).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: 2,
  })}`;
}

export const DEFAULT_PRICING_STATE: PricingState = {
  tier: "elite",
  industry: "gym",
  clients: 120,
  billing: "monthly",
  modules: ["whatsapp", "recordatorios", "membresias"],
};
