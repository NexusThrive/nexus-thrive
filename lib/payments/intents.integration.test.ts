import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { db } from "@/prisma/db";
import { createAdminDb } from "@/lib/admin/db";
import { createDocument } from "@/lib/business/documents-db";
import { encryptCredentials } from "@/lib/providers/connections";
import { receiveProviderWebhook } from "@/lib/providers/inbound";
import { sandboxSignature } from "@/lib/providers/sandbox";
import { deleteTenantCompletely } from "@/lib/tenant/deletion";
import { todayCO } from "@/lib/tax/tax";
import { cancelIntent, confirmIntent, createIntent, listIntents, listReconciliations, publicIntent, refundIntent, runReconciliation } from "./intents-db";

/** Cobros en línea contra Postgres real y DOS negocios, con webhook sandbox firmado. */
const TEST_URL = process.env.TEST_DATABASE_URL;
const normalize = (url: string | undefined) => (url ?? "").replace(/\?.*$/, "");
const SECRET = "secreto-de-prueba";

describe.skipIf(!TEST_URL)("cobros en línea (integración)", () => {
  const suffix = Date.now().toString(36);
  let a = "";
  let b = "";
  let connectionId = "";
  const hook = (body: object, secret = SECRET) => {
    const raw = JSON.stringify(body);
    return receiveProviderWebhook({ provider: "sandbox", connectionId, rawBody: raw, headers: new Headers({ "x-sandbox-signature": sandboxSignature(secret, raw) }) });
  };
  const paid = async (tenantId: string) => (await db.orm.public.Payment.where({ tenantId }).all()).filter((p) => p.status === "APPROVED");

  beforeAll(async () => {
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) throw new Error("DATABASE_URL debe ser igual a TEST_DATABASE_URL.");
    process.env.WEBHOOK_ENCRYPTION_KEY = "d".repeat(64);
    const make = (name: string, slug: string) => createAdminDb().createTenant({ name, slug, vertical: "retail", modules: ["payments", "billing"], tenantType: "COMPANY", ownerEmail: `${slug}@ejemplo.com` });
    a = String((await make("Empresa A", `pi-a-${suffix}`)).id);
    b = String((await make("Empresa B", `pi-b-${suffix}`)).id);
    const c = await db.orm.public.ExternalConnection.create({ tenantId: a, kind: "PAYMENT", provider: "sandbox", environment: "sandbox", status: "CONNECTED", credentialsEnc: encryptCredentials({ webhookSecret: SECRET }), credentialsKeyId: "v1" });
    connectionId = c.id;
  });
  afterAll(async () => {
    for (const id of [a, b]) if (id) await deleteTenantCompletely(id);
    await db.close();
  });

  test("webhook firmado confirma el cobro una sola vez aunque llegue repetido, y queda el ingreso", async () => {
    const intent = await createIntent(a, { amount: 150_000, description: "Matrícula anual" }, "u");
    if (!intent.ok) throw new Error(intent.message);
    expect(await publicIntent(intent.reference)).toMatchObject({ amount: 150_000, status: "PENDING", description: "Matrícula anual" });
    expect(await hook({ id: "evt_1", type: "payment.succeeded", reference: intent.reference, amount: "150000" })).toMatchObject({ status: 200, body: { received: true, processed: true } });
    expect(await hook({ id: "evt_1", type: "payment.succeeded", reference: intent.reference, amount: "150000" })).toMatchObject({ status: 200, body: { duplicate: true } });
    // Otro id de evento para el mismo cobro (reintento del proveedor): sigue sin duplicar el ingreso.
    await hook({ id: "evt_1b", type: "payment.succeeded", reference: intent.reference, amount: "150000" });
    const pays = await paid(a);
    expect(pays.length).toBe(1);
    expect(Number(pays[0]!.amount)).toBe(150_000);
    expect((await publicIntent(intent.reference))!.status).toBe("PAID");
    expect((await listIntents(a))[0]).toMatchObject({ status: "PAID", confirmedBy: "PROVIDER" });
  });

  test("firma inválida no guarda nada; monto distinto no confirma; el enlace público no revela otras cosas", async () => {
    const intent = await createIntent(a, { amount: 80_000, description: "Mensualidad" }, "u");
    if (!intent.ok) throw new Error(intent.message);
    expect(await hook({ id: "evt_bad", type: "payment.succeeded", reference: intent.reference, amount: "80000" }, "otro-secreto")).toMatchObject({ status: 401 });
    expect(await db.orm.public.ProviderEvent.where({ tenantId: a, externalId: "evt_bad" }).first()).toBeNull();
    await hook({ id: "evt_amt", type: "payment.succeeded", reference: intent.reference, amount: "1000" });
    expect((await publicIntent(intent.reference))!.status).toBe("PENDING");
    const ev = await db.orm.public.ProviderEvent.where({ tenantId: a, externalId: "evt_amt" }).first();
    expect(ev!.error).toContain("no coincide");
    expect(await publicIntent("no-existe-para-nada")).toBeNull();
    expect(await cancelIntent(a, (await listIntents(a)).find((i) => i.reference === intent.reference)!.id)).toBe(true);
    expect(await confirmIntent(a, intent.reference, { kind: "MANUAL", evidence: "ref 123456", userId: "u" })).toMatchObject({ ok: false });
  });

  test("cobro de una cuenta de cobro: baja el saldo y el reembolso parcial lo devuelve", async () => {
    const bill = await createDocument(a, { kind: "BILL", customerId: null, customerName: "Cliente", lines: [{ description: "Servicio", quantity: 1, unitPrice: 500_000 }] }, null);
    const intent = await createIntent(a, { amount: 200_000, description: "Abono", invoiceId: bill.id }, "u");
    if (!intent.ok) throw new Error(intent.message);
    expect(await createIntent(a, { amount: 600_000, description: "Demasiado", invoiceId: bill.id }, "u")).toMatchObject({ ok: false });
    expect(await confirmIntent(a, intent.reference, { kind: "MANUAL", evidence: "Transferencia 998877", userId: "u" })).toMatchObject({ ok: true, already: false });
    expect(await confirmIntent(a, intent.reference, { kind: "MANUAL", evidence: "Transferencia 998877", userId: "u" })).toMatchObject({ ok: true, already: true });
    expect(Number((await db.orm.public.Invoice.where({ tenantId: a, id: bill.id }).first())!.paidTotal)).toBe(200_000);
    const row = (await listIntents(a)).find((i) => i.reference === intent.reference)!;
    expect(await refundIntent(a, row.id, 300_000, "Error", "u")).toMatchObject({ ok: false, message: expect.stringContaining("Solo se puede reembolsar 200.000") });
    expect(await refundIntent(a, row.id, 50_000, "Cliente se arrepintió", "u")).toMatchObject({ ok: true, remaining: 150_000 });
    expect(await refundIntent(a, row.id, 150_000, "Resto", "u")).toMatchObject({ ok: true, remaining: 0 });
    expect(Number((await db.orm.public.Invoice.where({ tenantId: a, id: bill.id }).first())!.paidTotal)).toBe(0);
    expect(await refundIntent(a, row.id, 1, "Otro", "u")).toMatchObject({ ok: false });
  });

  test("conciliación: marca la diferencia sembrada (monto distinto, falta de cada lado)", async () => {
    const day = todayCO();
    const mk = async (amount: number, ext: string, desc: string) => {
      const i = await createIntent(a, { amount, description: desc }, "u");
      if (!i.ok) throw new Error(i.message);
      await hook({ id: ext, type: "payment.succeeded", reference: i.reference, amount: String(amount) });
    };
    await mk(30_000, "rec_ok", "Conciliable uno");
    await mk(45_000, "rec_dif", "Conciliable dos");
    const r = await runReconciliation(a, "sandbox", day, [{ externalId: "rec_ok", amount: 30_000 }, { externalId: "rec_dif", amount: 44_000 }, { externalId: "rec_extra", amount: 9_000 }, { externalId: "evt_1", amount: 150_000 }, { externalId: "evt_1b", amount: 0 }].filter((x) => x.externalId !== "evt_1b"), "u");
    if (!r.ok) throw new Error(r.message);
    const kinds = r.result.differences.map((d) => `${d.kind}:${d.externalId}`).sort();
    expect(kinds).toEqual(["amount_mismatch:rec_dif", "missing_in_nexus:rec_extra"]);
    expect(r.result.matched).toBe(2); // rec_ok y evt_1
    expect((await listReconciliations(a))[0]).toMatchObject({ day, matched: 2 });
    expect((await listReconciliations(b))).toEqual([]); // el otro negocio no ve la corrida
  });

  test("aislamiento: el negocio B no confirma, reembolsa ni ve cobros de A", async () => {
    const intent = await createIntent(a, { amount: 60_000, description: "Solo de A" }, "u");
    if (!intent.ok) throw new Error(intent.message);
    expect(await confirmIntent(b, intent.reference, { kind: "MANUAL", evidence: "ref 111111", userId: "x" })).toMatchObject({ ok: false });
    expect(await listIntents(b)).toEqual([]);
    expect(await createIntent(b, { amount: 5_000, description: "Cliente ajeno", customerId: "00000000-0000-0000-0000-000000000000" }, "x")).toMatchObject({ ok: false });
  });
});
