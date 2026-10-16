import { describe, expect, it } from "vitest";
import { greetingFor, percentChange, previousBogotaMonth } from "./dashboard";

describe("previousBogotaMonth", () => {
  it("enero vuelve a diciembre del año anterior", () => {
    expect(previousBogotaMonth(new Date("2026-01-15T17:00:00Z"))).toEqual({ month: 12, year: 2025 });
  });
  it("usa la fecha de Bogotá, no la UTC", () => {
    // 1 de nov 03:00 UTC = 31 de oct 22:00 en Bogotá → mes anterior septiembre.
    expect(previousBogotaMonth(new Date("2026-11-01T03:00:00Z"))).toEqual({ month: 9, year: 2026 });
  });
});

describe("percentChange", () => {
  it("sin base no hay variación", () => expect(percentChange(10, 0)).toBeNull());
  it("redondea", () => expect(percentChange(112, 100)).toBe(12));
  it("con base negativa compara contra el valor absoluto", () => expect(percentChange(-50, -100)).toBe(50));
});

describe("greetingFor", () => {
  it("en hora de Bogotá", () => {
    expect(greetingFor(new Date("2026-10-16T14:00:00Z"))).toBe("Buenos días"); // 9:00
    expect(greetingFor(new Date("2026-10-16T20:00:00Z"))).toBe("Buenas tardes"); // 15:00
    expect(greetingFor(new Date("2026-10-17T02:00:00Z"))).toBe("Buenas noches"); // 21:00
  });
});
