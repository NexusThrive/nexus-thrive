import { describe, test, expect } from "vitest";

import {
  parseMoney,
  moneyToString,
  decimalToMicro,
  lineTotal,
  componentCost,
  activityUnitCost,
  calculateBudgetTotals,
  calculateQuoteTotals,
  isValidPercent,
  percentToMicro,
  microToPercent,
  SCALE,
  AIU_DEFAULTS,
  RESOURCE_TYPES,
  formatApuUnit,
  apuItemCategoryToResourceType,
  type ActivityComponentInput,
  type AiuConfig,
  type QuoteLineInput,
} from "./apu-engine";

describe("apu-engine — parseMoney / moneyToString", () => {
  test("parseMoney convierte decimales a micro (6 dígitos)", () => {
    expect(parseMoney("1")).toBe(BigInt(1_000_000));
    expect(parseMoney("1.5")).toBe(BigInt(1_500_000));
    expect(parseMoney("1.234567")).toBe(BigInt(1_234_567));
    expect(parseMoney("0")).toBe(BigInt(0));
    expect(parseMoney("0.000001")).toBe(BigInt(1));
  });

  test("parseMoney rechaza >6 decimales", () => {
    expect(parseMoney("1.1234567")).toBeNull();
    expect(parseMoney("1.12345678")).toBeNull();
  });

  test("parseMoney rechaza notación científica y vacíos", () => {
    expect(parseMoney("1e6")).toBeNull();
    expect(parseMoney("")).toBeNull();
    expect(parseMoney("   ")).toBeNull();
  });

  test("moneyToString formatea micro a string legible", () => {
    expect(moneyToString(BigInt(1_000_000))).toBe("1");
    expect(moneyToString(BigInt(1_500_000))).toBe("1.5");
    expect(moneyToString(BigInt(1_234_567))).toBe("1.234567");
    expect(moneyToString(BigInt(0))).toBe("0");
    expect(moneyToString(-BigInt(1_500_000))).toBe("-1.5");
  });
});

describe("apu-engine — decimalToMicro (half-up, rechaza negativos/inválidos)", () => {
  test("valores con <=6 decimales son exactos", () => {
    expect(decimalToMicro("1")).toBe(BigInt(1_000_000));
    expect(decimalToMicro("1.234567")).toBe(BigInt(1_234_567));
    expect(decimalToMicro("0")).toBe(BigInt(0));
    expect(decimalToMicro("0.000001")).toBe(BigInt(1));
  });

  test("valores con >6 decimales redondean half-up", () => {
    // 7mo dígito < 5 → hacia abajo
    expect(decimalToMicro("1.2345674")).toBe(BigInt(1_234_567));
    expect(decimalToMicro("0.0000004")).toBe(BigInt(0));
    // 7mo dígito = 5 → hacia arriba (half-up)
    expect(decimalToMicro("1.2345675")).toBe(BigInt(1_234_568));
    expect(decimalToMicro("0.0000005")).toBe(BigInt(1));
    // 7mo dígito > 5 → hacia arriba
    expect(decimalToMicro("1.2345678")).toBe(BigInt(1_234_568));
    // acarreo al entero
    expect(decimalToMicro("0.9999999")).toBe(BigInt(1_000_000));
  });

  test("rechaza negativos", () => {
    expect(decimalToMicro("-1")).toBeNull();
    expect(decimalToMicro("-0.5")).toBeNull();
  });

  test("rechaza inválidos", () => {
    expect(decimalToMicro("")).toBeNull();
    expect(decimalToMicro("   ")).toBeNull();
    expect(decimalToMicro("abc")).toBeNull();
    expect(decimalToMicro("1e6")).toBeNull();
    expect(decimalToMicro("1,5")).toBeNull();
  });
});

describe("apu-engine — lineTotal (quantity × unitCost)", () => {
  test("lineTotal calcula en micro y devuelve micro", () => {
    // 2.5 × 100.000 = 250.000
    expect(lineTotal("2.5", "100000")).toBe(BigInt(250_000_000_000));
    // 12.5 × 449500 = 5,618,750 (caso dorado unitario)
    expect(lineTotal("12.5", "449500")).toBe(BigInt(5_618_750_000_000));
  });
});

