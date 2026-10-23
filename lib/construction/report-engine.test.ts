import { describe, test, expect } from "vitest";
import { buildEvm, buildInformeCeroData, earnedValueMicro } from "./report-engine";

const METRIC_KEYS = ["pv", "ev", "ac", "spi", "cpi", "sv", "cv"] as const;

describe("report-engine — buildEvm (honesto: no medible sin avance físico ni costo real)", () => {
  test("sin presupuesto, sin avance y sin costo → no medible (nunca 0)", () => {
    const evm = buildEvm(null, null, null);
    expect(evm.available).toBe(false);
    for (const key of METRIC_KEYS) {
      expect(evm[key].measurable).toBe(false);
      expect(evm[key].value).toBeNull();
      expect(evm[key].reason).toBeTruthy();
    }
    expect(evm.physicalProgressPct).toBeNull();
    expect(evm.reason).toBeTruthy();
  });

  test("physicalProgressPct se propaga tal cual (distinto del PPC)", () => {
    const evm = buildEvm(null, 42, null);
    expect(evm.physicalProgressPct).toBe(42);
    expect(evm.available).toBe(false);
  });

  test("cada indicador declara su fuente faltante", () => {
    const evm = buildEvm(null, null, null);
    expect(evm.pv.reason).toMatch(/línea base/i);
    expect(evm.ev.reason).toMatch(/avance físico/i);
    expect(evm.ac.reason).toMatch(/costo real/i);
    expect(evm.spi.reason).toMatch(/EV y PV/);
    expect(evm.sv.reason).toMatch(/EV y PV/);
    expect(evm.cpi.reason).toMatch(/EV y AC/);
    expect(evm.cv.reason).toMatch(/EV y AC/);
  });
});

describe("report-engine — buildInformeCeroData (emisor y cliente)", () => {
  const project = {
    id: "p1",
    code: "OBR-1",
    name: "Casa",
    description: null,
    status: "DRAFT",
    createdAt: "2026-10-01",
    updatedAt: "2026-10-01",
    customerName: "Cliente S.A.S.",
    header: null,
  } as unknown as Parameters<typeof buildInformeCeroData>[0];

  test("toma los datos de la constructora del emisor", () => {
    const data = buildInformeCeroData(project, null, {
      name: "Constructora Andina S.A.S.",
      nit: "900123456",
      address: "Cra 7 # 10-20",
      city: "Bogotá",
    });
    expect(data.constructorName).toBe("Constructora Andina S.A.S.");
    expect(data.constructorNit).toBe("900123456");
    expect(data.constructorCity).toBe("Bogotá");
    expect(data.clientName).toBe("Cliente S.A.S.");
  });

  test("sin emisor los campos quedan vacíos, no inventados", () => {
    const data = buildInformeCeroData(project, null);
    expect(data.constructorName).toBeNull();
    expect(data.constructorNit).toBeNull();
  });
});

describe("report-engine — valor ganado desde actas de avance", () => {
  const budget = {
    directCostTotal: "1000000000000",
    chapters: [
      {
        items: [
          { id: "a", unitCostDirect: "50000000000" }, // $50.000 / unidad
          { id: "b", unitCostDirect: "12500000" }, // $12,5 / unidad
        ],
      },
    ],
  } as unknown as Parameters<typeof earnedValueMicro>[0];

  test("suma ejecutado × costo unitario hasta la fecha de corte", () => {
    const entries = [
      { budgetItemId: "a", cutoffDate: "2026-10-05", executedQuantity: "2000000" },
      { budgetItemId: "a", cutoffDate: "2026-10-12", executedQuantity: "1500000" },
      { budgetItemId: "b", cutoffDate: "2026-10-12", executedQuantity: "4000000" },
      { budgetItemId: "a", cutoffDate: "2026-10-20", executedQuantity: "9000000" },
    ];
    // a: 3,5 × 50.000 = 175.000 ; b: 4 × 12,5 = 50 → 175.050
    expect(earnedValueMicro(budget, entries, "2026-10-12")).toBe(BigInt(175_050_000_000));
    expect(earnedValueMicro(budget, entries, "2026-10-04")).toBe(BigInt(0));
  });

  test("con actas, EV es medible y PV/AC siguen sin fuente", () => {
    const evm = buildEvm(budget, 17.5, null, BigInt(175_050_000_000));
    expect(evm.ev.measurable).toBe(true);
    expect(evm.ev.value).toContain("175");
    expect(evm.pv.measurable).toBe(false);
    expect(evm.ac.measurable).toBe(false);
    expect(evm.physicalProgressPct).toBe(17.5);
  });
});
