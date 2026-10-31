import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { db } from "@/prisma/db";
import { createAdminDb } from "@/lib/admin/db";
import { deleteTenantCompletely } from "@/lib/tenant/deletion";
import { bogotaDayKey } from "@/lib/finance/series";
import { recordCharge } from "./charge";
import { convertDocument, createDocument, salesOfDay } from "./documents-db";
import { createInvoice } from "./invoices-db";
import { payInvoice, recordIncomeNow, sellProduct, voidPayment } from "./money-service";

/**
 * Documento comercial unificado (Bloque B, paso 2), contra Postgres:
 * - una venta de mostrador, una entrada de taquilla y una membresía dejan el
 *   mismo tipo de documento (SALE);
 * - el informe del día sale de una sola tabla;
 * - anular emite una nota crédito (una sola, aunque se anule dos veces);
 * - los consecutivos no se repiten con cobros simultáneos.
 */
const TEST_URL = process.env.TEST_DATABASE_URL;
const normalize = (url: string | undefined) => (url ?? "").replace(/\?.*$/, "");

describe.skipIf(!TEST_URL)("documento comercial unificado (integración)", () => {
  const suffix = Date.now().toString(36);
  const user = `user_doc_${suffix}`;
  let tenantId = "";
  let productId = "";
  const today = bogotaDayKey(Date.now());

  const docs = (where: Record<string, unknown> = {}) => db.orm.public.Invoice.where({ tenantId, ...where }).all();

  beforeAll(async () => {
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) {
      throw new Error("Estas pruebas exigen una base aparte: DATABASE_URL=$TEST_DATABASE_URL.");
    }
    const tenant = await createAdminDb().createTenant({
      name: "Negocio Documentos",
      slug: `docs-${suffix}`,
      vertical: "museum",
      modules: [],
      tenantType: "COMPANY",
      ownerEmail: `dueno.docs.${suffix}@ejemplo.com`,
    });
    tenantId = String(tenant.id);
    const product = await db.orm.public.Product.create({ tenantId, name: "Camiseta", kind: "PRODUCT", price: "35000.00", trackStock: false, active: true });
    productId = product.id;
  });

  afterAll(async () => {
    if (tenantId) await deleteTenantCompletely(tenantId);
    await db.close();
  });

  test("mostrador, taquilla y membresía dejan el mismo documento de venta", async () => {
    const sale = await sellProduct(tenantId, { productId, name: "Camiseta", price: 35000, trackStock: false, quantity: 2, method: "CASH", customerId: null }, user);
    expect(sale.ok).toBe(true);
    await recordCharge(tenantId, { amount: 18000, method: "CASH", description: "2 entradas · 10:00", sourceType: "TICKET_SALE", sourceId: "venta-taquilla" }, user);
    await recordCharge(tenantId, { amount: 120000, method: "NEQUI", description: "Membresía mensual — renovación", sourceType: "MEMBERSHIP", sourceId: "membresia-1" }, user);

    const sales = await docs({ kind: "SALE" });
    expect(sales).toHaveLength(3);
    expect(sales.map((d) => d.originType).sort()).toEqual(["MEMBERSHIP", "SALE", "TICKET_SALE"]);
    expect(sales.every((d) => d.status === "PAID" && d.paymentId)).toBe(true);

    // La línea de la venta de mostrador lleva producto, cantidad y precio.
    const counter = sales.find((d) => d.originType === "SALE")!;
    const lines = await db.orm.public.InvoiceLine.where({ invoiceId: counter.id }).all();
    expect(lines).toHaveLength(1);
    expect(lines[0].productId).toBe(productId);
    expect(Number(lines[0].quantity)).toBe(2);
    expect(Number(counter.total)).toBe(70000);

    expect(await salesOfDay(tenantId, today)).toEqual({ gross: 208000, credits: 0, net: 208000, documents: 3 });
  });

  test("anular emite una nota crédito (una sola) y el informe la descuenta", async () => {
    const income = await recordIncomeNow(tenantId, { amount: 50000, method: "CASH", description: "Venta para anular" }, user);
    expect(income.documentId).not.toBeNull();
    const results = await Promise.all([
      voidPayment(tenantId, income.paymentId, "Error de digitación", user),
      voidPayment(tenantId, income.paymentId, "Error de digitación", user),
    ]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);

    const notes = await docs({ kind: "CREDIT_NOTE" });
    expect(notes).toHaveLength(1);
    expect(notes[0].sourceDocumentId).toBe(income.documentId);
    expect(Number(notes[0].total)).toBe(50000);
    expect((await db.orm.public.Invoice.where({ tenantId, id: income.documentId! }).first())?.status).toBe("VOID");

    expect(await salesOfDay(tenantId, today)).toEqual({ gross: 258000, credits: 50000, net: 208000, documents: 4 });
  });

  test("cobros simultáneos reciben documentos con consecutivos distintos", async () => {
    const before = (await docs({ kind: "SALE" })).length;
    await Promise.all(
      Array.from({ length: 5 }, (_, i) => recordIncomeNow(tenantId, { amount: 1000 + i, method: "CASH", description: `Café ${i}` }, user)),
    );
    const numbers = (await docs({ kind: "SALE" })).map((d) => d.number).sort((a, b) => a - b);
    expect(numbers).toHaveLength(before + 5);
    expect(new Set(numbers).size).toBe(numbers.length);
    expect(numbers).toEqual(Array.from({ length: numbers.length }, (_, i) => i + 1));
  });

  test("una cuenta de cobro pagada no duplica el documento y cuenta como venta", async () => {
    const bill = await createInvoice(
      tenantId,
      { kind: "BILL", customerId: null, customerName: "Colegio", customerDoc: null, issueDate: today, dueDate: null, notes: null, lines: [{ description: "Visita guiada", quantity: 1, unitPrice: 300000 }] },
      user,
    );
    const salesBefore = (await docs({ kind: "SALE" })).length;
    expect(await payInvoice(tenantId, bill.id, "TRANSFER", user)).not.toBeNull();
    expect((await docs({ kind: "SALE" })).length).toBe(salesBefore);
    const report = await salesOfDay(tenantId, today);
    expect(report.gross).toBeGreaterThanOrEqual(300000);
  });

  test("cotización → pedido → cuenta de cobro, con descuento e IVA, sin saltarse pasos", async () => {
    const quote = await createDocument(
      tenantId,
      {
        kind: "QUOTE",
        customerId: null,
        customerName: "Empresa ABC",
        lines: [{ description: "Recorrido corporativo", quantity: 10, unitPrice: 20000, discountPct: 10, taxRatePct: 19 }],
      },
      user,
    );
    // 200.000 − 10 % = 180.000 + IVA 34.200 = 214.200
    expect(quote.total).toBe(214200);
    const stored = await db.orm.public.Invoice.where({ tenantId, id: quote.id }).first();
    expect([Number(stored?.subtotal), Number(stored?.discountTotal), Number(stored?.taxTotal)]).toEqual([200000, 20000, 34200]);

    const order = await convertDocument(tenantId, quote.id, "ORDER", user);
    expect(order.ok).toBe(true);
    if (!order.ok) return;
    const bill = await convertDocument(tenantId, order.id, "BILL", user);
    expect(bill.ok).toBe(true);
    if (!bill.ok) return;
    expect(bill.total).toBe(214200);
    expect((await db.orm.public.Invoice.where({ tenantId, id: bill.id }).first())?.sourceDocumentId).toBe(order.id);

    // Una cuenta de cobro no vuelve a ser cotización.
    expect((await convertDocument(tenantId, bill.id, "QUOTE", user)).ok).toBe(false);
  });

  test("otro negocio no convierte ni ve estos documentos", async () => {
    const quote = await createDocument(tenantId, { kind: "QUOTE", customerId: null, customerName: "X", lines: [{ description: "Algo", quantity: 1, unitPrice: 1000 }] }, user);
    const r = await convertDocument("00000000-0000-0000-0000-000000000000", quote.id, "ORDER", user);
    expect(r.ok).toBe(false);
  });
});