describe("apu-engine — componentCost / activityUnitCost", () => {
  const makeComp = (overrides: Partial<ActivityComponentInput> = {}): ActivityComponentInput => ({
    unitPrice: "28000",
    consumption: "7",
    wastePercent: "0",
    ...overrides,
  });

  test("componentCost = performance × unitPrice (sin desperdicio)", () => {
    // 7 bultos × 28.000 = 196.000
    expect(componentCost(makeComp({ unitPrice: "28000", consumption: "7" }))).toBe(BigInt(196_000_000_000));
  });

  test("componentCost con wastePercent: performance × (1 + waste) × unitPrice", () => {
    // waste = 5% = 50_000 micro
    // 1 × (1 + 0.05) × 100 = 105
    const cost = componentCost(makeComp({ unitPrice: "100", consumption: "1", wastePercent: "5" }));
    expect(cost).toBe(BigInt(105_000_000));
  });

  test("activityUnitCost suma componentes y devuelve string", () => {
    const comps: ActivityComponentInput[] = [
      makeComp({ unitPrice: "28000", consumption: "7" }),      // 196.000
      makeComp({ unitPrice: "85000", consumption: "0.55" }),   // 46.750
      makeComp({ unitPrice: "95000", consumption: "0.85" }),   // 80.750
      makeComp({ unitPrice: "90000", consumption: "0.6" }),    // 54.000
      makeComp({ unitPrice: "60000", consumption: "1.2" }),    // 72.000
    ];
    // Total = 449.500
    expect(activityUnitCost(comps)).toBe("449500");
  });
});

describe("apu-engine — calculateBudgetTotals (BigInt, SCALE=1_000_000, half-up)", () => {
  // Caso dorado del enunciado
  test("caso dorado: directo 5.618.750, AIU 10/5/5/19 → total 6.795.878,125", () => {
    const directCostTotal = BigInt(5_618_750_000_000); // 5.618.750 en micro
    const adminPct = BigInt(100_000);   // 10%
    const imprevPct = BigInt(50_000);   // 5%
    const utilPct = BigInt(50_000);     // 5%
    const ivaPct = BigInt(190_000);     // 19%

    const totals = calculateBudgetTotals(directCostTotal, adminPct, imprevPct, utilPct, ivaPct);

    // BudgetTotals NO incluye directCostTotal en el retorno
    expect(totals.adminTotal).toBe(BigInt(561_875_000_000));      // 561.875
    expect(totals.imprevTotal).toBe(BigInt(280_937_500_000));     // 280.937,5
    expect(totals.utilidadTotal).toBe(BigInt(280_937_500_000));   // 280.937,5
    expect(totals.ivaUtilidadTotal).toBe(BigInt(53_378_125_000)); // 53.378,125
    expect(totals.grandTotal).toBe(BigInt(6_795_878_125_000));    // 6.795.878,125
  });

  test("redondeo half-up: 0.5 micro → 1", () => {
    // directCostTotal = 5 micro, admin 10% = 0.5 micro → redondea a 1
    const totals = calculateBudgetTotals(BigInt(5), BigInt(100_000), BigInt(0), BigInt(0), BigInt(0));
    expect(totals.adminTotal).toBe(BigInt(1));
  });

  test("redondeo half-up: 1.5 micro → 2", () => {
    // directCostTotal = 15 micro, admin 10% = 1.5 micro → redondea a 2
    const totals = calculateBudgetTotals(BigInt(15), BigInt(100_000), BigInt(0), BigInt(0), BigInt(0));
    expect(totals.adminTotal).toBe(BigInt(2));
  });

  test("redondeo half-up: 0.4 micro → 0", () => {
    // directCostTotal = 4 micro, admin 10% = 0.4 micro → redondea a 0
    const totals = calculateBudgetTotals(BigInt(4), BigInt(100_000), BigInt(0), BigInt(0), BigInt(0));
    expect(totals.adminTotal).toBe(BigInt(0));
  });

  test("caso grande: 333.333.333 micro × 10% = 33.333.333,3 → 33.333.333", () => {
    const totals = calculateBudgetTotals(BigInt(333_333_333), BigInt(100_000), BigInt(0), BigInt(0), BigInt(0));
    expect(totals.adminTotal).toBe(BigInt(33_333_333));
  });

  test("rechaza negativos", () => {
    expect(() => calculateBudgetTotals(-BigInt(1), BigInt(100_000), BigInt(0), BigInt(0), BigInt(0))).toThrow("valores negativos");
    expect(() => calculateBudgetTotals(BigInt(100), -BigInt(1), BigInt(0), BigInt(0), BigInt(0))).toThrow("valores negativos");
  });
});

