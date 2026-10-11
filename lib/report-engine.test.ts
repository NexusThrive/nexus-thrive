import { describe, test, expect } from "vitest";
import { buildEvm } from "./report-engine";

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
