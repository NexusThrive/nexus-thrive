import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { db } from "@/prisma/db";
import { createAdminDb } from "@/lib/platform/admin/db";
import { deleteTenantCompletely } from "@/lib/core/tenancy/deletion";
import { confirmDelivery, dispatchOrder, getDelivery } from "@/lib/business/store/delivery-db";
import { assignProduction, listProduction, moveProduction } from "@/lib/business/store/production-db";
import { advanceOrder, orderHistory } from "@/lib/business/store/fulfillment-db";
import { cancelOrder, placeOrder } from "@/lib/business/store/store-db";
import { confirmIntent } from "@/lib/domains/finance/payments/intents-db";
import { composePorts } from "@/lib/runtime/ports";

/** HU-pedidos-01: el pedido avanza de recibido a entregado con historial, separado del estado de pago. */
const TEST_URL = process.env.TEST_DATABASE_URL;
const normalize = (url: string | undefined) => (url ?? "").replace(/\?.*$/, "");

describe.skipIf(!TEST_URL)("cumplimiento de pedidos (integración)", () => {
  const suffix = Date.now().toString(36);
  let a = "";
  let b = "";
  let siteSlug = "";
  let productId = "";
  const newOrder = async (phone = "3001112233") => {
    const r = await placeOrder(siteSlug, { customer: { name: "Camila Torres", phone, email: "", address: "", city: "", notes: "" }, lines: [{ productId, quantity: 1 }] });
    if (!r.ok) throw new Error(r.message);
    return db.orm.public.StoreOrder.where({ tenantId: a }).orderBy((o) => o.number.desc()).first().then((o) => o!);
  };

  beforeAll(async () => {
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) throw new Error("DATABASE_URL debe ser igual a TEST_DATABASE_URL.");
    composePorts();
    const admin = createAdminDb();
    a = String((await admin.createTenant({ name: "Cumple A", slug: `cu-${suffix}`, vertical: "retail", modules: ["crm", "website"], tenantType: "COMPANY", ownerEmail: `cu-${suffix}@ejemplo.com` })).id);
    b = String((await admin.createTenant({ name: "Cumple B", slug: `cv-${suffix}`, vertical: "retail", modules: ["crm"], tenantType: "COMPANY", ownerEmail: `cv-${suffix}@ejemplo.com` })).id);
    siteSlug = `cp-${suffix}`;
    await db.orm.public.SiteConfig.create({ tenantId: a, siteSlug, enabled: true, showCatalog: true } as never);
    productId = (await db.orm.public.Product.create({ tenantId: a, name: "Camiseta", price: "40000.00", kind: "PRODUCT", active: true, publishedOnline: true, trackStock: false } as never)).id;
  });
  afterAll(async () => {
    for (const id of [a, b]) if (id) await deleteTenantCompletely(id);
    await db.close();
  });

  test("un pedido nuevo nace RECIBIDO con su primer registro en el historial", async () => {
    const o = await newOrder();
    expect(o).toMatchObject({ status: "PENDING_PAYMENT", fulfillment: "RECEIVED" });
    const h = await orderHistory(a, o.id);
    expect(h).toHaveLength(1);
    expect(h[0]).toMatchObject({ fromStatus: null, toStatus: "RECEIVED" });
  });

  test("avanza paso a paso, cada cambio queda con quién y cuándo, y publica el evento", async () => {
    const o = await newOrder("3002223344");
    for (const to of ["CONFIRMED", "IN_PRODUCTION", "READY", "SHIPPED", "DELIVERED"]) {
      expect(await advanceOrder(a, o.id, to, "ana", to === "SHIPPED" ? "Guía 123" : null), to).toMatchObject({ ok: true, to });
    }
    const h = await orderHistory(a, o.id);
    expect(h.map((x) => x.toStatus)).toEqual(["RECEIVED", "CONFIRMED", "IN_PRODUCTION", "READY", "SHIPPED", "DELIVERED"]);
    expect(h.at(-2)).toMatchObject({ fromStatus: "READY", toStatus: "SHIPPED", byId: "ana", note: "Guía 123" });
    expect(h.every((x, i) => i === 0 || x.createdAt >= h[i - 1]!.createdAt)).toBe(true);
    const events = await db.orm.public.OutboxEvent.where({ tenantId: a, type: "order.status_changed", resourceId: o.id }).all();
    expect(events).toHaveLength(5);
    expect(events[0]!.payload).toMatchObject({ order_id: o.id, from: "RECEIVED", to: "CONFIRMED", changed_by: "ana" });
    // Entregado es final.
    expect(await advanceOrder(a, o.id, "CONFIRMED", "ana")).toMatchObject({ ok: false, message: expect.stringContaining("ya no cambia") });
  });

  test("una transición inválida se rechaza sin tocar el estado ni el historial", async () => {
    const o = await newOrder("3003334455");
    expect(await advanceOrder(a, o.id, "DELIVERED", "ana")).toMatchObject({ ok: false, message: expect.stringContaining("No se puede pasar de «Recibido» a «Entregado»") });
    expect(await advanceOrder(a, o.id, "INVENTADO", "ana")).toMatchObject({ ok: false });
    expect((await db.orm.public.StoreOrder.where({ tenantId: a, id: o.id }).first())?.fulfillment).toBe("RECEIVED");
    expect(await orderHistory(a, o.id)).toHaveLength(1);
  });

  test("dos clics a la vez registran un solo cambio", async () => {
    const o = await newOrder("3004445566");
    const [x, y] = await Promise.all([advanceOrder(a, o.id, "CONFIRMED", "ana"), advanceOrder(a, o.id, "CONFIRMED", "luis")]);
    expect([x, y].filter((r) => r.ok)).toHaveLength(1);
    expect((await orderHistory(a, o.id)).filter((h) => h.toStatus === "CONFIRMED")).toHaveLength(1);
  });

  test("el pago no cambia el cumplimiento y cancelar el pago cancela el cumplimiento", async () => {
    const paid = await newOrder("3005556677");
    const intent = await db.orm.public.PaymentIntent.where({ tenantId: a }).orderBy((i) => i.createdAt.desc()).first();
    expect((await confirmIntent(a, intent!.reference, { kind: "MANUAL", evidence: "Transferencia 445566", userId: "u" })).ok).toBe(true);
    expect(await db.orm.public.StoreOrder.where({ tenantId: a, id: paid.id }).first()).toMatchObject({ status: "PAID", fulfillment: "RECEIVED" });

    const open = await newOrder("3006667788");
    expect((await cancelOrder(a, open.id)).ok).toBe(true);
    expect(await db.orm.public.StoreOrder.where({ tenantId: a, id: open.id }).first()).toMatchObject({ status: "CANCELED", fulfillment: "CANCELED" });
    const h = await orderHistory(a, open.id);
    expect(h.at(-1)).toMatchObject({ toStatus: "CANCELED", byId: null, note: "Se canceló el pedido" });
    expect(await advanceOrder(a, open.id, "CONFIRMED", "ana")).toMatchObject({ ok: false });
  });

  test("otro negocio no puede mover ni ver el pedido", async () => {
    const o = await newOrder("3007778899");
    expect(await advanceOrder(b, o.id, "CONFIRMED", "intruso")).toMatchObject({ ok: false, message: "No se encontró el pedido." });
    expect(await orderHistory(b, o.id)).toEqual([]);
  });

  test("pasar a producción crea una orden por línea y terminarlas todas deja el pedido listo", async () => {
    const o = await newOrder("3008889900");
    await advanceOrder(a, o.id, "CONFIRMED", "ana");
    expect((await advanceOrder(a, o.id, "IN_PRODUCTION", "ana")).ok).toBe(true);
    const rows = (await listProduction(a)).filter((p) => p.orderId === o.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ stage: "QUEUED", productName: "Camiseta" });
    expect(await assignProduction(a, rows[0]!.id, "luis")).toEqual({ ok: true });
    expect(await moveProduction(a, rows[0]!.id, "IN_PROGRESS", "luis")).toMatchObject({ ok: true, orderReady: false });
    expect(await moveProduction(a, rows[0]!.id, "DONE", "luis")).toMatchObject({ ok: true, orderReady: true });
    expect((await db.orm.public.StoreOrder.where({ tenantId: a, id: o.id }).first())?.fulfillment).toBe("READY");
    expect(await moveProduction(a, rows[0]!.id, "QUEUED", "luis")).toMatchObject({ ok: false });
    expect((await listProduction(a)).some((p) => p.orderId === o.id)).toBe(false);
  });

  test("producción de otro negocio no se ve ni se mueve", async () => {
    const o = await newOrder("3009990011");
    await advanceOrder(a, o.id, "CONFIRMED", "ana");
    await advanceOrder(a, o.id, "IN_PRODUCTION", "ana");
    const row = (await listProduction(a)).find((p) => p.orderId === o.id)!;
    expect(await listProduction(b)).toEqual([]);
    expect(await moveProduction(b, row.id, "DONE", "x")).toMatchObject({ ok: false });
  });

  test("despachar y confirmar la entrega, con saldo pendiente si no está pagado", async () => {
    const o = await newOrder("3001230000");
    expect(await dispatchOrder(a, o.id, { method: "OWN" }, "ana")).toMatchObject({ ok: false, message: "Solo se envía un pedido que está listo." });
    for (const to of ["CONFIRMED", "READY"]) await advanceOrder(a, o.id, to, "ana");
    expect(await dispatchOrder(a, o.id, { method: "COURIER" }, "ana")).toMatchObject({ ok: false, fields: { carrier: expect.any(String), trackingCode: expect.any(String) } });
    expect((await db.orm.public.StoreOrder.where({ tenantId: a, id: o.id }).first())?.fulfillment).toBe("READY");
    expect(await dispatchOrder(a, o.id, { method: "COURIER", carrier: "Servientrega", trackingCode: "SV123", scheduledFor: "2026-11-12" }, "ana")).toEqual({ ok: true });
    expect(await getDelivery(a, o.id)).toMatchObject({ method: "COURIER", carrier: "Servientrega", trackingCode: "SV123", deliveredAt: null });
    const done = await confirmDelivery(a, o.id, "Camila", "ana");
    expect(done).toMatchObject({ ok: true, balanceDue: 40000 });
    expect(await getDelivery(a, o.id)).toMatchObject({ receivedBy: "Camila", deliveredAt: expect.any(String) });
    expect((await orderHistory(a, o.id)).at(-1)).toMatchObject({ toStatus: "DELIVERED", note: "Recibió Camila" });
    expect(await confirmDelivery(a, o.id, "Otro", "ana")).toMatchObject({ ok: false });
    expect(await confirmDelivery(b, o.id, "x", "intruso")).toMatchObject({ ok: false });
  });
});
