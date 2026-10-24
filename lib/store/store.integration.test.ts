import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { db } from "@/prisma/db";
import { createAdminDb } from "@/lib/admin/db";
import { confirmIntent } from "@/lib/payments/intents-db";
import { saveSite } from "@/lib/site/site-db";
import { deleteTenantCompletely } from "@/lib/tenant/deletion";
import { cancelOrder, listOrders, markAbandonedOrders, placeOrder } from "./store-db";

/** Tienda en línea de punta a punta (pedido → pago → stock → documento → aviso) contra Postgres real y DOS negocios. */
const TEST_URL = process.env.TEST_DATABASE_URL;
const normalize = (url: string | undefined) => (url ?? "").replace(/\?.*$/, "");
const customer = { name: "María Pérez", phone: "300 123 4567", email: "maria@correo.com", address: "Calle 1 # 2-3", city: "Bogotá", notes: "" };

describe.skipIf(!TEST_URL)("tienda en línea (integración)", () => {
  const suffix = Date.now().toString(36);
  let a = "";
  let b = "";
  let camiseta = "";
  let gorra = "";
  const slug = `tienda-${suffix}`;

  beforeAll(async () => {
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) throw new Error("DATABASE_URL debe ser igual a TEST_DATABASE_URL.");
    const make = (name: string, s: string) => createAdminDb().createTenant({ name, slug: s, vertical: "retail", modules: ["inventory", "payments"], tenantType: "COMPANY", ownerEmail: `${s}@ejemplo.com` });
    a = String((await make("Tienda A", `st-a-${suffix}`)).id);
    b = String((await make("Tienda B", `st-b-${suffix}`)).id);
    camiseta = (await db.orm.public.Product.create({ tenantId: a, name: "Camiseta", price: "100000.00", trackStock: true, stock: 5, publishedOnline: true, taxCategory: "GRAVADO", taxRatePct: "19.00" })).id;
    gorra = (await db.orm.public.Product.create({ tenantId: a, name: "Gorra", price: "40000.00", publishedOnline: true })).id;
    await db.orm.public.Product.create({ tenantId: a, name: "Oculto", price: "1000.00", publishedOnline: false });
    await saveSite(a, { enabled: true, siteSlug: slug, template: "clasica", title: "", description: "", heroTitle: "", heroSubtitle: "", about: "", accent: "#D4AF37", showCatalog: true, showMap: true });
  });
  afterAll(async () => {
    for (const id of [a, b]) if (id) await deleteTenantCompletely(id);
    await db.close();
  });

  test("valida datos, existencias y productos no publicados; los precios salen de la base", async () => {
    expect(await placeOrder(slug, { customer: { ...customer, name: "Ma", phone: "1" }, lines: [{ productId: camiseta, quantity: 1 }] })).toMatchObject({ ok: false, fields: { name: expect.any(String), phone: expect.any(String) } });
    expect(await placeOrder(slug, { customer, lines: [] })).toMatchObject({ ok: false });
    expect(await placeOrder(slug, { customer, lines: [{ productId: camiseta, quantity: 6 }] })).toMatchObject({ ok: false, message: expect.stringContaining("solo quedan 5") });
    const hidden = (await db.orm.public.Product.where({ tenantId: a, name: "Oculto" }).first())!.id;
    expect(await placeOrder(slug, { customer, lines: [{ productId: hidden, quantity: 1 }] })).toMatchObject({ ok: false, message: expect.stringContaining("ya no está disponible") });
    expect(await placeOrder("no-existe", { customer, lines: [{ productId: camiseta, quantity: 1 }] })).toMatchObject({ ok: false });
    expect(await listOrders(a)).toEqual([]); // nada a medias
  });

  test("pedido → cobro; al pagarse: una venta con las líneas del pedido, stock descontado, evento y un solo ingreso", async () => {
    const r = await placeOrder(slug, { customer, lines: [{ productId: camiseta, quantity: 2 }, { productId: gorra, quantity: 1 }] });
    if (!r.ok) throw new Error(r.message);
    // 2 × 100.000 + IVA 19 % = 238.000 + gorra 40.000 (IVA 0 por defecto del test: GRAVADO con 0 %)
    expect(r).toMatchObject({ code: "T-0001", total: 278_000 });
    expect(r.whatsappText).toContain("T-0001");
    expect((await db.orm.public.OutboxEvent.where({ tenantId: a, type: "order.created" }).all()).length).toBe(1);
    expect((await listOrders(a))[0]).toMatchObject({ status: "PENDING_PAYMENT", total: 278_000, reference: r.reference });

    expect(await confirmIntent(a, r.reference, { kind: "MANUAL", evidence: "Transferencia 998877", userId: "u" })).toMatchObject({ ok: true, already: false });
    expect(await confirmIntent(a, r.reference, { kind: "MANUAL", evidence: "Transferencia 998877", userId: "u" })).toMatchObject({ ok: true, already: true });
    const order = (await listOrders(a))[0]!;
    expect(order.status).toBe("PAID");
    expect((await db.orm.public.Product.where({ tenantId: a, id: camiseta }).first())!.stock).toBe(3);
    const docs = await db.orm.public.Invoice.where({ tenantId: a, kind: "SALE" }).all();
    expect(docs).toHaveLength(1); // una sola venta
    const lines = await db.orm.public.InvoiceLine.where({ invoiceId: docs[0]!.id }).all();
    expect(lines.map((l) => l.description).sort()).toEqual(["Camiseta", "Gorra"]);
    expect(Number(docs[0]!.total)).toBe(278_000);
    expect((await db.orm.public.Payment.where({ tenantId: a }).all()).filter((p) => p.status === "APPROVED")).toHaveLength(1);
    expect((await db.orm.public.OutboxEvent.where({ tenantId: a, type: "order.paid" }).all()).length).toBe(1);
  });

  test("si el pago llega sin existencias, el pedido queda pagado y marcado para revisar (el dinero no se deshace)", async () => {
    const r = await placeOrder(slug, { customer, lines: [{ productId: camiseta, quantity: 3 }] });
    if (!r.ok) throw new Error(r.message);
    await db.orm.public.Product.where({ tenantId: a, id: camiseta }).update({ stock: 0 }); // alguien lo compró en el local
    await db.orm.public.StockLevel.where({ tenantId: a, productId: camiseta }).update({ quantity: 0 });
    expect(await confirmIntent(a, r.reference, { kind: "MANUAL", evidence: "Transferencia 112233", userId: "u" })).toMatchObject({ ok: true });
    const o = (await listOrders(a))[0]!;
    expect(o).toMatchObject({ status: "PAID" });
    expect(o.review).toContain("Sin existencias");
  });

  test("cancelar: un pedido pendiente se cancela con su cobro; uno pagado no", async () => {
    const r = await placeOrder(slug, { customer, lines: [{ productId: gorra, quantity: 1 }] });
    if (!r.ok) throw new Error(r.message);
    const pending = (await listOrders(a)).find((o) => o.reference === r.reference)!;
    expect(await cancelOrder(a, pending.id)).toEqual({ ok: true });
    expect(await confirmIntent(a, r.reference, { kind: "MANUAL", evidence: "Transferencia 445566", userId: "u" })).toMatchObject({ ok: false });
    const paid = (await listOrders(a)).find((o) => o.status === "PAID")!;
    expect(await cancelOrder(a, paid.id)).toMatchObject({ ok: false, message: expect.stringContaining("Cobros en línea") });
    expect(await cancelOrder(b, pending.id)).toMatchObject({ ok: false }); // de otro negocio
  });

  test("el abandono dispara UN evento y no se repite", async () => {
    const r = await placeOrder(slug, { customer, lines: [{ productId: gorra, quantity: 2 }] });
    if (!r.ok) throw new Error(r.message);
    expect(await markAbandonedOrders(Date.now() + 30 * 60_000, [a])).toBe(0); // aún no pasó el tiempo
    expect(await markAbandonedOrders(Date.now() + 61 * 60_000, [a])).toBe(1);
    expect(await markAbandonedOrders(Date.now() + 120 * 60_000, [a])).toBe(0);
    expect((await db.orm.public.OutboxEvent.where({ tenantId: a, type: "cart.abandoned" }).all()).length).toBe(1);
    expect((await listOrders(a)).find((o) => o.reference === r.reference)!.status).toBe("ABANDONED");
    // Aun abandonado, si paga después, se liquida.
    expect(await confirmIntent(a, r.reference, { kind: "MANUAL", evidence: "Transferencia 778899", userId: "u" })).toMatchObject({ ok: true });
    expect((await listOrders(a)).find((o) => o.reference === r.reference)!.status).toBe("PAID");
  });

  test("aislamiento: B no ve pedidos de A", async () => {
    expect(await listOrders(b)).toEqual([]);
  });
});
