import { describe, test, expect } from "vitest";

import {
  calculatePpc,
  getNonComplianceBreakdown,
  isoWeekOf,
  relativeWeekNumber,
  bogotaToday,
  mondayOf,
  addDays,
  daysBetween,
  weekWindowDates,
  currentWindowStart,
  formatPlainDate,
  parsePlainDate,
  type PlainDate,
  type CommitmentStatusValue,
  type NonComplianceCauseValue,
  WINDOW_WEEKS,
} from "./lean-engine";

describe("lean-engine — PPC (excluye PENDING del denominador, redondeo entero)", () => {
  test("PPC = completed / (completed + failed) × 100 redondeado a entero", () => {
    const commitments = [
      { status: "COMPLETED" as CommitmentStatusValue },
      { status: "COMPLETED" as CommitmentStatusValue },
      { status: "FAILED" as CommitmentStatusValue },
      { status: "PENDING" as CommitmentStatusValue },
      { status: "PENDING" as CommitmentStatusValue },
    ];
    const result = calculatePpc(commitments);
    // 2 completed, 1 failed, 2 pending → evaluados = 3, ppc = round(2/3 × 100) = 67
    expect(result.completed).toBe(2);
    expect(result.failed).toBe(1);
    expect(result.pending).toBe(2);
    expect(result.evaluated).toBe(3);
    expect(result.ppc).toBe(67);
  });

  test("PPC = 0 cuando no hay evaluados", () => {
    const commitments = [
      { status: "PENDING" as CommitmentStatusValue },
      { status: "PENDING" as CommitmentStatusValue },
    ];
    const result = calculatePpc(commitments);
    expect(result.evaluated).toBe(0);
    expect(result.ppc).toBe(0);
    expect(result.completed).toBe(0);
    expect(result.failed).toBe(0);
  });

  test("PPC = 100 cuando todos completados", () => {
    const commitments = [
      { status: "COMPLETED" as CommitmentStatusValue },
      { status: "COMPLETED" as CommitmentStatusValue },
    ];
    const result = calculatePpc(commitments);
    expect(result.ppc).toBe(100);
  });

  test("PPC = 0 cuando todos fallidos", () => {
    const commitments = [
      { status: "FAILED" as CommitmentStatusValue },
      { status: "FAILED" as CommitmentStatusValue },
    ];
    const result = calculatePpc(commitments);
    expect(result.ppc).toBe(0);
  });
});

describe("lean-engine — CNC breakdown (entries, no items)", () => {
  test("agrupa FAILED por causa e incluye 'Sin causa registrada'", () => {
    const commitments = [
      { status: "FAILED" as CommitmentStatusValue, failureCause: "WEATHER" as NonComplianceCauseValue },
      { status: "FAILED" as CommitmentStatusValue, failureCause: "WEATHER" as NonComplianceCauseValue },
      { status: "FAILED" as CommitmentStatusValue, failureCause: "MATERIALS" as NonComplianceCauseValue },
      { status: "FAILED" as CommitmentStatusValue, failureCause: null },
      { status: "COMPLETED" as CommitmentStatusValue, failureCause: null },
    ];
    const cnc = getNonComplianceBreakdown(commitments);
    expect(cnc.total).toBe(4);
    expect(cnc.entries).toHaveLength(3);
    const byCause = new Map(cnc.entries.map(e => [e.cause, e.count]));
    expect(byCause.get("WEATHER")).toBe(2);
    expect(byCause.get("MATERIALS")).toBe(1);
    expect(byCause.get(null)).toBe(1); // "Sin causa registrada"
  });

  test("vacío cuando no hay FAILED", () => {
    const commitments = [
      { status: "COMPLETED" as CommitmentStatusValue, failureCause: null },
      { status: "PENDING" as CommitmentStatusValue, failureCause: null },
    ];
    const cnc = getNonComplianceBreakdown(commitments);
    expect(cnc.total).toBe(0);
    expect(cnc.entries).toHaveLength(0);
  });
});

