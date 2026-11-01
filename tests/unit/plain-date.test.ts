import { describe, expect, test } from "vitest";
import { addMonths, bogotaDay, bogotaToday, formatPlainDate, parsePlainDate, todayCO } from "@/lib/plain-date";

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

describe("bogotaDay (fecha de negocio en Colombia)", () => {
  // Bogotá es UTC−5 todo el año (sin horario de verano): 05:00Z es la medianoche local.
  test.each([
    ["justo antes de la medianoche de Bogotá", "2026-10-31T04:59:59.999Z", "2026-10-30"],
    ["justo en la medianoche de Bogotá", "2026-10-31T05:00:00.000Z", "2026-10-31"],
    ["medianoche UTC = 19:00 del día anterior en Bogotá (la franja del defecto)", "2026-10-31T00:00:00Z", "2026-10-30"],
    ["las 23:30 de Bogotá siguen siendo el mismo día", "2026-10-31T04:30:00Z", "2026-10-30"],
    ["cambio de mes: último segundo de octubre", "2026-11-01T04:59:59Z", "2026-10-31"],
    ["cambio de mes: primer instante de noviembre", "2026-11-01T05:00:00Z", "2026-11-01"],
    ["cambio de año: 31 de diciembre a las 22:00 de Bogotá", "2026-01-01T03:00:00Z", "2025-12-31"],
    ["cambio de año: 1 de enero a la medianoche de Bogotá", "2026-01-01T05:00:00Z", "2026-01-01"],
    ["año bisiesto: 29 de febrero a las 23:59 de Bogotá", "2028-03-01T04:59:00Z", "2028-02-29"],
    ["año no bisiesto: 28 de febrero a las 23:59 de Bogotá", "2027-03-01T04:59:00Z", "2027-02-28"],
    ["convención de fechas escritas a mano (12:00 UTC = 07:00 Bogotá)", "2026-10-31T12:00:00Z", "2026-10-31"],
    ["nueve decimales, como los entrega Temporal", "2026-10-31T04:59:59.123456789Z", "2026-10-30"],
  ])("%s", (_nombre, iso, esperado) => {
    expect(bogotaDay(iso)).toBe(esperado);
  });

  test("acepta Date y Temporal.Instant, y NO cae en «hoy» con un Instant", () => {
    expect(bogotaDay(new Date("2026-11-01T04:59:59Z"))).toBe("2026-10-31");
    expect(bogotaDay(Temporal.Instant.from("2026-11-01T04:59:59Z"))).toBe("2026-10-31");
    expect(bogotaDay(Temporal.Instant.from("2020-03-01T12:00:00Z"))).toBe("2020-03-01");
    expect(bogotaToday(Temporal.Instant.from("2020-03-01T12:00:00Z"))).toEqual({ year: 2020, month: 3, day: 1 });
  });

  test("cortar el instante UTC con slice daría otro día: es el defecto que esta función evita", () => {
    const instant = "2026-10-31T00:30:00Z";
    expect(instant.slice(0, 10)).toBe("2026-10-31");
    expect(bogotaDay(instant)).toBe("2026-10-30");
  });
});

describe("todayCO (el día de Bogotá de un instante en milisegundos)", () => {
  /** La fórmula anterior de lib/tax/tax.ts: restar 5 horas al instante UTC y cortar. */
  const anterior = (now: number) => new Date(now - 5 * 3_600_000).toISOString().slice(0, 10);

  test("da el mismo día que la fórmula anterior en una barrida de instantes, incluidos los límites de día, mes y año", () => {
    const limites = ["2026-01-01T04:59:59.999Z", "2026-01-01T05:00:00.000Z", "2026-11-01T04:59:59.999Z", "2026-11-01T05:00:00.000Z", "2028-03-01T04:59:59.999Z", "2028-03-01T05:00:00.000Z", "1999-12-31T23:59:59.999Z"].map(Date.parse);
    for (const ms of limites) expect(todayCO(ms), new Date(ms).toISOString()).toBe(anterior(ms));
    // Barrida cada 7 h 13 min durante cuatro años (cubre todas las horas del día y varios cambios de mes y año).
    for (let ms = Date.parse("2025-01-01T00:00:00Z"); ms < Date.parse("2029-01-01T00:00:00Z"); ms += 7 * 3_600_000 + 13 * 60_000) {
      if (todayCO(ms) !== anterior(ms)) throw new Error(`difiere en ${new Date(ms).toISOString()}: ${todayCO(ms)} ≠ ${anterior(ms)}`);
    }
  });

  test("sin argumento usa el instante actual", () => {
    expect(todayCO()).toBe(bogotaDay(new Date()));
  });
});

describe("bogotaDay() equivale al antiguo todayBogota() de Operaciones (V10 · M4)", () => {
  /** La fórmula que tenía lib/platform/crm/leads.ts: formato en-CA con la zona de Bogotá. */
  const anterior = (ms: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date(ms));

  test("da el mismo día en los límites de día, mes y año y en una barrida de cuatro años", () => {
    const limites = ["2026-01-01T04:59:59.999Z", "2026-01-01T05:00:00.000Z", "2026-11-01T04:59:59.999Z", "2026-11-01T05:00:00.000Z", "2028-03-01T04:59:59.999Z", "2028-03-01T05:00:00.000Z", "1999-12-31T23:59:59.999Z"].map(Date.parse);
    for (const ms of limites) expect(bogotaDay(new Date(ms)), new Date(ms).toISOString()).toBe(anterior(ms));
    for (let ms = Date.parse("2025-01-01T00:00:00Z"); ms < Date.parse("2029-01-01T00:00:00Z"); ms += 7 * 3_600_000 + 13 * 60_000) {
      if (bogotaDay(new Date(ms)) !== anterior(ms)) throw new Error(`difiere en ${new Date(ms).toISOString()}`);
    }
  });

  test("sin argumento es el día de hoy en Bogotá", () => {
    expect(bogotaDay()).toBe(anterior(Date.now()));
  });
});

