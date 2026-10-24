import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { db } from "@/prisma/db";
import { createAdminDb } from "@/lib/admin/db";
import { moneyTransaction } from "@/lib/business/money-service";
import { runOperation } from "@/lib/operations/engine";
import { OPERATIONS } from "@/lib/operations/registry";
import { createParty } from "@/lib/parties/parties-db";
import { createOrder, markOrdered } from "@/lib/purchasing/purchases-db";
import { deleteTenantCompletely } from "@/lib/tenant/deletion";
import { createWarehouse, kardex, reconcile, stockByWarehouse } from "./kardex";
import { applyStockMovement } from "./stock-service";
import { cancelCount, createCount, createTransfer, finalizeCount, getCount, listCounts, listTransfers, reorderOverview, saveCountLines, setReorderLevels, stockOverview } from "./stock-docs-db";

/** Traslados, conteos y reposición contra Postgres real y DOS negocios. */
const TEST_URL = process.env.TEST_DATABASE_URL;
const normalize = (url: string | undefined) => (url ?? "").replace(/\?.*$/, "");

describe.skipIf(!TEST_URL)("traslados, conteos y reposición (integración)", () => {
  const suffix = Date.now().toString(36);
  let a = "";
  let b = "";
  let norte = "";
  let sur = "";
  let main = "";
  const product = async (tenantId: string, name: string, extra: Record<string, unknown> = {}) => (await db.orm.public.Product.create({ tenantId, name, price: "10000.00", trackStock: true, stock: 0, ...extra })).id;
  const move = (tenantId: string, input: Parameters<typeof applyStockMovement>[2]) => moneyTransaction((tx) => applyStockMovement(tx, tenantId, input));
  const level = async (tenantId: string, productId: string, warehouseId: string) => (await stockByWarehouse(tenantId, productId)).find((l) => l.warehouseId === warehouseId);

  beforeAll(async () => {
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) throw new Error("DATABASE_URL debe ser igual a TEST_DATABASE_URL.");
    const make = (name: string, slug: string) => createAdminDb().createTenant({ name, slug, vertical: "retail", modules: ["inventory", "purchases"], tenantType: "COMPANY", ownerEmail: `${slug}@ejemplo.com` });
    a = String((await make("Tienda A", `st-a-${suffix}`)).id);
    b = String((await make("Tienda B", `st-b-${suffix}`)).id);
    const n = await createWarehouse(a, { name: "Norte" });
    const s = await createWarehouse(a, { name: "Sur" });
    if (!n.ok || !s.ok) throw new Error("bodegas");
    norte = n.id;
    sur = s.id;
    main = (await db.orm.public.Warehouse.where({ tenantId: a, isDefault: true }).first())?.id ?? (await move(a, { productId: await product(a, "semilla"), kind: "IN", quantity: 1 })).warehouseId;
  });
  afterAll(async () => {
    for (const id of [a, b]) if (id) await deleteTenantCompletely(id);
    await db.close();
  });

  test("un traslado mueve las unidades y conserva el costo: el valor del inventario no cambia", async () => {
    const p = await product(a, "Proteína");
    await move(a, { productId: p, kind: "IN", quantity: 10, unitCost: 100, warehouseId: norte });
    await move(a, { productId: p, kind: "IN", quantity: 10, unitCost: 300, warehouseId: sur }); // otro costo en destino
    const before = (await stockByWarehouse(a, p)).reduce((s, l) => s + l.value, 0);
    const t = await createTransfer(a, { fromWarehouseId: norte, toWarehouseId: sur, lines: [{ productId: p, quantity: 4 }] }, "u1");
    if (!t.ok) throw new Error(t.message);
    expect(t.code).toMatch(/^TR-\d{4}$/);
    expect(await level(a, p, norte)).toMatchObject({ quantity: 6, avgCost: 100 });
    // destino: 10 a 300 + 4 a 100 → (3000+400)/14
    const dest = await level(a, p, sur);
    expect(dest?.quantity).toBe(14);
    expect(dest?.avgCost).toBeCloseTo(3400 / 14, 3);
    const after = (await stockByWarehouse(a, p)).reduce((s, l) => s + l.value, 0);
    expect(after).toBeCloseTo(before, 1); // 1000+3000 = 600+3400
    expect(await reconcile(a, p)).toMatchObject({ ok: true, productStock: 20 }); // el total no cambia
    const lines = await kardex(a, p, { limit: 2 });
    // Salida e entrada quedan con el mismo documento (misma transacción: la hora no las ordena).
    expect(lines.map((l) => [l.kind, l.documentType, l.documentId]).sort()).toEqual([["IN", "TRANSFER", t.id], ["OUT", "TRANSFER", t.id]]);
    const listed = (await listTransfers(a))[0];
    expect(listed).toMatchObject({ code: t.code, fromName: "Norte", toName: "Sur", units: 4, value: 400 });
  });

  test("sin existencias suficientes no mueve nada (todo o nada); mismo origen y destino, no", async () => {
    const p = await product(a, "Barra");
    const q = await product(a, "Galleta");
    await move(a, { productId: p, kind: "IN", quantity: 5, unitCost: 10, warehouseId: norte });
    await move(a, { productId: q, kind: "IN", quantity: 1, unitCost: 10, warehouseId: norte });
    const res = await createTransfer(a, { fromWarehouseId: norte, toWarehouseId: sur, lines: [{ productId: p, quantity: 5 }, { productId: q, quantity: 2 }] }, "u1");
    expect(res).toMatchObject({ ok: false, code: "stock" });
    expect((await level(a, p, norte))?.quantity).toBe(5); // la primera línea tampoco se movió
    expect(await level(a, p, sur)).toBeUndefined();
    expect(await createTransfer(a, { fromWarehouseId: norte, toWarehouseId: norte, lines: [{ productId: p, quantity: 1 }] }, "u1")).toMatchObject({ ok: false });
  });

  test("seis traslados a la vez del último producto: sale una vez; y el consecutivo no se repite", async () => {
    const p = await product(a, "Última");
    await move(a, { productId: p, kind: "IN", quantity: 3, unitCost: 10, warehouseId: norte });
    const results = await Promise.all(Array.from({ length: 6 }, () => createTransfer(a, { fromWarehouseId: norte, toWarehouseId: sur, lines: [{ productId: p, quantity: 3 }] }, "u1")));
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(await reconcile(a, p)).toMatchObject({ ok: true, productStock: 3 });
    const numbers = (await listTransfers(a, 200)).map((t) => t.number);
    expect(new Set(numbers).size).toBe(numbers.length);
  });

  test("un traslado no toca otro negocio: bodega o producto ajenos se rechazan", async () => {
    const foreign = await product(b, "De B");
    const p = await product(a, "Propio");
    await move(a, { productId: p, kind: "IN", quantity: 2, unitCost: 1, warehouseId: norte });
    expect(await createTransfer(a, { fromWarehouseId: norte, toWarehouseId: sur, lines: [{ productId: foreign, quantity: 1 }] }, "u1")).toMatchObject({ ok: false, code: "invalid_product" });
    expect(await createTransfer(b, { fromWarehouseId: norte, toWarehouseId: sur, lines: [{ productId: foreign, quantity: 1 }] }, "u1")).toMatchObject({ ok: false, code: "invalid_warehouse" });
    expect(await listTransfers(b)).toEqual([]);
  });

  test("conteo: foto de lo esperado, lo contado y ajustes con motivo en el kardex", async () => {
    const p1 = await product(a, "Cuenta 1");
    const p2 = await product(a, "Cuenta 2");
    const p3 = await product(a, "Cuenta 3");
    for (const p of [p1, p2, p3]) await move(a, { productId: p, kind: "IN", quantity: 10, unitCost: 100, warehouseId: sur });
    const c = await createCount(a, sur, "u1");
    if (!c.ok) throw new Error(c.message);
    const detail = (await getCount(a, c.id))!;
    expect(detail.status).toBe("DRAFT");
    const line = (name: string) => detail.lines.find((l) => l.productName === name)!;
    expect(line("Cuenta 1").expected).toBe(10);
    await saveCountLines(a, c.id, [{ lineId: line("Cuenta 1").id, counted: 8 }, { lineId: line("Cuenta 2").id, counted: 12 }, { lineId: line("Cuenta 3").id, counted: 10 }]);
    // sin motivo no se ajusta
    expect(await finalizeCount(a, c.id, "", "u1")).toMatchObject({ ok: false, code: "reason_required" });
    expect((await getCount(a, c.id))?.status).toBe("DRAFT");
    const done = await finalizeCount(a, c.id, "Conteo de fin de mes", "u1");
    expect(done).toMatchObject({ ok: true, adjusted: 2, units: 4 }); // −2 y +2
    expect((await level(a, p1, sur))?.quantity).toBe(8);
    expect((await level(a, p2, sur))?.quantity).toBe(12);
    expect((await level(a, p3, sur))?.quantity).toBe(10); // sin diferencia: no se toca
    const [k] = await kardex(a, p1, { limit: 1 });
    expect(k).toMatchObject({ kind: "OUT", quantity: 2, documentType: "COUNT", documentId: c.id });
    expect(k.note).toContain("Conteo de fin de mes");
    expect(await reconcile(a, p1)).toMatchObject({ ok: true });
    const closed = (await getCount(a, c.id))!;
    expect(closed.status).toBe("COMPLETED");
    expect(closed.lines.map((l) => l.adjustment).filter((x) => x !== null).sort()).toEqual([-2, 2]);
    expect(closed.lines.find((l) => l.productName === "Cuenta 3")?.adjustment).toBeNull(); // sin diferencia
    // un conteo cerrado no se vuelve a cerrar ni a editar
    expect(await finalizeCount(a, c.id, "otra vez", "u1")).toMatchObject({ ok: false, code: "closed" });
    expect(await saveCountLines(a, c.id, [{ lineId: line("Cuenta 1").id, counted: 0 }])).toMatchObject({ ok: false });
    expect((await listCounts(a))[0]).toMatchObject({ code: c.code, status: "COMPLETED", withDifference: 2 });
  });

  test("el conteo aplica la DIFERENCIA, no el valor: una venta durante el conteo no se pisa", async () => {
    const p = await product(a, "En movimiento");
    await move(a, { productId: p, kind: "IN", quantity: 10, unitCost: 50, warehouseId: norte });
    const c = await createCount(a, norte, "u1");
    if (!c.ok) throw new Error(c.message);
    await move(a, { productId: p, kind: "SALE", quantity: 3, warehouseId: norte }); // mientras se cuenta: quedan 7
    const line = (await getCount(a, c.id))!.lines.find((l) => l.productName === "En movimiento")!;
    await saveCountLines(a, c.id, [{ lineId: line.id, counted: 9 }]); // contó 9 de los 10 que había al empezar (−1)
    await finalizeCount(a, c.id, "Faltó una unidad", "u1");
    expect((await level(a, p, norte))?.quantity).toBe(6); // 7 − 1, no 9
    expect(await reconcile(a, p)).toMatchObject({ ok: true });
  });

  test("cerrar el mismo conteo seis veces a la vez ajusta una sola vez", async () => {
    const p = await product(a, "Doble cierre");
    await move(a, { productId: p, kind: "IN", quantity: 10, unitCost: 5, warehouseId: sur });
    const c = await createCount(a, sur, "u1");
    if (!c.ok) throw new Error(c.message);
    const line = (await getCount(a, c.id))!.lines.find((l) => l.productName === "Doble cierre")!;
    await saveCountLines(a, c.id, [{ lineId: line.id, counted: 7 }]);
    const results = await Promise.all(Array.from({ length: 6 }, () => finalizeCount(a, c.id, "Merma", "u1")));
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect((await level(a, p, sur))?.quantity).toBe(7);
  });

  test("cancelar un conteo abierto; uno cerrado no", async () => {
    const c = await createCount(a, sur, "u1");
    if (!c.ok) throw new Error(c.message);
    expect(await cancelCount(a, c.id)).toMatchObject({ ok: true });
    expect((await getCount(a, c.id))?.status).toBe("CANCELED");
    expect(await cancelCount(a, c.id)).toMatchObject({ ok: false });
    expect(await createCount(b, sur, "u1")).toMatchObject({ ok: false }); // bodega de otro negocio
    expect(await getCount(b, c.id)).toBeNull();
  });

  test("reposición: niveles, lo ya pedido a proveedores y cuánto pedir", async () => {
    const p = await product(a, "Reponer", { minStock: 5 });
    await move(a, { productId: p, kind: "IN", quantity: 4, unitCost: 10, warehouseId: norte });
    expect(await setReorderLevels(a, p, { minStock: 5, maxStock: 30, reorderPoint: 8 })).toMatchObject({ ok: true });
    expect(await setReorderLevels(a, p, { minStock: 5, maxStock: 3, reorderPoint: 8 })).toMatchObject({ ok: false });
    let row = (await reorderOverview(a)).find((r) => r.productId === p)!;
    expect(row).toMatchObject({ stock: 4, onOrder: 0, suggested: 26, needsOrder: true }); // 30 − 4
    // pedir al proveedor 10 unidades: lo pedido se descuenta de lo sugerido
    const sup = await createParty(a, { legalName: "Proveedor de reposición", roles: ["SUPPLIER"] });
    if (!sup.ok) throw new Error("proveedor");
    const order = await createOrder(a, { supplierPartyId: sup.party.id, lines: [{ productId: p, quantity: 10, unitCost: 10 }] }, "u1");
    if (!order.ok) throw new Error(order.message);
    await markOrdered(a, order.id);
    row = (await reorderOverview(a)).find((r) => r.productId === p)!;
    expect(row).toMatchObject({ onOrder: 10, suggested: 16 });
    // otro negocio no ve ni toca estos niveles
    expect(await setReorderLevels(b, p, { minStock: 1, maxStock: null, reorderPoint: null })).toMatchObject({ ok: false });
    expect((await reorderOverview(b)).find((r) => r.productId === p)).toBeUndefined();
  });

  test("existencias por bodega solo del negocio y la API con permiso y módulo", async () => {
    const rows = await stockOverview(a);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.value === Math.round(r.quantity * r.avgCost * 100) / 100)).toBe(true);
    expect(await stockOverview(b)).toEqual([]);
    const ctx = (tenantId: string, role: string, modules = ["inventory"]) => ({ tenantId, role, activeModules: modules, actor: { type: "API_KEY" as const, id: "k" } });
    const wh = (await runOperation(OPERATIONS, ctx(a, "ADVISOR"), "inventory.list_warehouses", {})) as { items: { name: string; isDefault: boolean }[] };
    expect(wh.items.map((w) => w.name)).toEqual(expect.arrayContaining(["Norte", "Sur", "Principal"]));
    const sug = (await runOperation(OPERATIONS, ctx(a, "OWNER"), "inventory.reorder_suggestions", {})) as { items: { name: string; suggested: number }[] };
    expect(sug.items.every((i) => i.suggested > 0)).toBe(true);
    await expect(runOperation(OPERATIONS, ctx(a, "ADVISOR"), "inventory.reorder_suggestions", {})).rejects.toMatchObject({ code: "forbidden" });
    await expect(runOperation(OPERATIONS, ctx(a, "OWNER", []), "inventory.list_warehouses", {})).rejects.toMatchObject({ code: "module_inactive" });
    expect(main).toBeTruthy();
  });
});
