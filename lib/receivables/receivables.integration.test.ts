import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { db } from "@/prisma/db";
import { createAdminDb } from "@/lib/admin/db";
import { createDocument } from "@/lib/business/documents-db";
import { receiveInvoicePayment, payInvoice, voidPayment } from "@/lib/business/money-service";
import { createParty } from "@/lib/parties/parties-db";
import { deleteTenantCompletely } from "@/lib/tenant/deletion";
import { payables, paySupplierInvoice, receivables } from "./receivables-db";

/** Cartera por cobrar y por pagar contra Postgres real y DOS negocios. */
const TEST_URL = process.env.TEST_DATABASE_URL;
const normalize = (url: string | undefined) => (url ?? "").replace(/\?.*$/, "");
const at = (d: string) => Temporal.Instant.from(`${d}T00:00:00Z`);

describe.skipIf(!TEST_URL)("cartera (integración)", () => {
  const suffix = Date.now().toString(36);
  let a = "";
  let b = "";
  const bill = (tenantId: string, total: number, dueDate: string | null) =>
    createDocument(tenantId, { kind: "BILL", customerId: null, customerName: "Cliente Uno", dueDate: dueDate ? at(dueDate) : null, lines: [{ description: "Servicio", quantity: 1, unitPrice: total }] }, null);

  beforeAll(async () => {
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) throw new Error("DATABASE_URL debe ser igual a TEST_DATABASE_URL.");
    const make = (name: string, slug: string) => createAdminDb().createTenant({ name, slug, vertical: "retail", modules: ["finance"], tenantType: "COMPANY", ownerEmail: `${slug}@ejemplo.com` });
    a = String((await make("Empresa A", `ca-a-${suffix}`)).id);
    b = String((await make("Empresa B", `ca-b-${suffix}`)).id);
  });
  afterAll(async () => {
    for (const id of [a, b]) if (id) await deleteTenantCompletely(id);
    await db.close();
  });

  test("un abono baja el saldo, el segundo la salda y la cartera la suma por antigüedad", async () => {
    const d1 = await bill(a, 1_000_000, "2026-09-01");
    const d2 = await bill(a, 500_000, "2027-12-31");
    let r = await receivables(a, "2026-10-24");
    expect(r.aging.total).toBe(1_500_000);
    expect(r.aging.buckets.d31_60).toEqual({ amount: 1_000_000, count: 1 });
    expect(r.aging.buckets.current).toEqual({ amount: 500_000, count: 1 });

    const first = await receiveInvoicePayment(a, d1.id, 400_000, "CASH", "u");
    expect(first).toMatchObject({ ok: true, balance: 600_000, settled: false });
    r = await receivables(a, "2026-10-24");
    expect(r.rows.find((x) => x.id === d1.id)).toMatchObject({ paid: 400_000, balance: 600_000 });
    expect(r.aging.total).toBe(1_100_000);

    expect(await receiveInvoicePayment(a, d1.id, 700_000, "CASH", "u")).toMatchObject({ ok: false, message: expect.stringContaining("mayor que el saldo") });
    expect(await receiveInvoicePayment(a, d1.id, 600_000, "TRANSFER", "u")).toMatchObject({ ok: true, balance: 0, settled: true });
    expect((await db.orm.public.Invoice.where({ tenantId: a, id: d1.id }).first())!.status).toBe("PAID");
    expect((await receivables(a, "2026-10-24")).rows.map((x) => x.id)).toEqual([d2.id]);
    expect(await receiveInvoicePayment(a, d1.id, 1, "CASH", "u")).toMatchObject({ ok: false });
    const payments = await db.orm.public.Payment.where({ tenantId: a, invoiceId: d1.id }).all();
    expect(payments.map((p) => Number(p.amount)).sort((x, y) => x - y)).toEqual([400_000, 600_000]);
  });

  test("pagar la cuenta con abonos previos cobra solo el saldo; anular un abono la reabre", async () => {
    const d = await bill(a, 100_000, null);
    await receiveInvoicePayment(a, d.id, 30_000, "CASH", "u");
    expect(await payInvoice(a, d.id, "CASH", "u")).toMatchObject({ paymentId: expect.any(String) });
    const pays = await db.orm.public.Payment.where({ tenantId: a, invoiceId: d.id }).all();
    expect(pays.map((p) => Number(p.amount)).sort((x, y) => x - y)).toEqual([30_000, 70_000]);
    const last = pays.find((p) => Number(p.amount) === 70_000)!;
    expect(await voidPayment(a, last.id, "error de caja", "u")).toMatchObject({ ok: true });
    const inv = await db.orm.public.Invoice.where({ tenantId: a, id: d.id }).first();
    expect(inv).toMatchObject({ status: "ISSUED" });
    expect(Number(inv!.paidTotal)).toBe(30_000);
    expect((await receivables(a)).rows.find((x) => x.id === d.id)?.balance).toBe(70_000);
  });

  test("abonos simultáneos no pasan del saldo", async () => {
    const d = await bill(a, 100_000, null);
    const results = await Promise.all(Array.from({ length: 5 }, () => receiveInvoicePayment(a, d.id, 30_000, "CASH", "u")));
    const ok = results.filter((r) => r.ok).length;
    const inv = await db.orm.public.Invoice.where({ tenantId: a, id: d.id }).first();
    expect(Number(inv!.paidTotal)).toBe(ok * 30_000);
    expect(ok).toBeLessThanOrEqual(3);
    expect(ok).toBeGreaterThanOrEqual(1);
  });

  test("por pagar: pago parcial, pago final y aislamiento entre negocios", async () => {
    const sup = await createParty(a, { legalName: "Proveedor Uno", roles: ["SUPPLIER"] });
    if (!sup.ok) throw new Error("tercero");
    const inv = await db.orm.public.SupplierInvoice.create({ tenantId: a, supplierPartyId: sup.party.id, number: "F-100", issueDate: "2026-09-01", dueDate: "2026-09-20", subtotal: "800.00", taxTotal: "0.00", total: "800.00", status: "REGISTERED" });
    let p = await payables(a, "2026-10-24");
    expect(p.rows[0]).toMatchObject({ party: "Proveedor Uno", balance: 800, bucket: "d31_60" });
    expect(await paySupplierInvoice(a, inv.id, { amount: 300, method: "TRANSFER" }, "u")).toMatchObject({ ok: true, balance: 500, settled: false });
    expect(await paySupplierInvoice(b, inv.id, { amount: 100, method: "CASH" }, "u")).toMatchObject({ ok: false }); // de otro negocio
    expect(await paySupplierInvoice(a, inv.id, { amount: 600, method: "CASH" }, "u")).toMatchObject({ ok: false });
    expect(await paySupplierInvoice(a, inv.id, { amount: 500, method: "CASH" }, "u")).toMatchObject({ ok: true, balance: 0, settled: true });
    p = await payables(a, "2026-10-24");
    expect(p.rows).toEqual([]);
    expect((await db.orm.public.SupplierPayment.where({ tenantId: a, supplierInvoiceId: inv.id }).all()).length).toBe(2);
    expect((await receivables(b)).rows).toEqual([]);
    expect((await payables(b)).rows).toEqual([]);
  });
});
