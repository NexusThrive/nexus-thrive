import { describe, expect, test } from "vitest";
import { addMonths, bogotaToday, formatPlainDate, parsePlainDate } from "@/lib/plain-date";

describe("parsePlainDate", () => {
  test("acepta YYYY-MM-DD válidas", () => {
    expect(parsePlainDate("2026-10-30")).toEqual({ year: 2026, month: 10, day: 30 });
    expect(parsePlainDate(" 2024-02-29 ")).toEqual({ year: 2024, month: 2, day: 29 });
  });

  test("rechaza formatos y fechas inexistentes", () => {
    for (const bad of ["2026-1-15", "15-01-2026", "invalid", "2026-02-30", "2026-13-01", "2026-00-10", "2026-01-00", "2025-02-29", ""]) {
      expect(parsePlainDate(bad), bad).toBeNull();
    }
    expect(parsePlainDate(null)).toBeNull();
    expect(parsePlainDate(20261030)).toBeNull();
  });
});

describe("formatPlainDate", () => {
  test("rellena mes y día con cero y es inversa de parsePlainDate", () => {
    const date = { year: 2026, month: 1, day: 5 };
    expect(formatPlainDate(date)).toBe("2026-01-05");
    expect(parsePlainDate(formatPlainDate(date))).toEqual(date);
  });
});

describe("addMonths", () => {
  test("suma meses calendario", () => {
    expect(addMonths({ year: 2026, month: 10, day: 30 }, 1)).toEqual({ year: 2026, month: 11, day: 30 });
    expect(addMonths({ year: 2026, month: 11, day: 15 }, 3)).toEqual({ year: 2027, month: 2, day: 15 });
    expect(addMonths({ year: 2026, month: 1, day: 10 }, 12)).toEqual({ year: 2027, month: 1, day: 10 });
  });

  test("ajusta al último día del mes destino", () => {
    expect(addMonths({ year: 2026, month: 1, day: 31 }, 1)).toEqual({ year: 2026, month: 2, day: 28 });
    expect(addMonths({ year: 2024, month: 1, day: 31 }, 1)).toEqual({ year: 2024, month: 2, day: 29 });
    expect(addMonths({ year: 2026, month: 3, day: 31 }, 1)).toEqual({ year: 2026, month: 4, day: 30 });
  });

  test("retrocede con meses negativos", () => {
    expect(addMonths({ year: 2026, month: 3, day: 31 }, -1)).toEqual({ year: 2026, month: 2, day: 28 });
    expect(addMonths({ year: 2026, month: 1, day: 15 }, -2)).toEqual({ year: 2025, month: 11, day: 15 });
  });
});

describe("bogotaToday", () => {
  test("usa el día de Bogotá (UTC−5), no el de UTC", () => {
    // 03:00 UTC del 1 de enero = 22:00 del 31 de diciembre en Bogotá.
    expect(bogotaToday("2026-01-01T03:00:00Z")).toEqual({ year: 2025, month: 12, day: 31 });
    expect(bogotaToday("2026-01-01T05:00:00Z")).toEqual({ year: 2026, month: 1, day: 1 });
  });

  test("acepta Date y cadenas con nueve decimales (Temporal)", () => {
    expect(bogotaToday(new Date("2026-06-15T12:00:00Z"))).toEqual({ year: 2026, month: 6, day: 15 });
    expect(bogotaToday("2026-06-15T12:00:00.123456789Z")).toEqual({ year: 2026, month: 6, day: 15 });
  });

  test("sin argumento devuelve una fecha válida", () => {
    const today = bogotaToday();
    expect(parsePlainDate(formatPlainDate(today))).toEqual(today);
  });
});
