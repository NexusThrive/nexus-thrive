import { describe, expect, it } from "vitest";
import { shiftStatus, summarizeShifts, type ShiftRow } from "@/lib/business/pos/shift-report";

const row = (closedAt: string | null, difference: number | null): ShiftRow => ({ id: "x", terminalName: "M1", cashier: "Ana", openedAt: "2026-11-01T13:00:00Z", closedAt, opening: 50_000, expected: null, counted: null, difference, notes: null });

describe("turnos de caja", () => {
  it("clasifica el cuadre", () => {
    expect(shiftStatus(row(null, null))).toBe("open");
    expect(shiftStatus(row("2026-11-01T22:00:00Z", 0))).toBe("balanced");
    expect(shiftStatus(row("2026-11-01T22:00:00Z", 1500))).toBe("over");
    expect(shiftStatus(row("2026-11-01T22:00:00Z", -800))).toBe("short");
  });
  it("resume cuántos cuadraron y lo que sobró o faltó", () => {
    const s = summarizeShifts([row(null, null), row("a", 0), row("a", 2000), row("a", -500), row("a", -300)]);
    expect(s).toEqual({ total: 5, open: 1, balanced: 1, over: 2000, short: 800 });
  });
});
