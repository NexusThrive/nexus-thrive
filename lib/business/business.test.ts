import { describe, expect, it } from "vitest";
import { arqueo, expectedCash, replenishNeeded, validateCashMovement } from "./cash";
import { applyStock, stockLevel, validateStockMove } from "./inventory";
import { amountInWords, invoiceCode, invoiceTotal, validateLines } from "./invoice";
import { formatMoneyInput, liveFormat, parseMoney } from "./money";

describe("dinero en formato colombiano", () => {
  it("lee lo que escribe la persona", () => {
    expect(parseMoney("1.250.000")).toBe(1250000);
    expect(parseMoney("1.250")).toBe(1250);
    expect(parseMoney("1250000,5")).toBe(1250000.5);
    expect(parseMoney("1,250,000.50")).toBe(1250000.5);
    expect(parseMoney("$ 45.900")).toBe(45900);
    expect(parseMoney("12.5")).toBe(12.5);
    expect(parseMoney("")).toBeNull();
  });
  it("muestra puntos de miles y coma decimal", () => {
    expect(formatMoneyInput(1250000)).toBe("1.250.000");
    expect(formatMoneyInput(1250000.5, 2)).toBe("1.250.000,50");
    expect(liveFormat("1250000")).toBe("1.250.000");
    expect(liveFormat("1250000,509")).toBe("1.250.000,50");
  });
});

describe("caja menor", () => {
  it("saldo esperado y arqueo", () => {
    const e = expectedCash([
      { kind: "OPENING", amount: 200000 },
      { kind: "INCOME", amount: 50000 },
      { kind: "EXPENSE", amount: 30000 },
      { kind: "VOUCHER", amount: 20000 },
      { kind: "ADJUST", amount: -500 },
    ]);
    expect(e).toBe(199500);
    expect(arqueo(e, 199500).status).toBe("cuadra");
    expect(arqueo(e, 190000)).toMatchObject({ status: "falta", difference: -9500 });
    expect(replenishNeeded(300000, e)).toBe(100500);
  });
  it("no deja sacar más de lo que hay y pide beneficiario del vale", () => {
    expect(validateCashMovement({ kind: "EXPENSE", amount: 5000, description: "Café" }, 1000)).toMatch(/No hay suficiente/);
    expect(validateCashMovement({ kind: "VOUCHER", amount: 5000, description: "Transporte" }, 9000)).toMatch(/vale/);
    expect(validateCashMovement({ kind: "INCOME", amount: 5000, description: "Venta" }, 0)).toBeNull();
  });
});

describe("inventario", () => {
  it("aplica movimientos y alerta mínimos", () => {
    expect(applyStock(10, "SALE", 3)).toBe(7);
    expect(applyStock(10, "ADJUST", 4)).toBe(4);
    expect(validateStockMove(2, "OUT", 3)).toMatch(/Solo hay 2/);
    expect(stockLevel({ trackStock: true, stock: 2, minStock: 3 })).toBe("low");
    expect(stockLevel({ trackStock: true, stock: 0, minStock: 3 })).toBe("out");
  });
});

describe("recibos y cuentas de cobro", () => {
  it("totales, códigos y letras", () => {
    expect(invoiceTotal([{ description: "Mensualidad", quantity: 2, unitPrice: 80000 }, { description: "Toalla", quantity: 1, unitPrice: 15000.5 }])).toBe(175000.5);
    expect(invoiceCode("BILL", 42)).toBe("CC-000042");
    expect(validateLines([])).toMatch(/al menos/);
    expect(amountInWords(1250000)).toBe("un millón doscientos cincuenta mil pesos");
    expect(amountInWords(80000)).toBe("ochenta mil pesos");
    expect(amountInWords(2000000)).toBe("dos millones de pesos");
    expect(amountInWords(151)).toBe("ciento cincuenta y un pesos");
    expect(amountInWords(21000)).toBe("veintiún mil pesos");
  });
});

import { kindsForVertical, validateProduct } from "./catalog-kinds";

describe("catálogo por rubro", () => {
  const base = { kind: "PRODUCT" as const, name: "Proteína", description: "", sku: "", category: "", price: 120000, cost: 80000, trackStock: true, initialStock: 10, minStock: 3, unit: "", durationMinutes: null, durationDays: null, capacity: null, active: true };
  it("cada rubro usa sus tipos", () => {
    expect(kindsForVertical("gym")[0]).toBe("PLAN");
    expect(kindsForVertical("museum")).toContain("TICKET");
    expect(kindsForVertical("retail")).toEqual(["PRODUCT", "SERVICE"]);
  });
  it("valida precio y plan con vigencia", () => {
    expect(validateProduct(base).ok).toBe(true);
    expect(validateProduct({ ...base, price: null }).ok).toBe(false);
    expect(validateProduct({ ...base, kind: "PLAN", durationDays: null }).ok).toBe(false);
    expect(validateProduct({ ...base, capacity: 0 }).ok).toBe(false);
  });
});

import { COUNTRIES, joinPhone, searchCountries, splitPhone } from "./countries";

describe("indicativos de país", () => {
  it("Colombia primero y el resto alfabético", () => {
    expect(COUNTRIES[0].iso).toBe("CO");
    expect(COUNTRIES[1].name).toBe("Alemania");
    const names = COUNTRIES.slice(1).map((c) => c.name);
    expect([...names].sort((a, b) => a.localeCompare(b, "es"))).toEqual(names);
  });
  it("busca por nombre sin tildes o por número y separa el teléfono", () => {
    expect(searchCountries("peru")[0].iso).toBe("PE");
    expect(searchCountries("+593")[0].iso).toBe("EC");
    expect(splitPhone("+593 99 123 4567")).toMatchObject({ number: "991234567" });
    expect(splitPhone("+593 99 123 4567").country.iso).toBe("EC");
    expect(splitPhone("300 123 4567").country.iso).toBe("CO");
    expect(joinPhone(COUNTRIES[0], "300 123 4567")).toBe("+57 3001234567");
  });
});

