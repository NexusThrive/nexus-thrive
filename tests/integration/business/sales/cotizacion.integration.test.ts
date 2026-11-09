import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { db } from "@/prisma/db";
import { createAdminDb } from "@/lib/platform/admin/db";
import { deleteTenantCompletely } from "@/lib/core/tenancy/deletion";
import { approveSalesQuote, createSalesQuote, listSalesQuotes, rejectSalesQuote, sendSalesQuote } from "@/lib/business/sales/sales-quotes-db";
import { cancelOrder, markAbandonedOrders } from "@/lib/business/store/store-db";
import { receivables } from "@/lib/domains/finance/receivables/receivables-db";

/** HU-cotizacion-01: una cotización aprobada crea el pedido con el anticipo pendiente. */
const TEST_URL = process.env.TEST_DATABASE_URL;
const normalize = (url: string | undefined) => (url ?? "").replace(/\?.*$/, "");

describe.skipIf(!TEST_URL)("cotización comercial (integración)", () => {
  const suffix = Date.now().toString(36);
  let a = "";
  let b = "";
  let customerId = "";
  let productId = "";
  const draft = (title = "Camisetas con logo", extra: Record<string, unknown> = {}) => createSalesQuote(a, { customerId, title, depositPct: 50, validUntil: null, lines: [{ productId, quantity: 4, unitPrice: 40_000 }], ...extra }, "u");

  beforeAll(async () => {
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) throw new Error("DATABASE_URL debe ser igual a TEST_DATABASE_URL.");
    const admin = createAdminDb();
    a = String((await admin.createTenant({ name: "Cotiza A", slug: `qa-${suffix}`, vertical: "retail", modules: ["crm", "quotes", "receivables"], tenantType: "COMPANY", ownerEmail: `qa-${suffix}@ejemplo.com` })).id);
    b = String((await admin.createTenant({ name: "Cotiza B", slug: `qb-${suffix}`, vertical: "retail", modules: ["crm"], tenantType: "COMPANY", ownerEmail: `qb-${suffix}@ejemplo.com` })).id);
    customerId = (await db.orm.public.Customer.create({ tenantId: a, name: "Camila Torres", phone: "3001112233" })).id;
    productId = (await db.orm.public.Product.create({ tenantId: a, name: "Camiseta", price: "40000.00", kind: "PRODUCT", active: true, trackStock: false } as never)).id;
  });
  afterAll(async () => {
    for (const id of [a, b]) if (id) await deleteTenantCompletely(id);
    await db.close();
  });

  test("crea con consecutivo y totales; valida cliente y catálogo del mismo negocio", async () => {
    const q = await draft();
    if (!q.ok) throw new Error(q.message);
    expect(q.number).toBe(1);
    expect((await listSalesQuotes(a))[0]).toMatchObject({ number: 1, status: "DRAFT", total: 160_000, customerName: "Camila Torres", lines: [{ name: "Camiseta", quantity: 4, unitPrice: 40_000 }] });
    expect(await createSalesQuote(b, { customerId, title: "Ajena", depositPct: 50, lines: [{ productId, quantity: 1, unitPrice: 1 }] }, "u")).toMatchObject({ ok: false });
    expect(await draft("ab")).toMatchObject({ ok: false });
    expect(await createSalesQuote(a, { customerId, title: "Producto ajeno", depositPct: 50, lines: [{ productId: "00000000-0000-0000-0000-000000000000", quantity: 1, unitPrice: 1 }] }, "u")).toMatchObject({ ok: false });
    expect((await draft("Segunda")).ok && (await listSalesQuotes(a)).map((x) => x.number)).toEqual([2, 1]);
  });

  test("aprobar crea el pedido con el anticipo pendiente en cartera y no se aprueba dos veces", async () => {
    const q = await draft("Para aprobar");
    if (!q.ok) throw new Error(q.message);
    expect(await sendSalesQuote(a, q.id)).toEqual({ ok: true });
    expect(await sendSalesQuote(a, q.id)).toMatchObject({ ok: false });
    const [x, y] = await Promise.all([approveSalesQuote(a, q.id, "Camila"), approveSalesQuote(a, q.id, "Camila")]);
    const wins = [x, y].filter((r) => r.ok);
    expect(wins).toHaveLength(1);
    const won = wins[0] as Extract<typeof x, { ok: true }>;
    expect(won).toMatchObject({ deposit: 80_000, balance: 80_000 });
    const order = await db.orm.public.StoreOrder.where({ tenantId: a, id: won.orderId }).first();
    expect(order).toMatchObject({ status: "PENDING_PAYMENT", customerId, quoteId: q.id, customerName: "Camila Torres" });
    expect(Number(order?.total)).toBe(160_000);
    expect(await db.orm.public.StoreOrderLine.where({ tenantId: a, orderId: won.orderId }).all()).toHaveLength(1);
    const quote = (await listSalesQuotes(a)).find((r) => r.id === q.id)!;
    expect(quote).toMatchObject({ status: "APPROVED", orderId: won.orderId });
    const rows = (await receivables(a)).rows.filter((r) => r.origin === "STORE_ORDER" && r.number.includes("COT-0003"));
    expect(rows.map((r) => [r.number, r.balance]).sort()).toEqual([["Anticipo · COT-0003", 80_000], ["Saldo · COT-0003", 80_000]]);
    expect(await approveSalesQuote(a, q.id)).toMatchObject({ ok: false });
    // El pedido de una cotización no se marca como abandonado.
    await db.orm.public.StoreOrder.where({ tenantId: a, id: won.orderId }).update({ createdAt: Temporal.Instant.fromEpochMilliseconds(Date.now() - 3 * 86_400_000) } as never);
    await markAbandonedOrders(Date.now(), [a]);
    expect((await db.orm.public.StoreOrder.where({ tenantId: a, id: won.orderId }).first())?.status).toBe("PENDING_PAYMENT");
    // Cancelar el pedido anula el anticipo y el saldo.
    expect((await cancelOrder(a, won.orderId)).ok).toBe(true);
    expect((await receivables(a)).rows.filter((r) => r.number.includes("COT-0003"))).toHaveLength(0);
    });

  test("una cotización vencida no se aprueba; rechazar pide motivo; nada cruza de negocio", async () => {
    const expired = await draft("Vencida", { validUntil: "2020-01-01" });
    if (!expired.ok) throw new Error(expired.message);
    expect(await approveSalesQuote(a, expired.id)).toMatchObject({ ok: false, message: expect.stringContaining("venció") });
    expect(await rejectSalesQuote(a, expired.id, " ")).toMatchObject({ ok: false });
    expect(await rejectSalesQuote(b, expired.id, "No aplica")).toMatchObject({ ok: false });
    expect(await rejectSalesQuote(a, expired.id, "Pidió otro proveedor")).toEqual({ ok: true });
    expect(await approveSalesQuote(a, expired.id)).toMatchObject({ ok: false });
    expect(await listSalesQuotes(b)).toEqual([]);
  });

  test("sin anticipo (0 %) solo hay saldo; con 100 % solo anticipo", async () => {
    const zero = await draft("Sin anticipo", { depositPct: 0 });
    const full = await draft("Todo adelantado", { depositPct: 100 });
    if (!zero.ok || !full.ok) throw new Error("no se crearon");
    expect(await approveSalesQuote(a, zero.id)).toMatchObject({ ok: true, deposit: 0, balance: 160_000 });
    expect(await approveSalesQuote(a, full.id)).toMatchObject({ ok: true, deposit: 160_000, balance: 0 });
    const labels = (await receivables(a)).rows.map((r) => r.number);
    expect(labels).toContain("Saldo · COT-0005");
    expect(labels).not.toContain("Anticipo · COT-0005");
    expect(labels).toContain("Anticipo · COT-0006");
    expect(labels).not.toContain("Saldo · COT-0006");
  });
});
