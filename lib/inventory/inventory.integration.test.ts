import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { db } from "@/prisma/db";
import { createAdminDb } from "@/lib/admin/db";
import { moneyTransaction, sellProduct } from "@/lib/business/money-service";
import { moveStock } from "@/lib/business/products-db";
import { runOperation } from "@/lib/operations/engine";
import { OPERATIONS } from "@/lib/operations/registry";
import { deleteTenantCompletely } from "@/lib/tenant/deletion";
import { createWarehouse, kardex, reconcile, stockByWarehouse } from "./kardex";
import { applyStockMovement, StockError } from "./stock-service";

/** Inventario con bodegas, costo promedio y kardex contra Postgres real y DOS negocios. */
const TEST_URL = process.env.TEST_DATABASE_URL;
const normalize = (url: string | undefined) => (url ?? "").replace(/\?.*$/, "");

describe.skipIf(!TEST_URL)("inventario (integración)", () => {
  const suffix = Date.now().toString(36);
  let a = "";
  let b = "";
  const product = async (tenantId: string, name: string, extra: Record<string, unknown> = {}) => (await db.orm.public.Product.create({ tenantId, name, price: "10000.00", trackStock: true, stock: 0, ...extra })).id;
  const move = (tenantId: string, input: Parameters<typeof applyStockMovement>[2]) => moneyTransaction((tx) => applyStockMovement(tx, tenantId, input));

  beforeAll(async () => {
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) throw new Error("DATABASE_URL debe ser igual a TEST_DATABASE_URL.");
    const make = (name: string, slug: string) => createAdminDb().createTenant({ name, slug, vertical: "gym", modules: ["inventory", "finance"], tenantType: "COMPANY", ownerEmail: `${slug}@ejemplo.com` });
    a = String((await make("Tienda A", `iv-a-${suffix}`)).id);
    b = String((await make("Tienda B", `iv-b-${suffix}`)).id);
  });
  afterAll(async () => {
    for (const id of [a, b]) if (id) await deleteTenantCompletely(id);
    await db.close();
  });

  test("costo promedio ponderado: dos compras a distinto costo, y la venta sale al promedio", async () => {
    const p = await product(a, "Proteína");
    await move(a, { productId: p, kind: "IN", quantity: 10, unitCost: 100 });
    const second = await move(a, { productId: p, kind: "IN", quantity: 10, unitCost: 200 });
    expect(second).toMatchObject({ balance: 20, productStock: 20, unitCost: 150 }); // (10×100 + 10×200) / 20
    const sale = await move(a, { productId: p, kind: "SALE", quantity: 5, documentType: "SALE" });
    expect(sale).toMatchObject({ balance: 15, productStock: 15, unitCost: 150 });
    const lines = await kardex(a, p);
    expect(lines.map((l) => [l.kind, l.quantity, l.unitCost, l.balance])).toEqual([
      ["SALE", 5, 150, 15],
      ["IN", 10, 200, 20],
      ["IN", 10, 100, 10],
    ]);
    expect(lines[0].value).toBe(750);
    expect(await reconcile(a, p)).toMatchObject({ ok: true, productStock: 15, levelsTotal: 15 });
  });

  test("una venta real descuenta con costo y el kardex cuadra con el stock", async () => {
    const p = await product(a, "Barra", { cost: "2000.00" });
    await move(a, { productId: p, kind: "IN", quantity: 8, unitCost: 2000 });
    const sold = await sellProduct(a, { productId: p, name: "Barra", price: 5000, quantity: 3, method: "CASH", trackStock: true } as never, "u1");
    expect(sold.ok).toBe(true);
    const [line] = await kardex(a, p, { limit: 1 });
    expect(line).toMatchObject({ kind: "SALE", quantity: 3, unitCost: 2000, balance: 5, documentType: "SALE" });
    expect(line.value).toBe(6000);
    expect(await reconcile(a, p)).toMatchObject({ ok: true, productStock: 5 });
    // sin stock suficiente la venta falla ENTERA (no queda el cobro)
    const before = await db.orm.public.Payment.where({ tenantId: a }).all();
    const fail = await sellProduct(a, { productId: p, name: "Barra", price: 5000, quantity: 99, method: "CASH", trackStock: true } as never, "u1");
    expect(fail).toMatchObject({ ok: false });
    expect((await db.orm.public.Payment.where({ tenantId: a }).all()).length).toBe(before.length);
  });

  test("dos ventas simultáneas del último producto: una gana y el stock nunca es negativo", async () => {
    const p = await product(a, "Último");
    await move(a, { productId: p, kind: "IN", quantity: 1, unitCost: 500 });
    const results = await Promise.allSettled(Array.from({ length: 6 }, () => move(a, { productId: p, kind: "SALE", quantity: 1 })));
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected").every((r) => (r as PromiseRejectedResult).reason instanceof StockError)).toBe(true);
    expect(await reconcile(a, p)).toMatchObject({ ok: true, productStock: 0, levelsTotal: 0 });
  });

  test("20 movimientos simultáneos suman exacto (sin perder ninguno)", async () => {
    const p = await product(a, "Concurrente");
    await Promise.all(Array.from({ length: 20 }, () => move(a, { productId: p, kind: "IN", quantity: 2, unitCost: 100 })));
    expect(await reconcile(a, p)).toMatchObject({ ok: true, productStock: 40, levelsTotal: 40 });
    expect((await kardex(a, p, { limit: 100 })).length).toBe(20);
  });

  test("varias bodegas: el producto suma todas y cada una lleva su saldo y costo", async () => {
    const p = await product(a, "Multi");
    const sede = await createWarehouse(a, { name: "Sede Norte" });
    if (!sede.ok) throw new Error(sede.message);
    await move(a, { productId: p, kind: "IN", quantity: 10, unitCost: 100 });
    await move(a, { productId: p, kind: "IN", quantity: 4, unitCost: 300, warehouseId: sede.id });
    await expect(move(a, { productId: p, kind: "OUT", quantity: 5, warehouseId: sede.id })).rejects.toThrow(/Solo hay 4/);
    const levels = await stockByWarehouse(a, p);
    expect(levels.map((l) => [l.warehouse, l.quantity, l.avgCost]).sort()).toEqual([["Principal", 10, 100], ["Sede Norte", 4, 300]]);
    expect(await reconcile(a, p)).toMatchObject({ ok: true, productStock: 14, levelsTotal: 14 });
    expect(await createWarehouse(a, { name: "Sede Norte" })).toMatchObject({ ok: false });
  });

  test("un producto que ya tenía stock antes del módulo nace con ese saldo en la bodega principal", async () => {
    const p = await product(a, "Antiguo", { stock: 7, cost: "1500.00" });
    const r = await move(a, { productId: p, kind: "SALE", quantity: 2 });
    expect(r).toMatchObject({ balance: 5, productStock: 5, unitCost: 1500 });
    expect(await reconcile(a, p)).toMatchObject({ ok: true });
  });

  test("ajuste: fija el conteo y registra la diferencia; moveStock sigue funcionando", async () => {
    const p = await product(a, "Ajustable");
    await moveStock(a, p, "IN", 10, "inicial", "u1");
    expect(await moveStock(a, p, "ADJUST", 7, "conteo", "u1")).toBe(7);
    const [line] = await kardex(a, p, { limit: 1 });
    expect(line).toMatchObject({ kind: "ADJUST", quantity: -3, balance: 7 });
    expect(await reconcile(a, p)).toMatchObject({ ok: true, productStock: 7 });
  });

  test("aislamiento: no se mueve ni se lee inventario de otro negocio", async () => {
    const pa = await product(a, "De A");
    await expect(move(b, { productId: pa, kind: "IN", quantity: 1 })).rejects.toThrow(/no encontrado/i);
    await expect(move(b, { productId: await product(b, "De B"), kind: "IN", quantity: 1, warehouseId: (await createWarehouse(a, { name: `Otra-${suffix}` }) as { id: string }).id })).rejects.toThrow(/bodega/i);
    expect(await kardex(b, pa)).toEqual([]);
    expect(await stockByWarehouse(b, pa)).toEqual([]);
  });

  test("la API entrega el kardex con permiso de dinero y respeta el negocio", async () => {
    const p = await product(a, "Por API");
    await move(a, { productId: p, kind: "IN", quantity: 3, unitCost: 100 });
    const ctx = (tenantId: string, role: string) => ({ tenantId, role, activeModules: ["inventory", "finance"], actor: { type: "API_KEY" as const, id: "k" } });
    const out = (await runOperation(OPERATIONS, ctx(a, "OWNER"), "inventory.kardex", { productId: p })) as { lines: { balance: number }[]; byWarehouse: { quantity: number }[] };
    expect(out.lines[0].balance).toBe(3);
    expect(out.byWarehouse[0].quantity).toBe(3);
    await expect(runOperation(OPERATIONS, ctx(a, "ADVISOR"), "inventory.kardex", { productId: p })).rejects.toMatchObject({ code: "forbidden" });
    await expect(runOperation(OPERATIONS, ctx(b, "OWNER"), "inventory.kardex", { productId: p })).rejects.toMatchObject({ status: 404 });
  });

  test("cantidad y costo inválidos se rechazan", async () => {
    const p = await product(a, "Validación");
    await expect(move(a, { productId: p, kind: "IN", quantity: 0 })).rejects.toThrow(StockError);
    await expect(move(a, { productId: p, kind: "IN", quantity: 1.5 })).rejects.toThrow(StockError);
    await expect(move(a, { productId: p, kind: "IN", quantity: 1, unitCost: -5 })).rejects.toThrow(StockError);
  });
});
