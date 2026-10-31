import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { db } from "@/prisma/db";
import { createAdminDb } from "@/lib/admin/db";
import { deleteTenantCompletely } from "@/lib/tenant/deletion";
import { createDocument, documentView, issueAdjustmentNote } from "./documents-db";

/** Notas crédito y débito sobre un documento, contra Postgres real y DOS negocios. */
const TEST_URL = process.env.TEST_DATABASE_URL;
const normalize = (url: string | undefined) => (url ?? "").replace(/\?.*$/, "");

describe.skipIf(!TEST_URL)("notas crédito y débito (integración)", () => {
  const suffix = Date.now().toString(36);
  let a = "";
  let b = "";
  let billId = "";

  beforeAll(async () => {
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) throw new Error("DATABASE_URL debe ser igual a TEST_DATABASE_URL.");
    const make = (name: string, slug: string) => createAdminDb().createTenant({ name, slug, vertical: "retail", modules: ["billing"], tenantType: "COMPANY", ownerEmail: `${slug}@ejemplo.com` });
    a = String((await make("Empresa A", `nt-a-${suffix}`)).id);
    b = String((await make("Empresa B", `nt-b-${suffix}`)).id);
    billId = (await createDocument(a, { kind: "BILL", customerId: null, customerName: "Cliente Uno", lines: [{ description: "Asesoría", quantity: 1, unitPrice: 1_000_000, taxRatePct: 19 }] }, null)).id;
  });
  afterAll(async () => {
    for (const id of [a, b]) if (id) await deleteTenantCompletely(id);
    await db.close();
  });

  test("la nota débito suma, la crédito resta con tope y ambas apuntan al documento", async () => {
    const debit = await issueAdjustmentNote(a, { documentId: billId, kind: "DEBIT_NOTE", concept: "Intereses de mora", amount: 100_000, taxRatePct: 0, reason: "Pago tardío" }, "u");
    expect(debit).toMatchObject({ ok: true, total: 100_000 });
    // El documento vale 1.190.000 + 100.000 de débito = 1.290.000 para créditos.
    expect(await issueAdjustmentNote(a, { documentId: billId, kind: "CREDIT_NOTE", concept: "Descuento", amount: 1_300_000, taxRatePct: 0, reason: "Exceso" }, "u")).toMatchObject({ ok: false, message: expect.stringContaining("no puede pasar") });
    const credit = await issueAdjustmentNote(a, { documentId: billId, kind: "CREDIT_NOTE", concept: "Descuento por pronto pago", amount: 200_000, taxRatePct: 19, reason: "Acuerdo comercial" }, "u");
    expect(credit).toMatchObject({ ok: true, total: 238_000 });
    const view = (await documentView(a, billId))!;
    expect(view.related.map((r) => r.kind).sort()).toEqual(["CREDIT_NOTE", "DEBIT_NOTE"]);
    const note = (await documentView(a, (credit as { id: string }).id))!;
    expect(note).toMatchObject({ kind: "CREDIT_NOTE", total: 238_000, notes: "Acuerdo comercial" });
    expect(note.source).toMatchObject({ id: billId });
    expect(note.code).toMatch(/^NC-/);
    expect(view.code).toMatch(/^CC-/);
  });

  test("validaciones, notas sobre notas y aislamiento entre negocios", async () => {
    expect(await issueAdjustmentNote(a, { documentId: billId, kind: "DEBIT_NOTE", concept: "x", amount: 10, taxRatePct: 0, reason: "Motivo" }, "u")).toMatchObject({ ok: false, message: expect.stringContaining("concepto") });
    expect(await issueAdjustmentNote(a, { documentId: billId, kind: "DEBIT_NOTE", concept: "Cargo", amount: 0, taxRatePct: 0, reason: "Motivo" }, "u")).toMatchObject({ ok: false });
    const note = await db.orm.public.Invoice.where({ tenantId: a, kind: "DEBIT_NOTE" }).first();
    expect(await issueAdjustmentNote(a, { documentId: note!.id, kind: "CREDIT_NOTE", concept: "Cargo", amount: 10, taxRatePct: 0, reason: "Motivo" }, "u")).toMatchObject({ ok: false, message: expect.stringContaining("no se le puede hacer") });
    expect(await issueAdjustmentNote(b, { documentId: billId, kind: "DEBIT_NOTE", concept: "Cargo", amount: 10, taxRatePct: 0, reason: "Motivo" }, "u")).toMatchObject({ ok: false });
    expect(await documentView(b, billId)).toBeNull();
  });
});
