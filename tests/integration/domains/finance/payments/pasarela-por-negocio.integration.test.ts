import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { db } from "@/prisma/db";
import { createAdminDb } from "@/lib/platform/admin/db";
import { connectedGateways, createIntent } from "@/lib/domains/finance/payments/intents-db";
import { disconnectProvider, listConnections } from "@/lib/integrations/providers/connections";
import { encryptCredentials } from "@/lib/integrations/providers/connections";
import { deleteTenantCompletely } from "@/lib/core/tenancy/deletion";

/** HU-wompi-negocio-01: cada negocio cobra con su propia pasarela; sin pasarela, el cobro es manual. */
const TEST_URL = process.env.TEST_DATABASE_URL;
const normalize = (url: string | undefined) => (url ?? "").replace(/\?.*$/, "");

describe.skipIf(!TEST_URL)("pasarela por negocio (integración)", () => {
  const suffix = Date.now().toString(36);
  let a = "";
  let b = "";

  beforeAll(async () => {
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) throw new Error("DATABASE_URL debe ser igual a TEST_DATABASE_URL.");
    process.env.WEBHOOK_ENCRYPTION_KEY = "d".repeat(64);
    const admin = createAdminDb();
    a = String((await admin.createTenant({ name: "Pasarela A", slug: `pa-${suffix}`, vertical: "retail", modules: ["payments"], tenantType: "COMPANY", ownerEmail: `pa-${suffix}@ejemplo.com` })).id);
    b = String((await admin.createTenant({ name: "Pasarela B", slug: `pb-${suffix}`, vertical: "retail", modules: ["payments"], tenantType: "COMPANY", ownerEmail: `pb-${suffix}@ejemplo.com` })).id);
  });
  afterAll(async () => {
    for (const id of [a, b]) if (id) await deleteTenantCompletely(id);
    await db.close();
  });

  test("sin pasarela conectada el cobro queda manual, no con la de prueba", async () => {
    const r = await createIntent(a, { amount: 20_000, description: "Pedido sin pasarela" }, "u");
    expect(r.ok).toBe(true);
    const row = await db.orm.public.PaymentIntent.where({ tenantId: a, reference: r.ok ? r.reference : "" }).first();
    expect(row?.provider).toBe("manual");
  });

  test("cada negocio cobra con su Wompi y no ve el del otro; al desconectar vuelve a manual", async () => {
    const conn = await db.orm.public.ExternalConnection.create({ tenantId: a, kind: "PAYMENT", provider: "wompi", environment: "sandbox", status: "CONNECTED", credentialsEnc: encryptCredentials({ publicKey: "pub_test_x", integritySecret: "i", eventsSecret: "e" }), credentialsKeyId: "v1" });
    expect((await connectedGateways(a)).map((g) => g.value)).toEqual(["wompi"]);
    expect(await connectedGateways(b)).toEqual([]);

    const mine = await createIntent(a, { amount: 30_000, description: "Con Wompi" }, "u");
    const other = await createIntent(b, { amount: 30_000, description: "Sin Wompi", provider: "wompi" }, "u");
    const rows = async (t: string, ref: string) => (await db.orm.public.PaymentIntent.where({ tenantId: t, reference: ref }).first())?.provider;
    expect(await rows(a, mine.ok ? mine.reference : "")).toBe("wompi");
    expect(await rows(b, other.ok ? other.reference : "")).toBe("manual");

    expect(await disconnectProvider(b, conn.id)).toBe(false);
    expect(await disconnectProvider(a, conn.id)).toBe(true);
    expect((await listConnections(a))[0]).toMatchObject({ status: "DISCONNECTED" });
    const after = await createIntent(a, { amount: 30_000, description: "Tras desconectar" }, "u");
    expect(await rows(a, after.ok ? after.reference : "")).toBe("manual");
  });
});
