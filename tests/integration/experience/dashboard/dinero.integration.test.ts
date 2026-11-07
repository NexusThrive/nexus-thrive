import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { db } from "@/prisma/db";
import { createAdminDb } from "@/lib/platform/admin/db";
import { deleteTenantCompletely } from "@/lib/core/tenancy/deletion";
import { recordIncomeNow } from "@/lib/business/sales/money-service";
import { createIntent, submitProof } from "@/lib/domains/finance/payments/intents-db";
import { importStatement } from "@/lib/domains/finance/payments/statements-db";
import { moneyOverview } from "@/lib/experience/dashboard/where-is-my-money";
import { todayCO } from "@/lib/domains/finance/tax/tax";

/** HU-vista-financiera-01: una sola lectura responde «¿dónde está mi dinero?» sin mezclar negocios. */
const TEST_URL = process.env.TEST_DATABASE_URL;
const normalize = (url: string | undefined) => (url ?? "").replace(/\?.*$/, "");

describe.skipIf(!TEST_URL)("¿Dónde está mi dinero? (integración)", () => {
  const suffix = Date.now().toString(36);
  let a = "";
  let b = "";

  beforeAll(async () => {
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) throw new Error("DATABASE_URL debe ser igual a TEST_DATABASE_URL.");
    const admin = createAdminDb();
    a = String((await admin.createTenant({ name: "Dinero A", slug: `da-${suffix}`, vertical: "retail", modules: ["finance", "receivables"], tenantType: "COMPANY", ownerEmail: `da-${suffix}@ejemplo.com` })).id);
    b = String((await admin.createTenant({ name: "Dinero B", slug: `db-${suffix}`, vertical: "retail", modules: ["finance"], tenantType: "COMPANY", ownerEmail: `db-${suffix}@ejemplo.com` })).id);
    await recordIncomeNow(a, { amount: 100_000, method: "CASH", description: "Venta en efectivo" }, "u");
    await recordIncomeNow(a, { amount: 250_000, method: "TRANSFER", description: "Transferencia" }, "u");
    const verifying = await createIntent(a, { amount: 90_000, description: "Por verificar" }, "u");
    if (verifying.ok) await submitProof(verifying.reference, "Bancolombia 123456");
    await db.orm.public.PaymentIntent.create({ tenantId: a, reference: `gw${suffix}abcdefgh`, amount: "100000.00", description: "Pasarela sin liquidar", status: "PAID", provider: "wompi", confirmedBy: "PROVIDER", providerRefId: "tx-dinero", feeEstimated: "3986.50", netExpected: "96013.50", expiresAt: Temporal.Instant.fromEpochMilliseconds(Date.now() + 3_600_000), paidAt: Temporal.Instant.fromEpochMilliseconds(Date.now()) } as never);
    await db.orm.public.Obligation.create({ tenantId: a, originType: "STORE_ORDER", originId: `o-${suffix}`, debtorName: "Camila", description: "Pedido P-1", amount: "70000.00", dueDate: Temporal.Instant.fromEpochMilliseconds(Date.now() - 3 * 86_400_000) });
    await importStatement(a, `${todayCO()}; Algo sin cruzar; 1; 12.345`);
  });
  afterAll(async () => {
    for (const id of [a, b]) if (id) await deleteTenantCompletely(id);
    await db.close();
  });

  test("resume lo cobrado por canal, lo que te deben, lo que viene en camino y lo pendiente", async () => {
    const o = await moneyOverview(a);
    expect(o.received).toBe(350_000);
    expect(o.byChannel.map((c) => [c.channel, c.received])).toEqual([["TRANSFER", 250_000], ["CASH", 100_000]]);
    expect(o.receivable).toMatchObject({ total: 70_000, count: 1, overdue: 1 });
    expect(o.inGateway).toEqual({ net: 96_013.5, count: 1 });
    expect(o.fees.estimated).toBe(3_986.5);
    expect(o.toVerify).toEqual({ count: 1, amount: 90_000 });
    expect(o.toReconcile).toEqual({ proposed: 0, pending: 1 });
  });

  test("otro negocio no ve nada de esto", async () => {
    const o = await moneyOverview(b);
    expect(o).toMatchObject({ received: 0, byChannel: [], receivable: { total: 0, count: 0 }, inGateway: { net: 0, count: 0 }, toVerify: { count: 0 }, toReconcile: { proposed: 0, pending: 0 } });
  });
});