describe("apu-engine — calculateQuoteTotals (Decimal strings, AIU sobre directo, tax sobre utilidad)", () => {
  test("formato Quote con Decimal strings", () => {
    const lines: QuoteLineInput[] = [
      { quantity: "12.5", unitCost: "449500" },
    ];
    const config: AiuConfig = {
      adminPercent: "10",
      imprevPercent: "5",
      utilPercent: "5",
      taxPercent: "19",
    };
    const totals = calculateQuoteTotals(lines, config);
    // Verifica estructura y valores razonables
    expect(totals.directCost).toBe("5618750");
    expect(totals.administration).toBe("561875");
    expect(totals.contingency).toBe("280937.5");
    expect(totals.utility).toBe("280937.5");
    expect(totals.subtotal).toBe("6742500");
    expect(totals.tax).toBe("53378.125");
    expect(totals.totalAmount).toBe("6795878.125");
  });
});

describe("apu-engine — isValidPercent / percentToMicro", () => {
  test("isValidPercent valida rango y decimales", () => {
    expect(isValidPercent("10", 30)).toBe(true);
    expect(isValidPercent("0", 30)).toBe(true);
    expect(isValidPercent("30", 30)).toBe(true);
    expect(isValidPercent("30.000001", 30)).toBe(false);
    expect(isValidPercent("-1", 30)).toBe(false);
    expect(isValidPercent("abc", 30)).toBe(false);
  });

  test("percentToMicro convierte porcentaje legible a micro-fracción (1_000_000 = 100%)", () => {
    expect(percentToMicro("10")).toBe(BigInt(100_000));    // 10%
    expect(percentToMicro("5")).toBe(BigInt(50_000));      // 5%
    expect(percentToMicro("19")).toBe(BigInt(190_000));    // 19%
    expect(percentToMicro("10.5")).toBe(BigInt(105_000));  // 10.5%
    expect(percentToMicro("0")).toBe(BigInt(0));
    expect(percentToMicro("")).toBeNull();
    expect(percentToMicro("invalid")).toBeNull();
  });
});

describe("apu-engine — constantes y tipos", () => {
  test("SCALE es 1_000_000 (6 decimales fijos)", () => {
    expect(SCALE).toBe(BigInt(1_000_000));
  });

  test("RESOURCE_TYPES tiene 4 valores (sin SUBCONTRACT/OTHER)", () => {
    expect(RESOURCE_TYPES.length).toBe(4);
    const values = RESOURCE_TYPES.map((r) => r.value);
    expect(values).toEqual(["MATERIAL", "LABOR", "EQUIPMENT", "TRANSPORT"]);
  });

  test("AIU_DEFAULTS es 10/5/5/19 % (fuente única en TS, espejo del contrato)", () => {
    expect(AIU_DEFAULTS.adminPct).toBe(BigInt(100_000));
    expect(AIU_DEFAULTS.imprevPct).toBe(BigInt(50_000));
    expect(AIU_DEFAULTS.utilidadPct).toBe(BigInt(50_000));
    expect(AIU_DEFAULTS.ivaUtilidadPct).toBe(BigInt(190_000));
    expect(microToPercent(AIU_DEFAULTS.adminPct)).toBe("10");
    expect(microToPercent(AIU_DEFAULTS.imprevPct)).toBe("5");
    expect(microToPercent(AIU_DEFAULTS.utilidadPct)).toBe("5");
    expect(microToPercent(AIU_DEFAULTS.ivaUtilidadPct)).toBe("19");
  });
});

describe("apu-engine — formatApuUnit (presentación, no almacenamiento)", () => {
  test("mapea M2→m² y M3→m³ sin cambiar el valor almacenado", () => {
    expect(formatApuUnit("M2")).toBe("m²");
    expect(formatApuUnit("M3")).toBe("m³");
  });

  test("cae al código cuando no hay mapeo (y vacío para null/undefined)", () => {
    expect(formatApuUnit("KG")).toBe("KG");
    expect(formatApuUnit("UND")).toBe("UND");
    expect(formatApuUnit(null)).toBe("");
    expect(formatApuUnit(undefined)).toBe("");
  });
});

describe("apu-engine — apuItemCategoryToResourceType (función pura)", () => {
  test("mapea cada categoría APU a su ResourceType correspondiente", () => {
    expect(apuItemCategoryToResourceType("MATERIAL")).toBe("MATERIAL");
    expect(apuItemCategoryToResourceType("MANO_DE_OBRA")).toBe("LABOR");
    expect(apuItemCategoryToResourceType("EQUIPO")).toBe("EQUIPMENT");
    expect(apuItemCategoryToResourceType("TRANSPORTE")).toBe("TRANSPORT");
  });

  test("es determinista y sin efectos colaterales", () => {
    for (let i = 0; i < 10; i++) {
      expect(apuItemCategoryToResourceType("MATERIAL")).toBe("MATERIAL");
      expect(apuItemCategoryToResourceType("MANO_DE_OBRA")).toBe("LABOR");
    }
  });
});
