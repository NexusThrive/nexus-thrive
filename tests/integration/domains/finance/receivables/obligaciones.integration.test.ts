import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { db } from "@/prisma/db";
import { createAdminDb } from "@/lib/platform/admin/db";
import { deleteTenantCompletely } from "@/lib/core/tenancy/deletion";
import { placeOrder, cancelOrder } from "@/lib/business/store/store-db";
import { confirmIntent } from "@/lib/domains/finance/payments/intents-db";
import { receivables } from "@/lib/domains/finance/receivables/receivables-db";
import { enrollInPlan } from "@/lib/industry/gym/enrollment-db";
import { recordIncomeNow } from "@/lib/business/sales/money-service";
import { composePorts } from "@/lib/runtime/ports";

/** HU-obligaciones-01: pedidos y membresías existen como obligación con saldo y vencimiento, visible en cartera. */
const TEST_URL = process.env.TEST_DATABASE_URL;
const normalize = (url: string | undefined) => (url ?? "").replace(/\?.*$/, "");

describe.skipIf(!TEST_URL)("obligaciones (integración)", () => {
  const suffix = Date.now().toString(36);
  let a = "";
  let b = "";
  let siteSlug = "";
  let productId = "";
  let customerId = "";
  let planId = "";

  beforeAll(async () => {
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) throw new Error("DATABASE_URL debe ser igual a TEST_DATABASE_URL.");
    composePorts();
    const admin = createAdminDb();
    a = String((await admin.createTenant({ name: "Obligaciones A", slug: `oa-${suffix}`, vertical: "gym", modules: ["crm", "memberships", "website", "receivables"], tenantType: "COMPANY", ownerEmail: `oa-${suffix}@ejemplo.com` })).id);
    b = String((await admin.createTenant({ name: "Obligaciones B", slug: `ob-${suffix}`, vertical: "retail", modules: ["crm", "website", "receivables"], tenantType: "COMPANY", ownerEmail: `ob-${suffix}@ejemplo.com` })).id);
    siteSlug = `tienda-${suffix}`;
    await db.orm.public.SiteConfig.create({ tenantId: a, siteSlug, enabled: true, showCatalog: true } as never);
    productId = (await db.orm.public.Product.create({ tenantId: a, name: "Camiseta", price: "50000.00", kind: "PRODUCT", active: true, publishedOnline: true, trackStock: false } as never)).id;
    customerId = (await db.orm.public.Customer.create({ tenantId: a, name: "Socia Obligada" })).id;
    planId = (await db.orm.public.Product.create({ tenantId: a, name: "Plan mensual", price: "90000.00", kind: "PLAN", durationDays: 30, active: true } as never)).id;
  });
  afterAll(async () => {
    for (const id of [a, b]) if (id) await deleteTenantCompletely(id);
    await db.close();
  });

  const order = () => placeOrder(siteSlug, { customer: { name: "Camila Torres", phone: "3001112233", email: "", address: "", city: "", notes: "" }, lines: [{ productId, quantity: 2 }] });

  test("un pedido nuevo aparece en cartera con su saldo y vencimiento, y no en la de otro negocio", async () => {
    const placed = await order();
    expect(placed.ok).toBe(true);
    const mine = (await receivables(a)).rows.filter((r) => r.origin === "STORE_ORDER");
    expect(mine).toHaveLength(1);
    expect(mine[0]).toMatchObject({ party: "Camila Torres", total: 100_000, paid: 0, balance: 100_000 });
    expect(mine[0]!.dueDate).toBeTruthy();
    expect((await receivables(b)).rows).toHaveLength(0);
  });

  test("cobrar el pedido cierra su obligación y sale de la cartera", async () => {
    const placed = await order();
    if (!placed.ok) throw new Error(placed.message);
    const intent = await db.orm.public.PaymentIntent.where({ tenantId: a }).orderBy((i) => i.createdAt.desc()).first();
    const before = (await receivables(a)).rows.filter((r) => r.origin === "STORE_ORDER").length;
    expect((await confirmIntent(a, intent!.reference, { kind: "MANUAL", evidence: "Transferencia 998877", userId: "u" })).ok).toBe(true);
    expect((await receivables(a)).rows.filter((r) => r.origin === "STORE_ORDER").length).toBe(before - 1);
    expect((await db.orm.public.Obligation.where({ tenantId: a, status: "PAID" }).all()).length).toBeGreaterThanOrEqual(1);
  });

  test("cancelar un pedido anula su obligación", async () => {
    const placed = await order();
    if (!placed.ok) throw new Error(placed.message);
    const ord = await db.orm.public.StoreOrder.where({ tenantId: a }).orderBy((o) => o.number.desc()).first();
    expect((await cancelOrder(a, ord!.id)).ok).toBe(true);
    expect((await db.orm.public.Obligation.where({ tenantId: a, originId: ord!.id }).first())?.status).toBe("VOID");
  });

  test("una membresía sin cobrar queda en cartera y un abono posterior baja su saldo", async () => {
    await enrollInPlan(a, { customerId, customerName: "Socia Obligada", plan: { id: planId, name: "Plan mensual", price: 90_000, durationDays: 30 }, method: null }, "u");
    const row = (await receivables(a)).rows.find((r) => r.origin === "MEMBERSHIP");
    expect(row).toMatchObject({ party: "Socia Obligada", balance: 90_000 });
    const membership = await db.orm.public.Membership.where({ tenantId: a, customerId }).first();
    await recordIncomeNow(a, { amount: 40_000, method: "TRANSFER", description: "Abono", customerId, membershipId: membership!.id, sourceType: "MEMBERSHIP", sourceId: membership!.id }, "u");
    expect((await receivables(a)).rows.find((r) => r.origin === "MEMBERSHIP")).toMatchObject({ paid: 40_000, balance: 50_000 });
    await recordIncomeNow(a, { amount: 50_000, method: "TRANSFER", description: "Resto", customerId, membershipId: membership!.id, sourceType: "MEMBERSHIP", sourceId: "otro-origen" }, "u");
    expect((await receivables(a)).rows.find((r) => r.origin === "MEMBERSHIP")?.balance).toBe(50_000);
    await recordIncomeNow(a, { amount: 50_000, method: "TRANSFER", description: "Resto", customerId, membershipId: membership!.id, sourceType: "MEMBERSHIP", sourceId: membership!.id }, "u");
    expect((await receivables(a)).rows.find((r) => r.origin === "MEMBERSHIP")).toBeUndefined();
  });

  test("inscribir cobrando en el momento no deja deuda", async () => {
    const other = (await db.orm.public.Customer.create({ tenantId: a, name: "Socio Al Día" })).id;
    await enrollInPlan(a, { customerId: other, customerName: "Socio Al Día", plan: { id: planId, name: "Plan mensual", price: 90_000, durationDays: 30 }, method: "CASH" }, "u");
    expect((await receivables(a)).rows.find((r) => r.party === "Socio Al Día")).toBeUndefined();
  });
});
