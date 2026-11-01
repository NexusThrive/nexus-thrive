import { describe, expect, it } from "vitest";
import { buildFiscalPayload, contentProblems, fiscalKindOf } from "./payload";
import { SANDBOX_ACQUIRER_THRESHOLD, sandboxEInvoice } from "./sandbox";

const base = (over: Partial<Parameters<typeof buildFiscalPayload>[0]> = {}) =>
  buildFiscalPayload({
    kind: "INVOICE", documentKind: "SALE", code: "V-000042", number: 42, issueDate: "2026-10-24",
    issuer: { name: "Simplapp", documentNumber: "900123456" }, acquirer: { name: "María Pérez", documentNumber: "1020304050" },
    lines: [{ description: "Proteína", quantity: 1, unitPrice: 100_000, discountPct: 0, taxRatePct: 19, total: 119_000 }],
    totals: { subtotal: 100_000, discountTotal: 0, taxTotal: 19_000, total: 119_000 }, ...over,
  });

describe("documento fiscal", () => {
  it("qué se factura: ventas y notas sí; cotizaciones y pedidos no", () => {
    expect(["SALE", "BILL", "RECEIPT", "CREDIT_NOTE", "DEBIT_NOTE", "QUOTE", "ORDER"].map(fiscalKindOf)).toEqual(["INVOICE", "INVOICE", "INVOICE", "CREDIT_NOTE", "DEBIT_NOTE", null, null]);
  });
  it("la foto trae emisor, adquirente, líneas y totales", () => {
    const p = base();
    expect(p).toMatchObject({ kind: "INVOICE", code: "V-000042", currency: "COP", issuer: { documentNumber: "900123456" }, acquirer: { name: "María Pérez" }, total: 119_000 });
    expect(contentProblems(p)).toEqual([]);
  });
  it("detecta lo que el proveedor rechazaría", () => {
    expect(contentProblems(base({ issuer: { name: "Sin NIT" } }))).toEqual([expect.stringContaining("NIT del emisor")]);
    expect(contentProblems(base({ acquirer: { name: " " }, totals: { subtotal: 0, discountTotal: 0, taxTotal: 0, total: 0 } })).length).toBe(2);
  });
});

describe("proveedor de prueba", () => {
  it("acepta con referencia y CUFE y es determinista", async () => {
    const a = await sandboxEInvoice.submit(base());
    const b = await sandboxEInvoice.submit(base());
    expect(a).toMatchObject({ status: "ACCEPTED", cufe: expect.stringMatching(/^[0-9a-f]{64}$/) });
    expect(a).toEqual(b);
  });
  it("rechaza con causa legible", async () => {
    const r = await sandboxEInvoice.submit(base({ acquirer: { name: "Cliente" }, totals: { subtotal: SANDBOX_ACQUIRER_THRESHOLD, discountTotal: 0, taxTotal: 0, total: SANDBOX_ACQUIRER_THRESHOLD } }));
    expect(r).toMatchObject({ status: "REJECTED", reason: expect.stringContaining("número de documento") });
    expect(await sandboxEInvoice.submit(base({ issuer: { name: "Sin NIT" } }))).toMatchObject({ status: "REJECTED", reason: expect.stringContaining("NIT") });
  });
});
