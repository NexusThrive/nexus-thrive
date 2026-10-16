import { describe, test, expect } from "vitest";
import { buildEvm, buildInformeCeroData } from "./report-engine";

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
