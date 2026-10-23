import { describe, expect, it, test } from "vitest";
import { defaultPricingConfig, modulePriceCents, offeredModules, quote, resolveModules, tierFor, formatUsdCents } from "./pricing";

const config = defaultPricingConfig();

describe("motor de precios configurable", () => {
  it("no ofrece módulos PLANNED ni el Inicio", () => {
    const offered = offeredModules(config, "restaurant").map((m) => m.module);
    expect(offered).not.toContain("orders");
    expect(offered).not.toContain("dashboard");
    expect(offered).toContain("crm");
  });
  it("el Inicio siempre queda activo, también en Essential", () => {
    expect(resolveModules(config, "ESSENTIAL", "gym", ["whatsapp"])).toContain("dashboard");
    expect(resolveModules(config, "ESSENTIAL", "gym", ["whatsapp"])).not.toContain("whatsapp");
  });
  it("Elite suma lo elegido del rubro y descarta lo ajeno", () => {
    const mods = resolveModules(config, "ELITE", "construction", ["quotes", "memberships"]);
    expect(mods).toContain("quotes");
    expect(mods).not.toContain("memberships");
  });
  it("precio por módulo con factor del rubro y descuento del plan", () => {
    expect(modulePriceCents(config, "quotes", "construction", "ELITE")).toBe(1900); // round(14×1,35)=19
    expect(modulePriceCents(config, "whatsapp", "gym", "SIGNATURE")).toBe(540); // 9 × 0,6
    expect(modulePriceCents(config, "crm", "gym", "ELITE")).toBe(0); // incluido
  });
  it("suma el tramo de clientes y aplica el anual", () => {
    const m = quote(config, { plan: "ELITE", vertical: "gym", billing: "MONTHLY", selected: ["whatsapp"], tierId: "tier-500" });
    expect(m.lines.find((l) => l.kind === "tier")?.cents).toBe(1000);
    expect(m.monthlyCents).toBe(2900 + 900 + 1000);
    const a = quote(config, { plan: "ELITE", vertical: "gym", billing: "ANNUAL", selected: ["whatsapp"], tierId: "tier-500" });
    expect(a.monthlyCents).toBe(Math.round(m.monthlyCents * 0.8));
  });
  it("respeta cambios de configuración (precio editado en el panel)", () => {
    const edited = { ...config, modules: config.modules.map((x) => (x.module === "whatsapp" ? { ...x, priceUsdCents: 1500 } : x)) };
    expect(modulePriceCents(edited, "whatsapp", "gym", "ELITE")).toBe(1500);
  });
  it("tramo por cantidad de clientes", () => {
    expect(tierFor(config, 80)?.id).toBe("tier-100");
    expect(tierFor(config, 450)?.id).toBe("tier-500");
    expect(tierFor(config, 9000)?.id).toBe("tier-unlimited");
  });
});

describe("formatUsdCents", () => {
  test("sin decimales si son dólares enteros", () => {
    expect(formatUsdCents(2900)).toBe("$29");
    expect(formatUsdCents(8440)).toBe("$84.40");
  });
});
