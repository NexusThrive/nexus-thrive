import { describe, expect, it } from "vitest";
import { effectiveStatus, newReference, parseReport, payButtonHtml, reconcile, validateIntent } from "./intents";

describe("cobros en línea", () => {
  it("el código del enlace es largo, legible y distinto cada vez", () => {
    const codes = new Set(Array.from({ length: 200 }, newReference));
    expect(codes.size).toBe(200);
    for (const c of codes) expect(c).toMatch(/^[a-hjkmnp-z2-9]{14}$/);
  });
  it("un pendiente pasado de plazo se ve vencido; lo demás no cambia", () => {
    const now = Date.parse("2026-10-24T12:00:00Z");
    expect(effectiveStatus("PENDING", "2026-10-24T11:00:00Z", now)).toBe("EXPIRED");
    expect(effectiveStatus("PENDING", "2026-10-25T11:00:00Z", now)).toBe("PENDING");
    expect(effectiveStatus("PAID", "2026-10-01T00:00:00Z", now)).toBe("PAID");
  });
  it("valida valor, descripción y vigencia", () => {
    expect(validateIntent({ amount: 50_000, description: "Matrícula", expiresInHours: 48 })).toBeNull();
    expect(validateIntent({ amount: 500, description: "Matrícula", expiresInHours: 48 })).toContain("mínimo");
    expect(validateIntent({ amount: 50_000, description: "x", expiresInHours: 48 })).toContain("qué se está cobrando");
    expect(validateIntent({ amount: 50_000, description: "Matrícula", expiresInHours: 0 })).toContain("vigencia");
  });
  it("la conciliación marca lo que falta de cada lado y el monto distinto", () => {
    const r = reconcile(
      [{ externalId: "a", amount: 100 }, { externalId: "b", amount: 200 }, { externalId: "c", amount: 300 }],
      [{ externalId: "a", amount: 100 }, { externalId: "b", amount: 250 }, { externalId: "d", amount: 50 }],
    );
    expect(r.matched).toBe(1);
    expect(r.differences).toEqual([
      { kind: "amount_mismatch", externalId: "b", expected: 200, reported: 250 },
      { kind: "missing_in_provider", externalId: "c", expected: 300, reported: null },
      { kind: "missing_in_nexus", externalId: "d", expected: null, reported: 50 },
    ]);
    expect(r.expectedTotal).toBe(600);
    expect(r.reportedTotal).toBe(400);
    expect(reconcile([{ externalId: "a", amount: 1 }], [{ externalId: "a", amount: 1 }]).differences).toEqual([]);
  });
  it("lee el reporte pegado con o sin encabezado y avisa de líneas ilegibles", () => {
    expect(parseReport("id,valor\ntx1,150.000\ntx2;80000\n\nmalo\n")).toEqual({ rows: [{ externalId: "tx1", amount: 150000 }, { externalId: "tx2", amount: 80000 }], bad: [5] });
  });
  it("el botón de pago apunta al enlace", () => {
    expect(payButtonHtml("https://x.co/pay/abc")).toContain('href="https://x.co/pay/abc"');
  });
});
