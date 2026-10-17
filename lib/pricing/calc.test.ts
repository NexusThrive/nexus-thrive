import { describe, expect, it } from "vitest";
import {
  DEFAULT_PRICING_STATE,
  changeIndustry,
  changeTier,
  effectiveTier,
  formatUSD,
  quote,
  shouldSuggestSignature,
  type PricingState,
} from "./calc";

const base: PricingState = { ...DEFAULT_PRICING_STATE };

describe("quote", () => {
  it("Essential es gratis", () => {
    const q = quote({ ...base, tier: "essential" });
    expect(q.monthly).toBe(0);
    expect(q.lines[0].text).toBe("Gratis");
  });

  it("Elite: base + clientes adicionales + módulos con el factor del rubro", () => {
    // gym (factor 1): 29 + (120-50)*0.20=14 + WhatsApp 9 + Recordatorios 5 + Membresías 8
    const q = quote(base);
    expect(q.monthly).toBe(29 + 14 + 9 + 5 + 8);
    expect(q.lines.map((l) => l.label)).toContain("70 clientes adicionales");
  });

  it("cobra distinto los clientes sobre 150", () => {
    const q = quote({ ...base, clients: 200, modules: Array.from({ length: 5 }, (_, i) => ["whatsapp", "factura", "inventario", "caja", "reportes"][i]) });
    expect(q.lines.find((l) => l.label === "50 clientes sobre 150")?.amount).toBe(6);
  });

  it("anual descuenta 20 % y el total del año es 12 meses", () => {
    const monthly = quote(base).monthly;
    const q = quote({ ...base, billing: "annual" });
    expect(q.monthly).toBeCloseTo(monthly * 0.8, 2);
    expect(q.annual).toBeCloseTo(q.monthly * 12, 2);
    expect(q.lines.at(-1)?.amount).toBeLessThan(0);
  });

  it("Signature aplica 40 % menos por módulo", () => {
    const q = quote({ ...base, tier: "signature", modules: ["whatsapp"] });
    expect(q.monthly).toBe(79 + 5.4);
  });
});

describe("reglas de nivel", () => {
  it("Elite con >150 clientes y ≤4 módulos es Pre Signature", () => {
    expect(effectiveTier({ ...base, clients: 151 })).toBe("pre");
    expect(effectiveTier({ ...base, clients: 151, modules: ["whatsapp", "factura", "inventario", "caja", "reportes"] })).toBe("elite");
  });

  it("al ir a Signature se marcan todos y al volver se restaura la selección", () => {
    const up = changeTier(base, "signature");
    expect(up.modules.length).toBe(11);
    const back = changeTier(up, "elite", up.kept);
    expect(back.modules).toEqual(base.modules);
  });

  it("pasar a Elite desde 10 clientes sube a 50", () => {
    expect(changeTier({ ...base, tier: "essential", clients: 10 }, "elite").clients).toBe(50);
  });

  it("cambiar de rubro cambia sus módulos y conserva los generales", () => {
    const next = changeIndustry(base, "construction");
    expect(next.modules).toEqual(["whatsapp", "recordatorios", "apu"]);
  });

  it("sugiere Signature cuando Elite sale casi igual", () => {
    expect(shouldSuggestSignature(base)).toBe(false);
    const heavy = { ...base, clients: 140, modules: ["whatsapp", "factura", "inventario", "caja", "reportes", "equipo", "recordatorios", "pagos", "membresias", "rutinas", "clases"] };
    expect(shouldSuggestSignature(heavy)).toBe(true);
  });
});

describe("formatUSD", () => {
  it("sin decimales si es entero; dos si no", () => {
    expect(formatUSD(29)).toBe("$29");
    expect(formatUSD(84.4)).toBe("$84.40");
    expect(formatUSD(1234)).toBe("$1,234");
  });
});
