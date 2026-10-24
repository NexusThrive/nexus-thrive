import { describe, expect, test } from "vitest";
import { METERS, periodOf, secondsToNextPeriod } from "./meters";

describe("periodos de medición (hora de Colombia)", () => {
  test("el mes cambia a medianoche de Colombia, no de UTC", () => {
    expect(periodOf(Date.UTC(2026, 9, 31, 4, 59))).toBe("2026-10"); // 23:59 del 30-oct en Bogotá
    expect(periodOf(Date.UTC(2026, 9, 31, 5, 0))).toBe("2026-10"); // 00:00 del 31-oct
    expect(periodOf(Date.UTC(2026, 10, 1, 4, 59))).toBe("2026-10"); // 23:59 del 31-oct
    expect(periodOf(Date.UTC(2026, 10, 1, 5, 0))).toBe("2026-11"); // 00:00 del 1-nov
  });
  test("segundos hasta el mes siguiente", () => {
    expect(secondsToNextPeriod(Date.UTC(2026, 10, 1, 4, 59, 0))).toBe(60);
    expect(secondsToNextPeriod(Date.UTC(2026, 9, 31, 5, 0, 0))).toBe(86_400);
  });
  test("todos los medidores tienen cupo predeterminado positivo", () => {
    for (const m of Object.values(METERS)) expect(m.defaultMonthlyLimit).toBeGreaterThan(0);
  });
});
