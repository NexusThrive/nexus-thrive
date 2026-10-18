import { describe, expect, test } from "vitest";
import { bestCopAmount, extractCopAmounts, guessPaymentMethod, parseQrPaymentPayload } from "./payment-scan";

describe("extractCopAmounts", () => {
  test("lee montos con $ y separadores de miles", () => {
    expect(extractCopAmounts("Valor pagado: $ 150.000 COP")).toEqual(["150000"]);
  });

  test("ordena de mayor a menor y quita duplicados", () => {
    expect(extractCopAmounts("$50.000 Saldo 12.500 Total 50.000")).toEqual(["50000", "12500"]);
  });

  test("acepta enteros largos propios de Nequi", () => {
    expect(extractCopAmounts("Pago recibido 35000 de JUAN")).toEqual(["35000"]);
  });

  test("ignora texto sin montos", () => {
    expect(extractCopAmounts("Comprobante no encontrado")).toEqual([]);
  });
});

describe("bestCopAmount", () => {
  test("el monto más grande es el que el comprobante pone en grande", () => {
    expect(bestCopAmount("Fecha 18/10 valor $ 250.000,00")).toBe("250000");
  });

  test("prefiere el número con $ aunque haya uno más grande (celular, referencia)", () => {
    expect(bestCopAmount("Celular 3001234567\nEnviado a JUAN\n$ 45.000")).toBe("45000");
  });

  test("prefiere el número con $ antes de una referencia más larga", () => {
    expect(bestCopAmount("NEQUI\nComprobante 84123456789012\n$ 80.000\nfeliz día")).toBe("80000");
  });

  test("sin $ usa palabras clave como 'total'/'valor'", () => {
    expect(bestCopAmount("Documento 1020567890\nTotal 120.000\nAutorización 999888777")).toBe("120000");
  });

  test("el $ puede ir separado por espacio o en línea previa", () => {
    expect(bestCopAmount("Pagaste $\n55.500 a Comercio")).toBe("55500");
  });

  test("null sin candidatos", () => {
    expect(bestCopAmount("sin datos")).toBeNull();
  });
});

describe("guessPaymentMethod", () => {
  test.each([
    ["Pago Nequi exitoso", "NEQUI"],
    ["Transferencia bancolombia ahorros", "TRANSFER"],
    ["Pago con Wompi - aprobado", "WOMPI"],
    ["Recibido en efectivo", "CASH"],
    ["Comprobante genérico", null],
  ] as const)("%j → %j", (text, expected) => {
    expect(guessPaymentMethod(text)).toBe(expected);
  });
});

describe("parseQrPaymentPayload", () => {
  test("payload estilo Nequi con query string", () => {
    const r = parseQrPaymentPayload("nequi://pay?amount=85000&ref=ABC123");
    expect(r).toEqual({ amount: "85000", method: "NEQUI", reference: "ABC123" });
  });

  test("payload JSON", () => {
    const r = parseQrPaymentPayload('{"amount":120000,"transaction":"TX-9","bank":"Bancolombia"}');
    expect(r.amount).toBe("120000");
    expect(r.method).toBe("TRANSFER");
    expect(r.reference).toBe("TX-9");
  });

  test("texto llano de comprobante", () => {
    const r = parseQrPaymentPayload("Pago Nequi por $ 45.500");
    expect(r).toEqual({ amount: "45500", method: "NEQUI", reference: null });
  });

  test("payload ilegible no inventa datos", () => {
    expect(parseQrPaymentPayload("")).toEqual({ amount: null, method: null, reference: null });
    expect(parseQrPaymentPayload("hola-mundo")).toEqual({ amount: null, method: null, reference: null });
  });
});
