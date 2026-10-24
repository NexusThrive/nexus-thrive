import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { db } from "@/prisma/db";
import { createAdminDb } from "@/lib/admin/db";
import { kardex, reconcile, stockByWarehouse } from "@/lib/inventory/kardex";
import { runOperation } from "@/lib/operations/engine";
import { OPERATIONS } from "@/lib/operations/registry";
import { createParty } from "@/lib/parties/parties-db";
import { deleteTenantCompletely } from "@/lib/tenant/deletion";
import { cancelOrder, closeOrder, createOrder, getOrder, listOrders, markOrdered, receiveOrder, registerSupplierInvoice } from "./purchases-db";

/** Compras con recepción al inventario contra Postgres real y DOS negocios. */
const TEST_URL = process.env.TEST_DATABASE_URL;
const normalize = (url: string | undefined) => (url ?? "").replace(/\?.*$/, "");

describe.skipIf(!TEST_URL)("compras (integración)", () => {
  const suffix = Date.now().toString(36);
  let a = "";
  let b = "";
  let supplierA = "";
  let supplierB = "";
  let proteina = "";
  let barra = "";
  const product = async (tenantId: string, name: string, extra: Record<string, unknown> = {}) => (await db.orm.public.Product.create({ tenantId, name, price: "10000.00", trackStock: true, stock: 0, ...extra })).id;
  const lineOf = async (orderId: string, productId: string) => (await db.orm.public.PurchaseOrderLine.where({ orderId, productId }).first())!;

  beforeAll(async () => {
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) throw new Error("DATABASE_URL debe ser igual a TEST_DATABASE_URL.");
    const make = (name: string, slug: string) => createAdminDb().createTenant({ name, slug, vertical: "retail", modules: ["inventory", "purchases", "finance"], tenantType: "COMPANY", ownerEmail: `${slug}@ejemplo.com` });
    a = String((await make("Tienda A", `cp-a-${suffix}`)).id);
    b = String((await make("Tienda B", `cp-b-${suffix}`)).id);
    const sa = await createParty(a, { legalName: "Distribuidora Andina SAS", kind: "COMPANY", documentNumber: "900123456", roles: ["SUPPLIER"] });
    const sb = await createParty(b, { legalName: "Proveedor de B", roles: ["SUPPLIER"] });
    if (!sa.ok || !sb.ok) throw new Error("proveedores");
    supplierA = sa.party.id;
    supplierB = sb.party.id;
    proteina = await product(a, "Proteína");
    barra = await product(a, "Barra");
  });
  afterAll(async () => {
    for (const id of [a, b]) if (id) await deleteTenantCompletely(id);
    await db.close();
  });

  test("recibir una compra sube stock y costo, y deja su línea en el kardex", async () => {
    const created = await createOrder(a, { supplierPartyId: supplierA, lines: [{ productId: proteina, quantity: 10, unitCost: 100, taxRatePct: 19 }] }, "u1");
    if (!created.ok) throw new Error(created.message);
    expect(created.code).toMatch(/^OC-\d{4}$/);
    const detail = await getOrder(a, created.id);
    expect(detail).toMatchObject({ status: "DRAFT", subtotal: 1000, taxTotal: 190, total: 1190, supplierName: "Distribuidora Andina SAS", warehouseName: "Principal" });

    const r1 = await receiveOrder(a, created.id, { items: [{ lineId: (await lineOf(created.id, proteina)).id, quantity: 10 }] }, "u1");
    expect(r1).toMatchObject({ ok: true, status: "RECEIVED", received: 10 });
    const [line] = await kardex(a, proteina, { limit: 1 });
    expect(line).toMatchObject({ kind: "IN", quantity: 10, unitCost: 100, balance: 10, documentType: "PURCHASE", documentId: created.id });
    expect((await stockByWarehouse(a, proteina))[0]).toMatchObject({ quantity: 10, avgCost: 100 });

    // segunda compra a otro costo: el promedio se recalcula
    const second = await createOrder(a, { supplierPartyId: supplierA, lines: [{ productId: proteina, quantity: 10, unitCost: 200 }] }, "u1");
    if (!second.ok) throw new Error(second.message);
    await receiveOrder(a, second.id, { items: [{ lineId: (await lineOf(second.id, proteina)).id, quantity: 10 }] }, "u1");
    expect((await stockByWarehouse(a, proteina))[0]).toMatchObject({ quantity: 20, avgCost: 150 });
    expect(await reconcile(a, proteina)).toMatchObject({ ok: true, productStock: 20 });
  });

  test("recepción parcial: queda «recibida en parte», se completa después y no se recibe de más", async () => {
    const created = await createOrder(a, { supplierPartyId: supplierA, lines: [{ productId: barra, quantity: 10, unitCost: 50 }, { productId: proteina, quantity: 4, unitCost: 300 }] }, "u1");
    if (!created.ok) throw new Error(created.message);
    expect(await markOrdered(a, created.id)).toMatchObject({ ok: true });
    const lBarra = await lineOf(created.id, barra);
    const lProt = await lineOf(created.id, proteina);

    expect(await receiveOrder(a, created.id, { items: [{ lineId: lBarra.id, quantity: 6 }] }, "u1")).toMatchObject({ ok: true, status: "PARTIAL" });
    expect(await receiveOrder(a, created.id, { items: [{ lineId: lBarra.id, quantity: 5 }] }, "u1")).toMatchObject({ ok: false, code: "over_receipt" });
    expect((await getOrder(a, created.id))?.pendingUnits).toBe(8); // 4 de barra + 4 de proteína
    expect(await cancelOrder(a, created.id)).toMatchObject({ ok: false }); // ya llegó algo
    expect(await receiveOrder(a, created.id, { items: [{ lineId: lBarra.id, quantity: 4 }, { lineId: lProt.id, quantity: 4 }] }, "u1")).toMatchObject({ ok: true, status: "RECEIVED" });
    expect(await receiveOrder(a, created.id, { items: [{ lineId: lBarra.id, quantity: 1 }] }, "u1")).toMatchObject({ ok: false, code: "not_receivable" });
    expect(await reconcile(a, barra)).toMatchObject({ ok: true, productStock: 10 });
  });

  test("todo o nada: si una línea falla no entra ninguna", async () => {
    const created = await createOrder(a, { supplierPartyId: supplierA, lines: [{ productId: barra, quantity: 5, unitCost: 10 }, { productId: proteina, quantity: 5, unitCost: 10 }] }, "u1");
    if (!created.ok) throw new Error(created.message);
    const before = await db.orm.public.Product.where({ tenantId: a, id: barra }).first();
    const res = await receiveOrder(a, created.id, { items: [{ lineId: (await lineOf(created.id, barra)).id, quantity: 5 }, { lineId: (await lineOf(created.id, proteina)).id, quantity: 99 }] }, "u1");
    expect(res).toMatchObject({ ok: false, code: "over_receipt" });
    expect((await db.orm.public.Product.where({ tenantId: a, id: barra }).first())?.stock).toBe(before?.stock);
    expect((await lineOf(created.id, barra)).receivedQuantity).toBe(0);
  });

  test("dos recepciones simultáneas de la misma línea: entra una sola vez", async () => {
    const created = await createOrder(a, { supplierPartyId: supplierA, lines: [{ productId: barra, quantity: 5, unitCost: 10 }] }, "u1");
    if (!created.ok) throw new Error(created.message);
    const l = await lineOf(created.id, barra);
    const before = (await db.orm.public.Product.where({ tenantId: a, id: barra }).first())!.stock;
    const results = await Promise.all(Array.from({ length: 6 }, () => receiveOrder(a, created.id, { items: [{ lineId: l.id, quantity: 5 }] }, "u1")));
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect((await db.orm.public.Product.where({ tenantId: a, id: barra }).first())?.stock).toBe(before + 5);
    expect(await reconcile(a, barra)).toMatchObject({ ok: true });
  });

  test("cancelar un pedido sin recibir; cerrar uno recibido en parte", async () => {
    const c = await createOrder(a, { supplierPartyId: supplierA, lines: [{ productId: barra, quantity: 5, unitCost: 10 }] }, "u1");
    if (!c.ok) throw new Error(c.message);
    expect(await cancelOrder(a, c.id)).toMatchObject({ ok: true });
    expect((await getOrder(a, c.id))?.status).toBe("CANCELED");
    expect(await receiveOrder(a, c.id, { items: [{ lineId: (await lineOf(c.id, barra)).id, quantity: 1 }] }, "u1")).toMatchObject({ ok: false });

    const p = await createOrder(a, { supplierPartyId: supplierA, lines: [{ productId: barra, quantity: 5, unitCost: 10 }] }, "u1");
    if (!p.ok) throw new Error(p.message);
    expect(await closeOrder(a, p.id)).toMatchObject({ ok: false }); // aún no está en parte
    await receiveOrder(a, p.id, { items: [{ lineId: (await lineOf(p.id, barra)).id, quantity: 2 }] }, "u1");
    expect(await closeOrder(a, p.id)).toMatchObject({ ok: true });
    expect((await getOrder(a, p.id))?.status).toBe("RECEIVED");
  });

  test("factura del proveedor al recibir: se registra una vez por proveedor", async () => {
    const c = await createOrder(a, { supplierPartyId: supplierA, lines: [{ productId: barra, quantity: 3, unitCost: 100, taxRatePct: 19 }] }, "u1");
    if (!c.ok) throw new Error(c.message);
    const invoice = { number: `FV-${suffix}`, issueDate: "2026-10-24", dueDate: "2026-11-23", subtotal: 300, taxTotal: 57, total: 357 };
    expect(await receiveOrder(a, c.id, { items: [{ lineId: (await lineOf(c.id, barra)).id, quantity: 3 }], invoice }, "u1")).toMatchObject({ ok: true });
    expect((await getOrder(a, c.id))?.invoices).toMatchObject([{ number: `FV-${suffix}`, total: 357, status: "REGISTERED" }]);
    expect(await registerSupplierInvoice(a, { supplierPartyId: supplierA, number: `FV-${suffix}`, issueDate: "2026-10-24", subtotal: 1, total: 1 })).toMatchObject({ ok: false, code: "duplicate_invoice" });
    // una factura repetida al recibir no deja entrar la mercancía
    const d = await createOrder(a, { supplierPartyId: supplierA, lines: [{ productId: barra, quantity: 3, unitCost: 100 }] }, "u1");
    if (!d.ok) throw new Error(d.message);
    const stock = (await db.orm.public.Product.where({ tenantId: a, id: barra }).first())!.stock;
    expect(await receiveOrder(a, d.id, { items: [{ lineId: (await lineOf(d.id, barra)).id, quantity: 3 }], invoice }, "u1")).toMatchObject({ ok: false, code: "duplicate_invoice" });
    expect((await db.orm.public.Product.where({ tenantId: a, id: barra }).first())?.stock).toBe(stock);
  });

  test("validaciones: proveedor de otro negocio, producto sin inventario, no-proveedor", async () => {
    expect(await createOrder(a, { supplierPartyId: supplierB, lines: [{ productId: barra, quantity: 1, unitCost: 1 }] }, "u1")).toMatchObject({ ok: false, code: "invalid_supplier" });
    const customerOnly = await createParty(a, { legalName: "Solo cliente", roles: ["CUSTOMER"] });
    if (!customerOnly.ok) throw new Error("cliente");
    expect(await createOrder(a, { supplierPartyId: customerOnly.party.id, lines: [{ productId: barra, quantity: 1, unitCost: 1 }] }, "u1")).toMatchObject({ ok: false, code: "invalid_supplier" });
    const service = await product(a, "Servicio", { trackStock: false });
    expect(await createOrder(a, { supplierPartyId: supplierA, lines: [{ productId: service, quantity: 1, unitCost: 1 }] }, "u1")).toMatchObject({ ok: false, code: "untracked_product" });
    const foreign = await product(b, "De B");
    expect(await createOrder(a, { supplierPartyId: supplierA, lines: [{ productId: foreign, quantity: 1, unitCost: 1 }] }, "u1")).toMatchObject({ ok: false, code: "invalid_product" });
    expect(await createOrder(a, { supplierPartyId: supplierA, warehouseId: "no-existe", lines: [{ productId: barra, quantity: 1, unitCost: 1 }] }, "u1")).toMatchObject({ ok: false, code: "invalid_warehouse" });
  });

  test("consecutivo por negocio, sin saltos ni repetidos aunque se creen a la vez", async () => {
    const before = (await listOrders(a)).length;
    const results = await Promise.all(Array.from({ length: 8 }, () => createOrder(a, { supplierPartyId: supplierA, lines: [{ productId: barra, quantity: 1, unitCost: 1 }] }, "u1")));
    expect(results.every((r) => r.ok)).toBe(true);
    const numbers = (await listOrders(a, { limit: 200 })).map((o) => o.number).sort((x, y) => x - y);
    expect(numbers).toHaveLength(before + 8);
    expect(new Set(numbers).size).toBe(numbers.length);
    expect(numbers).toEqual(numbers.map((_, i) => i + 1)); // 1..N sin huecos
    // el otro negocio empieza en 1
    const first = await createOrder(b, { supplierPartyId: supplierB, lines: [{ productId: await product(b, "Otro"), quantity: 1, unitCost: 1 }] }, "u1");
    expect(first).toMatchObject({ ok: true, number: 1 });
  });

  test("aislamiento: nadie ve ni toca las órdenes de otro negocio", async () => {
    const mine = (await listOrders(a))[0];
    expect(await getOrder(b, mine.id)).toBeNull();
    expect(await cancelOrder(b, mine.id)).toMatchObject({ ok: false });
    expect(await receiveOrder(b, mine.id, { items: [{ lineId: "x", quantity: 1 }] }, "u1")).toMatchObject({ ok: false });
    expect((await listOrders(b)).every((o) => o.supplierPartyId === supplierB)).toBe(true);
  });

  test("la API lista y detalla órdenes con el permiso y el módulo correctos", async () => {
    const ctx = (tenantId: string, role: string, modules = ["purchases"]) => ({ tenantId, role, activeModules: modules, actor: { type: "API_KEY" as const, id: "k" } });
    const list = (await runOperation(OPERATIONS, ctx(a, "OWNER"), "purchases.list_orders", { status: "RECEIVED", limit: 5 })) as { items: { status: string; code: string }[] };
    expect(list.items.length).toBeGreaterThan(0);
    expect(list.items.every((i) => i.status === "RECEIVED")).toBe(true);
    const id = (await listOrders(a))[0].id;
    const detail = (await runOperation(OPERATIONS, ctx(a, "OWNER"), "purchases.get_order", { orderId: id })) as { lines: unknown[] };
    expect(detail.lines.length).toBeGreaterThan(0);
    await expect(runOperation(OPERATIONS, ctx(a, "ADVISOR"), "purchases.list_orders", {})).rejects.toMatchObject({ code: "forbidden" });
    await expect(runOperation(OPERATIONS, ctx(a, "OWNER", []), "purchases.list_orders", {})).rejects.toMatchObject({ code: "module_inactive" });
    await expect(runOperation(OPERATIONS, ctx(b, "OWNER"), "purchases.get_order", { orderId: id })).rejects.toMatchObject({ status: 404 });
  });
});
