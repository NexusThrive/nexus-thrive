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
