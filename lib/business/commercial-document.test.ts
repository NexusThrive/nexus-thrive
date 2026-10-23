import { describe, expect, test } from "vitest";
import {
  canConvert,
  documentCode,
  documentTotals,
  lineAmounts,
  salesSummary,
  validateDocumentLines,
} from "./commercial-document";

describe("documento comercial unificado", () => {
  test("código por tipo con su consecutivo", () => {
    expect(documentCode("SALE", 42)).toBe("V-000042");
    expect(documentCode("CREDIT_NOTE", 3)).toBe("NC-000003");
    expect(documentCode("QUOTE", 1)).toBe("C-000001");
  });

  test("cadena: cotización → pedido → cuenta de cobro → nota crédito", () => {
    expect(canConvert("QUOTE", "ORDER")).toBe(true);
    expect(canConvert("ORDER", "BILL")).toBe(true);
    expect(canConvert("BILL", "CREDIT_NOTE")).toBe(true);
    expect(canConvert("SALE", "CREDIT_NOTE")).toBe(true);
    // Lo emitido no vuelve atrás ni se convierte en otra cosa.
    expect(canConvert("BILL", "QUOTE")).toBe(false);
    expect(canConvert("SALE", "BILL")).toBe(false);
    expect(canConvert("CREDIT_NOTE", "SALE")).toBe(false);
  });

  test("línea con descuento e IVA", () => {
    // 3 × 10.000 = 30.000; 10 % = 3.000; gravable 27.000; IVA 19 % = 5.130.
    expect(lineAmounts({ description: "Corte", quantity: 3, unitPrice: 10000, discountPct: 10, taxRatePct: 19 })).toEqual({
      base: 30000,
      discount: 3000,
      taxable: 27000,
      tax: 5130,
      total: 32130,
    });
  });

  test("totales del documento suman las líneas redondeadas", () => {
    const totals = documentTotals([
      { description: "A", quantity: 1, unitPrice: 0.333, taxRatePct: 19 },
      { description: "B", quantity: 2, unitPrice: 1000 },
    ]);
    expect(totals).toEqual({ subtotal: 2000.33, discountTotal: 0, taxTotal: 0.06, total: 2000.39 });
  });

  test("sin descuento ni impuesto, igual que la cuenta de cobro de antes", () => {
    expect(documentTotals([{ description: "Obra", quantity: 2, unitPrice: 150000 }]).total).toBe(300000);
  });

  test("valida las líneas", () => {
    expect(validateDocumentLines([])).toMatch(/al menos un concepto/);
    expect(validateDocumentLines([{ description: "x", quantity: 1, unitPrice: 1 }])).toMatch(/descripción/);
    expect(validateDocumentLines([{ description: "Café", quantity: 0, unitPrice: 1 }])).toMatch(/cantidad/);
    expect(validateDocumentLines([{ description: "Café", quantity: 1, unitPrice: 1, discountPct: 120 }])).toMatch(/descuento/);
    expect(validateDocumentLines([{ description: "Café", quantity: 1, unitPrice: 1, taxRatePct: -1 }])).toMatch(/impuesto/);
    expect(validateDocumentLines([{ description: "Café", quantity: 1, unitPrice: 1, discountPct: 5, taxRatePct: 19 }])).toBeNull();
  });

  test("informe: ventas y cuentas pagadas, menos notas crédito", () => {
    expect(
      salesSummary([
        { kind: "SALE", status: "PAID", total: 20000 },
        { kind: "SALE", status: "VOID", total: 5000 }, // anulada: su nota crédito la descuenta
        { kind: "CREDIT_NOTE", status: "ISSUED", total: 5000 },
        { kind: "BILL", status: "PAID", total: 100000 },
        { kind: "BILL", status: "ISSUED", total: 70000 }, // aún sin pagar: no es venta
        { kind: "QUOTE", status: "ISSUED", total: 900000 },
      ]),
    ).toEqual({ gross: 125000, credits: 5000, net: 120000, documents: 3 });
  });
});
