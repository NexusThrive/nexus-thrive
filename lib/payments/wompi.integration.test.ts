import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { db } from "@/prisma/db";
import { createAdminDb } from "@/lib/admin/db";
import { encryptCredentials } from "@/lib/providers/connections";
import { receiveProviderWebhook } from "@/lib/providers/inbound";
import { wompiChecksum } from "@/lib/providers/wompi";
import { deleteTenantCompletely } from "@/lib/tenant/deletion";
import { todayCO } from "@/lib/tax/tax";
import { createIntent, listIntents, publicIntent, runReconciliation } from "./intents-db";

/** Wompi de punta a punta (webhook firmado → cobro confirmado → conciliación), contra Postgres real. */
const TEST_URL = process.env.TEST_DATABASE_URL;
const normalize = (url: string | undefined) => (url ?? "").replace(/\?.*$/, "");
const EVENTS = "secreto-de-eventos";

describe.skipIf(!TEST_URL)("pago de prueba con Wompi (integración)", () => {
  const suffix = Date.now().toString(36);
  let a = "";
  let connectionId = "";
  const wompiEvent = (txId: string, status: string, reference: string, cents: number, secret = EVENTS) => {
    const body: Record<string, unknown> = { event: "transaction.updated", data: { transaction: { id: txId, status, amount_in_cents: cents, reference, currency: "COP" } }, timestamp: 1_700_000_000, signature: { properties: ["transaction.id", "transaction.status", "transaction.amount_in_cents"], checksum: "" } };
    (body.signature as { checksum: string }).checksum = wompiChecksum(body, secret);
    return receiveProviderWebhook({ provider: "wompi", connectionId, rawBody: JSON.stringify(body), headers: new Headers() });
  };

  beforeAll(async () => {
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) throw new Error("DATABASE_URL debe ser igual a TEST_DATABASE_URL.");
    process.env.WEBHOOK_ENCRYPTION_KEY = "d".repeat(64);
    a = String((await createAdminDb().createTenant({ name: "Empresa Wompi", slug: `wp-${suffix}`, vertical: "retail", modules: ["payments"], tenantType: "COMPANY", ownerEmail: `wp-${suffix}@ejemplo.com` })).id);
    connectionId = (await db.orm.public.ExternalConnection.create({ tenantId: a, kind: "PAYMENT", provider: "wompi", environment: "sandbox", status: "CONNECTED", credentialsEnc: encryptCredentials({ publicKey: "pub_test_x", integritySecret: "int", eventsSecret: EVENTS }), credentialsKeyId: "v1" })).id;
  });
  afterAll(async () => {
    if (a) await deleteTenantCompletely(a);
    await db.close();
  });

  test("PENDING no confirma; APPROVED sí, una sola vez aunque Wompi lo notifique de nuevo; firma mala no guarda nada", async () => {
    const i = await createIntent(a, { amount: 99_900, description: "Plan trimestral", provider: "wompi" }, "u");
    if (!i.ok) throw new Error(i.message);
    expect(await wompiEvent("tx-1", "PENDING", i.reference, 9_990_000)).toMatchObject({ status: 200, body: { ignored: true } });
    expect((await publicIntent(i.reference))!.status).toBe("PENDING");
    expect(await wompiEvent("tx-1", "APPROVED", i.reference, 9_990_000, "otro-secreto")).toMatchObject({ status: 401 });
    expect(await wompiEvent("tx-1", "APPROVED", i.reference, 9_990_000)).toMatchObject({ status: 200, body: { received: true, processed: true } });
    expect(await wompiEvent("tx-1", "APPROVED", i.reference, 9_990_000)).toMatchObject({ status: 200, body: { duplicate: true } });
    const row = (await listIntents(a)).find((x) => x.reference === i.reference)!;
    expect(row).toMatchObject({ status: "PAID", confirmedBy: "PROVIDER", provider: "wompi" });
    expect((await db.orm.public.Payment.where({ tenantId: a }).all()).filter((p) => p.status === "APPROVED")).toHaveLength(1);
  });

  test("un pago rechazado deja el cobro fallido y la conciliación cuadra con el id de Wompi", async () => {
    const bad = await createIntent(a, { amount: 40_000, description: "Rechazado", provider: "wompi" }, "u");
    if (!bad.ok) throw new Error(bad.message);
    await wompiEvent("tx-2", "DECLINED", bad.reference, 4_000_000);
    expect((await publicIntent(bad.reference))!.status).toBe("FAILED");
    const r = await runReconciliation(a, "wompi", todayCO(), [{ externalId: "tx-1", amount: 99_900 }], "u");
    if (!r.ok) throw new Error(r.message);
    expect(r.result).toMatchObject({ matched: 1, differences: [] });
  });
});