import { bmi, cleanProfile, membershipTypeFor, profileFor } from "./customer-fields";

describe("ficha del cliente por rubro", () => {
  it("el gym pide foto, medidas y plan; otros rubros sus propios datos", () => {
    expect(profileFor("gym").photo).toBe(true);
    expect(profileFor("gym").fields.map((f) => f.key)).toContain("weightKg");
    expect(profileFor("tour_guides").title).toBe("Datos del viajero");
    expect(profileFor("retail").fields).toEqual([]);
  });
  it("limpia y valida el perfil", () => {
    expect(cleanProfile("gym", { weightKg: "72,5", heightCm: "170", goal: "Tonificar", otra: "x" })).toEqual({ ok: true, value: { weightKg: 72.5, heightCm: 170, goal: "Tonificar" } });
    expect(cleanProfile("gym", { weightKg: "900" }).ok).toBe(false);
    expect(cleanProfile("gym", { goal: "Volar" }).ok).toBe(false);
  });
  it("IMC y tipo de membresía", () => {
    expect(bmi(72.5, 170)).toEqual({ value: 25.1, label: "Sobrepeso" });
    expect(membershipTypeFor(30)).toBe("mensual");
    expect(membershipTypeFor(90)).toBe("trimestral");
    expect(membershipTypeFor(365)).toBe("anual");
  });
});

import { bogotaParts, bogotaToMs, capacityLeft, monthGrid, occupancy, reminderText, slotPosition, staffConflict, weekStart } from "./calendar";

describe("agenda", () => {
  it("cuadrícula del mes empieza en lunes", () => {
    const g = monthGrid(2026, 10); // octubre 2026: el 1 es jueves
    expect(g[0][0].day).toBe("2026-09-28");
    expect(g[0][3]).toEqual({ day: "2026-10-01", inMonth: true });
    expect(g.flat().filter((d) => d.inMonth)).toHaveLength(31);
    expect(weekStart("2026-10-18")).toBe("2026-10-12");
  });
  it("horario de Bogotá", () => {
    const ms = bogotaToMs("2026-10-17", "15:30");
    expect(new Date(ms).toISOString()).toBe("2026-10-17T20:30:00.000Z");
    expect(bogotaParts(ms)).toEqual({ day: "2026-10-17", hour: 15, minute: 30 });
    expect(slotPosition(ms, ms + 3_600_000, 6)).toEqual({ top: 570, height: 60 });
  });
  it("choques del responsable y cupo del servicio", () => {
    const h = (t: string) => bogotaToMs("2026-10-17", t);
    const existing = [
      { id: "a", start: h("09:00"), end: h("10:00"), staffUserId: "u1", productId: "yoga", partySize: 8 },
      { id: "b", start: h("09:30"), end: h("10:30"), staffUserId: "u2", productId: "yoga", partySize: 1, status: "CANCELLED" },
    ];
    expect(staffConflict({ start: h("09:30"), end: h("10:00"), staffUserId: "u1" }, existing)?.id).toBe("a");
    expect(staffConflict({ start: h("10:00"), end: h("11:00"), staffUserId: "u1" }, existing)).toBeNull();
    expect(capacityLeft({ start: h("09:00"), end: h("10:00"), productId: "yoga", partySize: 3 }, existing, 10)).toBe(-1);
    expect(occupancy(0, 8)).toBe(0);
    expect(occupancy(8, 8)).toBe(3);
  });
  it("texto del recordatorio", () => {
    expect(reminderText({ customer: "Valentina Ríos", service: "Yoga", start: bogotaToMs("2026-10-17", "18:00"), business: "Gym Carlos" })).toContain("sábado, 17 de octubre a las 6:00 p. m.");
  });
});

import { accessCode, checkAccess, countdown, freezePlan, membershipState } from "./gym";

describe("gimnasio", () => {
  const D = 86_400_000;
  const now = Date.UTC(2026, 9, 17, 15);
  const m = { id: "m1", start: now - 10 * D, end: now + 20 * D, frozenFrom: null, frozenUntil: null, cancelledAt: null };
  it("estado y acceso", () => {
    expect(membershipState(m, now)).toBe("active");
    expect(checkAccess([m], now)).toMatchObject({ allowed: true, daysLeft: 20 });
    expect(checkAccess([{ ...m, end: now - D }], now)).toMatchObject({ allowed: false, reason: expect.stringContaining("vencida") });
    expect(checkAccess([{ ...m, frozenFrom: now - D, frozenUntil: now + D }], now).reason).toContain("congelada");
    expect(checkAccess([], now).allowed).toBe(false);
    expect(checkAccess([{ ...m, end: now + 2 * D }], now).reason).toContain("vence en 2 días");
  });
  it("congelar corre el vencimiento", () => {
    const r = freezePlan(m, now, 15, now);
    expect(r.ok && r.newEnd).toBe(m.end + 15 * D);
    expect(freezePlan(m, now, 90, now).ok).toBe(false);
    expect(freezePlan({ ...m, end: now - D }, now, 5, now).ok).toBe(false);
  });
  it("contador y código", () => {
    expect(countdown(now + 2 * D + 3 * 3_600_000 + 5 * 60_000, now)).toEqual({ text: "2 d 03 h 05 min", urgent: true, expired: false });
    expect(countdown(now - 1, now).expired).toBe(true);
    expect(accessCode(() => 0)).toBe("AAAAAAAA");
  });
});
