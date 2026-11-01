import { describe, expect, it } from "vitest";
import { escposBytes, receiptLines, type ReceiptData } from "./receipt";

const data: ReceiptData = {
  business: "Simplapp Gym", taxId: "900123456-7", code: "V-000042", date: "2026-10-24 10:30", cashier: "Ana",
  lines: [{ description: "Proteína whey 2 lb", quantity: 2, unitPrice: 100_000, discountPct: 10, total: 214_200 }, { description: "Barra", quantity: 3, unitPrice: 5_000, total: 15_000 }],
  subtotal: 215_000, discountTotal: 20_000, taxTotal: 34_200, total: 229_200, tip: 5_000,
  payments: [{ method: "NEQUI", amount: 129_200 }, { method: "CASH", amount: 105_000 }], change: 0,
};

describe("tiquete", () => {
  it("cabe en el ancho de la impresora y trae lo importante", () => {
    for (const w of [32, 42] as const) {
      const lines = receiptLines(data, w);
      expect(lines.every((l) => l.length <= w)).toBe(true);
      const text = lines.join("\n");
      expect(text).toContain("V-000042");
      expect(text).toContain("TOTAL");
      expect(text).toContain("229.200");
      expect(text).toContain("Propina");
      expect(text).toContain("Nequi");
      expect(text).toContain("(-10%)");
    }
  });
  it("sin propina, descuentos ni cambio no los imprime", () => {
    const text = receiptLines({ ...data, tip: 0, discountTotal: 0, change: 0 }).join("\n");
    expect(text).not.toContain("Propina");
    expect(text).not.toContain("Descuentos");
    expect(text).not.toContain("Cambio");
  });
  it("ESC/POS: reinicia, imprime sin tildes y corta", () => {
    const b = escposBytes(["Proteína ¡hola!"]);
    expect([...b.slice(0, 2)]).toEqual([0x1b, 0x40]);
    expect([...b.slice(-3)]).toEqual([0x1d, 0x56, 0x00]);
    expect(new TextDecoder().decode(b.slice(2, -3))).toBe("Proteina hola!\n\n\n");
  });
});
