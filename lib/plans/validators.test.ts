import { describe, expect, it } from "vitest";
import { defaultPricingConfig } from "./pricing";
import { validateModule, validatePlan, validateTiers, validateVertical } from "./validators";

const d = defaultPricingConfig();

describe("validación del catálogo", () => {
  it("plan: rechaza precios negativos y descuentos fuera de 0–100", () => {
    expect(validatePlan({ ...d.plans[1], basePriceUsdCents: -1 }).ok).toBe(false);
    expect(validatePlan({ ...d.plans[1], moduleDiscountPct: 120 }).ok).toBe(false);
    expect(validatePlan(d.plans[1]).ok).toBe(true);
  });
  it("módulo: el Inicio siempre es incluido, listo y gratis", () => {
    const r = validateModule({ ...d.modules.find((m) => m.module === "dashboard")!, priceUsdCents: 999, status: "PLANNED", included: false });
    expect(r.ok && r.value).toMatchObject({ module: "dashboard", priceUsdCents: 0, status: "READY", included: true });
  });
  it("rubro: siempre incluye el Inicio y recomienda solo módulos permitidos", () => {
    const v = d.verticals.find((x) => x.vertical === "gym")!;
    const r = validateVertical({ ...v, modules: ["crm", "memberships"], recommended: ["memberships", "quotes"] });
    expect(r.ok && r.value.modules).toEqual(["dashboard", "crm", "memberships"]);
    expect(r.ok && r.value.recommended).toEqual(["memberships"]);
  });
  it("tramos: crecientes y el último sin límite", () => {
    expect(validateTiers(d.tiers).ok).toBe(true);
    expect(validateTiers([{ ...d.tiers[0] }, { ...d.tiers[1], maxCustomers: 50 }, { ...d.tiers[3] }]).ok).toBe(false);
    expect(validateTiers([{ ...d.tiers[0] }]).ok).toBe(false);
  });
});
