import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { db } from "@/prisma/db";
import { createAdminDb } from "@/lib/platform/admin/db";
import { deleteTenantCompletely } from "@/lib/core/tenancy/deletion";
import { MoneyError, recordIncomeNow } from "@/lib/business/sales/money-service";

/** HU-integridad-01: ningún monto absurdo ni cobro repetido entra al sistema. */
const TEST_URL = process.env.TEST_DATABASE_URL;
const normalize = (url: string | undefined) => (url ?? "").replace(/\?.*$/, "");

describe.skipIf(!TEST_URL)("integridad del dinero (integración)", () => {
  const suffix = Date.now().toString(36);
  let a = "";
  let b = "";
  let customerA = "";

  beforeAll(async () => {
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) throw new Error("DATABASE_URL debe ser igual a TEST_DATABASE_URL.");
    const admin = createAdminDb();
    a = String((await admin.createTenant({ name: "Integridad A", slug: `ia-${suffix}`, vertical: "retail", modules: [], tenantType: "COMPANY", ownerEmail: `ia-${suffix}@ejemplo.com` })).id);
    b = String((await admin.createTenant({ name: "Integridad B", slug: `ib-${suffix}`, vertical: "retail", modules: [], tenantType: "COMPANY", ownerEmail: `ib-${suffix}@ejemplo.com` })).id);
    customerA = (await db.orm.public.Customer.create({ tenantId: a, name: "Cliente Integridad" })).id;
  });
  afterAll(async () => {
    for (const id of [a, b]) if (id) await deleteTenantCompletely(id);
    await db.close();
  });

  const count = (tenantId: string) => db.orm.public.Payment.where({ tenantId }).all().then((r) => r.length);

  test("un monto negativo, inválido o sobre el tope se rechaza y no deja pago", async () => {
    for (const amount of [-1000, Number.NaN, 60_000_000]) {
      await expect(recordIncomeNow(a, { amount, method: "CASH", description: "Absurdo" }, "u")).rejects.toBeInstanceOf(MoneyError);
    }
    expect(await count(a)).toBe(0);
  });

  test("el tope se sube por negocio y solo en ese negocio", async () => {
    await db.orm.public.Tenant.where({ id: a }).update({ settings: { limits: { maxAmount: 200_000_000 } } });
    await expect(recordIncomeNow(a, { amount: 120_000_000, method: "TRANSFER", description: "Venta grande" }, "u")).resolves.toMatchObject({ receiptNumber: 1 });
    await expect(recordIncomeNow(b, { amount: 120_000_000, method: "TRANSFER", description: "Venta grande" }, "u")).rejects.toBeInstanceOf(MoneyError);
  });

  test("dos envíos iguales de un cliente en segundos crean un solo pago", async () => {
    const input = { amount: 50_000, method: "CASH", description: "Mensualidad", customerId: customerA, sourceType: "MEMBERSHIP", sourceId: "m-1" };
    const results = await Promise.allSettled([recordIncomeNow(a, input, "u"), recordIncomeNow(a, input, "u")]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await db.orm.public.Payment.where({ tenantId: a, sourceId: "m-1" }).all()).toHaveLength(1);
    await expect(recordIncomeNow(a, input, "u")).rejects.toThrow(/ya se registró/);
  });

  test("dos ventas iguales de mostrador sin cliente son legítimas", async () => {
    const input = { amount: 3_000, method: "CASH", description: "Café" };
    await recordIncomeNow(b, { ...input, amount: 3_000 }, "u");
    await expect(recordIncomeNow(b, input, "u")).resolves.toBeTruthy();
  });
});
