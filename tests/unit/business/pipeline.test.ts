import { describe, expect, test } from "vitest";
import { activityState, cardChip, columnBar, parseMoney, shortMoney, sortCards, validateQuick } from "@/lib/business/growth/pipeline";

// 7 nov 2026, 3:00 p. m. en Bogotá.
const NOW = Date.parse("2026-11-07T20:00:00Z");

describe("pipeline del CRM", () => {
  test("estado de la actividad por día de Bogotá", () => {
    expect(activityState(Date.parse("2026-11-07T23:30:00Z"), NOW)).toBe("today");
    expect(activityState(Date.parse("2026-11-08T04:00:00Z"), NOW)).toBe("today"); // 11 p. m. del 7 en Bogotá
    expect(activityState(Date.parse("2026-11-05T15:00:00Z"), NOW)).toBe("overdue");
    expect(activityState(Date.parse("2026-11-12T15:00:00Z"), NOW)).toBe("planned");
  });

  test("chip de la tarjeta", () => {
    expect(cardChip({ won: false, orderPaid: null, next: { kind: "CALL", dueAt: "2026-11-07T22:00:00Z" } }, NOW)).toEqual({ text: "Llamar hoy", tone: "today" });
    expect(cardChip({ won: false, orderPaid: null, next: { kind: "CALL", dueAt: "2026-11-05T15:00:00Z" } }, NOW)).toEqual({ text: "Vencida · 2 d", tone: "overdue" });
    expect(cardChip({ won: false, orderPaid: null, next: { kind: "MEETING", dueAt: "2026-11-12T15:00:00Z" } }, NOW).text).toMatch(/^Reunión · jue/);
    expect(cardChip({ won: false, orderPaid: null, next: null }, NOW)).toEqual({ text: "Sin actividad", tone: "planned" });
    expect(cardChip({ won: true, orderPaid: false, next: null }, NOW).text).toBe("Pedido creado");
    expect(cardChip({ won: true, orderPaid: true, next: null }, NOW).text).toBe("Cobrado");
  });

  test("barra de la columna suma 100 y vacía queda en cero", () => {
    const bar = columnBar([{ won: false, next: { dueAt: "2026-11-12T15:00:00Z" } }, { won: false, next: { dueAt: "2026-11-07T22:00:00Z" } }, { won: false, next: null }], NOW);
    expect(Math.round(bar.planned + bar.today + bar.overdue + bar.none)).toBe(100);
    expect(bar.overdue).toBe(0);
    expect(columnBar([], NOW)).toEqual({ planned: 0, today: 0, overdue: 0, none: 0 });
  });

  test("orden: manual, luego estrellas y actividad más próxima", () => {
    const base = { createdAt: "2026-11-01T00:00:00Z" };
    const rows = sortCards([
      { id: "a", position: null, priority: 1, next: null, ...base },
      { id: "b", position: null, priority: 3, next: { dueAt: "2026-11-09T00:00:00Z" }, ...base },
      { id: "c", position: null, priority: 3, next: { dueAt: "2026-11-08T00:00:00Z" }, ...base },
      { id: "d", position: 1, priority: 0, next: null, ...base },
    ]);
    expect(rows.map((r) => r.id)).toEqual(["d", "c", "b", "a"]);
  });

  test("dinero corto y lectura de valores", () => {
    expect(shortMoney(9_600_000)).toBe("$9,6 M");
    expect(shortMoney(850_000)).toBe("$850 mil");
    expect(shortMoney(0)).toBe("$0");
    expect(parseMoney("4.800.000")).toBe(4_800_000);
    expect(parseMoney("$ 4,8 M")).toBe(4_800_000);
    expect(parseMoney("")).toBeNull();
    expect(parseMoney("abc")).toBeNull();
  });

  test("creación rápida: solo el nombre es obligatorio", () => {
    expect(validateQuick({ name: "", value: "", email: "", phone: "" })).toEqual({ name: "Escribe el nombre de la oportunidad" });
    expect(validateQuick({ name: "Uniformes", value: "", email: "", phone: "" })).toEqual({});
    expect(validateQuick({ name: "Uniformes", value: "x", email: "mal", phone: "12" })).toMatchObject({ value: expect.any(String), email: expect.any(String), phone: expect.any(String) });
  });
});
