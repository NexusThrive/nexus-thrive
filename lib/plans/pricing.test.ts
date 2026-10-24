import { describe, expect, it, test } from "vitest";
import { defaultPricingConfig, modulePriceCents, offeredModules, quote, resolveModules, suggestedModules, tierFor, formatUsdCents } from "./pricing";

const config = defaultPricingConfig();

describe("motor de precios configurable (un solo sistema: todo incluido, el plan limita el uso)", () => {
  it("no ofrece funciones PLANNED ni el Inicio, y ofrece lo mismo a cualquier rubro", () => {
    const offered = offeredModules(config, "restaurant").map((m) => m.module);
    expect(offered).not.toContain("orders"); // planeado
    expect(offered).not.toContain("dashboard");
    expect(offered).toContain("crm");
    // El rubro no limita: un gimnasio ve también las obras y un restaurante las membresías.
    expect(offeredModules(config, "gym").map((m) => m.module)).toEqual(offered);
    expect(offered).toEqual(expect.arrayContaining(["construction", "memberships", "purchases", "inventory"]));
  });
  it("el Inicio y lo esencial siempre quedan encendidos, también en Essential", () => {
    const mods = resolveModules(config, "ESSENTIAL", "gym", []);
    expect(mods).toEqual(expect.arrayContaining(["dashboard", "crm", "finance"]));
  });
  it("cualquier plan puede encender lo que elija, sea cual sea el rubro", () => {
    for (const plan of ["ESSENTIAL", "ELITE", "SIGNATURE"] as const) {
      const mods = resolveModules(config, plan, "gym", ["construction", "purchases"]);
      expect(mods).toEqual(expect.arrayContaining(["construction", "purchases"]));
    }
    expect(resolveModules(config, "ELITE", "gym", [])).not.toContain("construction"); // no se enciende solo
  });
  it("las funciones no cuestan: la cotización es el plan más el tramo de clientes", () => {
    for (const m of ["whatsapp", "billing", "inventory", "purchases", "construction", "memberships"] as const) expect(modulePriceCents(config, m, "gym", "ELITE")).toBe(0);
    const q = quote(config, { plan: "ELITE", vertical: "construction", billing: "MONTHLY", selected: ["construction", "billing", "purchases"], tierId: "tier-500" });
    expect(q.lines.map((l) => l.kind)).toEqual(["plan", "tier"]);
    expect(q.monthlyCents).toBe(2900 + 1000);
  });
  it("el plan limita el uso: usuarios y tramo de clientes, no funciones", () => {
    expect(config.plans.map((p) => [p.key, p.maxUsers])).toEqual([["ESSENTIAL", 1], ["ELITE", 3], ["SIGNATURE", null]]);
    expect(config.plans.every((p) => p.moduleDiscountPct === 0 && !p.includesAllModules)).toBe(true);
  });
  it("el anual aplica el descuento sobre el total", () => {
    const m = quote(config, { plan: "ELITE", vertical: "gym", billing: "MONTHLY", selected: [], tierId: "tier-500" });
    const a = quote(config, { plan: "ELITE", vertical: "gym", billing: "ANNUAL", selected: [], tierId: "tier-500" });
    expect(a.monthlyCents).toBe(Math.round(m.monthlyCents * 0.8));
  });
  it("si el panel le pone precio a una función, se respeta (configuración editable)", () => {
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

describe("sugeridas por el rubro", () => {
  test("el rubro sugiere pero no limita", () => {
    const gym = suggestedModules(config, "gym").map((m) => m.module);
    expect(gym).toContain("memberships");
    expect(gym).not.toContain("construction");
    expect(suggestedModules(config, "retail").map((m) => m.module)).toContain("purchases");
  });
});
