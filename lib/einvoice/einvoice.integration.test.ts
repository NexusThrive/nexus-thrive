import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { db } from "@/prisma/db";
import { createAdminDb } from "@/lib/admin/db";
import { createDocument, issueAdjustmentNote } from "@/lib/business/documents-db";
import { createParty } from "@/lib/parties/parties-db";
import { deleteTenantCompletely } from "@/lib/tenant/deletion";
import { connectSandboxProvider, createSupportDocument, fiscalSettings, listFiscal, retryFiscal, setFiscalEnabled, submitPending } from "./einvoice-db";

/** Facturación electrónica por el puerto contra Postgres real y DOS negocios. */
const TEST_URL = process.env.TEST_DATABASE_URL;
const normalize = (url: string | undefined) => (url ?? "").replace(/\?.*$/, "");

describe.skipIf(!TEST_URL)("facturación electrónica (integración)", () => {
  const suffix = Date.now().toString(36);
  let a = "";
  let b = "";
  const sale = (tenantId: string, total: number, customerDoc: string | null = "1020304050") => createDocument(tenantId, { kind: "SALE", status: "PAID", customerId: null, customerName: "María Pérez", customerDoc, lines: [{ description: "Producto", quantity: 1, unitPrice: total }] }, null);

  beforeAll(async () => {
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) throw new Error("DATABASE_URL debe ser igual a TEST_DATABASE_URL.");
    const make = (name: string, slug: string) => createAdminDb().createTenant({ name, slug, vertical: "retail", modules: ["billing"], tenantType: "COMPANY", ownerEmail: `${slug}@ejemplo.com` });
    a = String((await make("Empresa A", `ei-a-${suffix}`)).id);
    b = String((await make("Empresa B", `ei-b-${suffix}`)).id);
    await db.orm.public.Tenant.where({ id: a }).update({ taxId: "900.123.456-7", legalName: "Empresa A S.A.S." });
  });
  afterAll(async () => {
    for (const id of [a, b]) if (id) await deleteTenantCompletely(id);
    await db.close();
  });

  test("sin la facturación activada no se genera nada", async () => {
    await sale(a, 10_000);
    expect(await listFiscal(a)).toEqual([]);
  });

  test("activada, cada venta deja su documento en cola (PENDING_PROVIDER) con emisor y adquirente, y vender nunca se bloquea", async () => {
    await setFiscalEnabled(a, true);
    const d = await sale(a, 119_000);
    const rows = await listFiscal(a);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ kind: "INVOICE", status: "PENDING_PROVIDER", total: 119_000, acquirer: "María Pérez" });
    const stored = await db.orm.public.FiscalDocument.where({ tenantId: a, invoiceId: d.id }).first();
    const p = stored!.payload as { issuer: { name: string; documentNumber: string }; acquirer: { documentNumber: string } };
    expect(p.issuer).toMatchObject({ name: "Empresa A S.A.S.", documentNumber: "9001234567" });
    expect(p.acquirer.documentNumber).toBe("1020304050");
    // Sin proveedor conectado, el envío no hace nada y todo sigue en espera.
    expect(await submitPending(a)).toEqual({ sent: 0, accepted: 0, rejected: 0 });
    expect((await fiscalSettings(a)).pending).toBe(1);
  });

  test("con el proveedor de prueba: acepta en orden, no duplica y rechaza con causa legible; corregir y reintentar acepta", async () => {
    await sale(a, 800_000, null); // sin documento del adquirente y ≥ umbral → rechazo de prueba
    await sale(a, 50_000);
    await connectSandboxProvider(a);
    const r = await submitPending(a);
    expect(r).toEqual({ sent: 3, accepted: 2, rejected: 1 });
    expect(await submitPending(a)).toEqual({ sent: 0, accepted: 0, rejected: 0 }); // idempotente
    const rows = await listFiscal(a);
    const rejected = rows.find((x) => x.status === "REJECTED")!;
    expect(rejected.rejectReason).toContain("número de documento");
    expect(rows.filter((x) => x.status === "ACCEPTED").every((x) => x.cufe && x.cufe.length === 64)).toBe(true);
    // Corrige: el documento del adquirente queda en la foto y se reintenta.
    const doc = await db.orm.public.FiscalDocument.where({ tenantId: a, id: rejected.id }).first();
    const fixed = { ...(doc!.payload as object), acquirer: { name: "María Pérez", documentNumber: "1020304050" } };
    await db.orm.public.FiscalDocument.where({ tenantId: a, id: rejected.id }).update({ payload: fixed as never });
    expect(await retryFiscal(a, rejected.id)).toEqual({ ok: true });
    expect(await submitPending(a)).toMatchObject({ accepted: 1 });
    expect(await retryFiscal(a, rejected.id)).toMatchObject({ ok: false }); // ya aceptado
  });

  test("las notas crédito y débito también generan su documento fiscal, ligado al original", async () => {
    const bill = await createDocument(a, { kind: "BILL", customerId: null, customerName: "Cliente", customerDoc: "55", lines: [{ description: "Servicio", quantity: 1, unitPrice: 100_000 }] }, null);
    await issueAdjustmentNote(a, { documentId: bill.id, kind: "CREDIT_NOTE", concept: "Descuento", amount: 10_000, taxRatePct: 0, reason: "Acuerdo" }, "u");
    await issueAdjustmentNote(a, { documentId: bill.id, kind: "DEBIT_NOTE", concept: "Intereses", amount: 5_000, taxRatePct: 0, reason: "Mora" }, "u");
    const rows = (await listFiscal(a)).filter((x) => x.kind !== "INVOICE");
    expect(rows.map((x) => x.kind).sort()).toEqual(["CREDIT_NOTE", "DEBIT_NOTE"]);
    const note = await db.orm.public.FiscalDocument.where({ tenantId: a, kind: "CREDIT_NOTE" }).first();
    expect((note!.payload as { relatedCode: string }).relatedCode).toMatch(/^CC-/);
  });

  test("documento soporte desde una factura de proveedor, una sola vez, y aislamiento entre negocios", async () => {
    const sup = await createParty(a, { legalName: "Don Pedro (no obligado)", documentType: "CC", documentNumber: "7777", roles: ["SUPPLIER"] });
    if (!sup.ok) throw new Error("tercero");
    const inv = await db.orm.public.SupplierInvoice.create({ tenantId: a, supplierPartyId: sup.party.id, number: "CUENTA-55", issueDate: "2026-10-20", subtotal: "200000.00", taxTotal: "0.00", total: "200000.00", status: "REGISTERED" });
    const r = await createSupportDocument(a, inv.id);
    expect(r).toMatchObject({ ok: true });
    expect(await createSupportDocument(a, inv.id)).toMatchObject({ ok: false, message: expect.stringContaining("ya tiene") });
    const doc = await db.orm.public.FiscalDocument.where({ tenantId: a, kind: "SUPPORT_DOCUMENT" }).first();
    expect((doc!.payload as { issuer: { name: string }; acquirer: { documentNumber: string } }).issuer.name).toBe("Don Pedro (no obligado)");
    expect(await createSupportDocument(b, inv.id)).toMatchObject({ ok: false });
    expect(await listFiscal(b)).toEqual([]);
    expect(await retryFiscal(b, doc!.id)).toMatchObject({ ok: false });
  });
});