describe("lean-engine — fechas Bogotá y semanas ISO", () => {
  test("bogotaToday devuelve fecha en zona America/Bogota", () => {
    const today = bogotaToday();
    expect(today).toHaveProperty("year");
    expect(today).toHaveProperty("month");
    expect(today).toHaveProperty("day");
    expect(today.month).toBeGreaterThanOrEqual(1);
    expect(today.month).toBeLessThanOrEqual(12);
    expect(today.day).toBeGreaterThanOrEqual(1);
    expect(today.day).toBeLessThanOrEqual(31);
  });

  test("isoWeekOf: 2026-01-01 (jueves) → semana 1, año 2026", () => {
    const date: PlainDate = { year: 2026, month: 1, day: 1 };
    const { year, week } = isoWeekOf(date);
    expect(year).toBe(2026);
    expect(week).toBe(1);
  });

  test("isoWeekOf: 2025-12-31 (miércoles) → semana 1, año 2026 (borde año)", () => {
    const date: PlainDate = { year: 2025, month: 12, day: 31 };
    const { year, week } = isoWeekOf(date);
    expect(year).toBe(2026);
    expect(week).toBe(1);
  });

  test("isoWeekOf: 2026-12-31 (jueves) → semana 53, año 2026", () => {
    const date: PlainDate = { year: 2026, month: 12, day: 31 };
    const { year, week } = isoWeekOf(date);
    expect(year).toBe(2026);
    expect(week).toBe(53);
  });

  test("relativeWeekNumber: dentro de ventana 1..6", () => {
    const windowStart: PlainDate = { year: 2026, month: 1, day: 5 }; // lunes
    const date: PlainDate = { year: 2026, month: 1, day: 5 };       // mismo lunes
    expect(relativeWeekNumber(windowStart, date)).toBe(1);

    const date2: PlainDate = { year: 2026, month: 1, day: 12 };     // lunes siguiente
    expect(relativeWeekNumber(windowStart, date2)).toBe(2);

    const date3: PlainDate = { year: 2026, month: 2, day: 9 };      // semana 6
    expect(relativeWeekNumber(windowStart, date3)).toBe(6);
  });

  test("relativeWeekNumber: fuera de ventana devuelve <=0 o >6", () => {
    const windowStart: PlainDate = { year: 2026, month: 1, day: 5 };
    const before: PlainDate = { year: 2025, month: 12, day: 29 };
    expect(relativeWeekNumber(windowStart, before)).toBeLessThanOrEqual(0);

    const after: PlainDate = { year: 2026, month: 2, day: 16 };
    expect(relativeWeekNumber(windowStart, after)).toBeGreaterThan(6);
  });

  test("weekWindowDates devuelve { start, end } para la semana", () => {
    const start: PlainDate = { year: 2026, month: 1, day: 5 };
    const dates = weekWindowDates(start, 1);
    expect(dates).toHaveProperty("start");
    expect(dates).toHaveProperty("end");
    expect(dates.start).toEqual({ year: 2026, month: 1, day: 5 });
    expect(dates.end).toEqual({ year: 2026, month: 1, day: 11 });
  });

  test("currentWindowStart devuelve lunes de la semana actual (Bogotá)", () => {
    const start = currentWindowStart();
    expect(start).toHaveProperty("year");
    expect(start).toHaveProperty("month");
    expect(start).toHaveProperty("day");
  });

  test("formatPlainDate / parsePlainDate roundtrip", () => {
    const date: PlainDate = { year: 2026, month: 1, day: 15 };
    const formatted = formatPlainDate(date);
    expect(formatted).toBe("2026-01-15");
    const parsed = parsePlainDate(formatted);
    expect(parsed).toEqual(date);
  });

  test("parsePlainDate rechaza formatos inválidos", () => {
    expect(parsePlainDate("2026-1-15")).toBeNull();
    expect(parsePlainDate("15-01-2026")).toBeNull();
    expect(parsePlainDate("invalid")).toBeNull();
    expect(parsePlainDate(null)).toBeNull();
  });

  test("WINDOW_WEEKS = 6", () => {
    expect(WINDOW_WEEKS).toBe(6);
  });
});

describe("lean-engine — helpers de fecha", () => {
  test("mondayOf devuelve el lunes de la semana", () => {
    const wed: PlainDate = { year: 2026, month: 1, day: 14 }; // miércoles
    const mon = mondayOf(wed);
    expect(mon).toEqual({ year: 2026, month: 1, day: 12 });
  });

  test("addDays suma/rest días correctamente", () => {
    const date: PlainDate = { year: 2026, month: 1, day: 30 };
    expect(addDays(date, 2)).toEqual({ year: 2026, month: 2, day: 1 });
    expect(addDays(date, -5)).toEqual({ year: 2026, month: 1, day: 25 });
  });

  test("daysBetween calcula diferencia en días", () => {
    const a: PlainDate = { year: 2026, month: 1, day: 1 };
    const b: PlainDate = { year: 2026, month: 1, day: 10 };
    expect(daysBetween(a, b)).toBe(9);
    expect(daysBetween(b, a)).toBe(-9);
  });
});
