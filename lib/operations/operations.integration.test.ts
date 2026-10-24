import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { db } from "@/prisma/db";
import { createAdminDb } from "@/lib/admin/db";
import { deleteTenantCompletely } from "@/lib/tenant/deletion";
import { run, type OperationContext } from "./registry";

/**
 * Las operaciones de lectura contra una base real y con DOS negocios: cada una
 * solo ve lo suyo, y el módulo y el permiso se exigen en el servidor.
 */
const TEST_URL = process.env.TEST_DATABASE_URL;
const normalize = (url: string | undefined) => (url ?? "").replace(/\?.*$/, "");

describe.skipIf(!TEST_URL)("operaciones de lectura (integración)", () => {
  const suffix = Date.now().toString(36);
  let a = "";
  let b = "";
  let productA = "";
  let productB = "";

  const ctx = (tenantId: string, over: Partial<OperationContext> = {}): OperationContext => ({
    tenantId,
    role: "OWNER",
    activeModules: ["crm", "inventory", "finance"],
    actor: { type: "API_KEY", id: "llave-de-prueba" },
    ...over,
  });

  beforeAll(async () => {
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) {
      throw new Error("Estas pruebas exigen una base aparte: DATABASE_URL debe ser igual a TEST_DATABASE_URL.");
    }
    const make = (name: string, slug: string) =>
      createAdminDb().createTenant({ name, slug, vertical: "gym", modules: [], tenantType: "COMPANY", ownerEmail: `${slug}@ejemplo.com` });
    a = String((await make("Gimnasio A", `ops-a-${suffix}`)).id);
    b = String((await make("Gimnasio B", `ops-b-${suffix}`)).id);

    await db.orm.public.Customer.create({ tenantId: a, name: "María Fernanda Ríos", email: "maria@a.co" });
    await db.orm.public.Customer.create({ tenantId: b, name: "María Torres", email: "maria@b.co" });
    productA = String((await db.orm.public.Product.create({ tenantId: a, name: "Camiseta A", kind: "PRODUCT", price: "35000.00", trackStock: true, stock: 2, minStock: 5, active: true })).id);
    productB = String((await db.orm.public.Product.create({ tenantId: b, name: "Camiseta B", kind: "PRODUCT", price: "40000.00", trackStock: true, stock: 50, minStock: 5, active: true })).id);
  });

  afterAll(async () => {
    for (const id of [a, b]) if (id) await deleteTenantCompletely(id);
    await db.close();
  });

  test("customers.search solo devuelve clientes del propio negocio y lo mínimo", async () => {
    const resA = (await run(ctx(a), "customers.search", { q: "mar" })) as { total: number; items: Record<string, unknown>[] };
    expect(resA.items.map((c) => c.name)).toEqual(["María Fernanda Ríos"]);
    expect(Object.keys(resA.items[0]).sort()).toEqual(["city", "email", "id", "name", "phone"]);
    const resB = (await run(ctx(b), "customers.search", { q: "mar" })) as { items: { name: string }[] };
    expect(resB.items.map((c) => c.name)).toEqual(["María Torres"]);
  });

  test("products.search e inventory.check_stock no cruzan negocios", async () => {
    const found = (await run(ctx(a), "products.search", { q: "camiseta" })) as { items: { name: string; stock: number }[] };
    expect(found.items.map((p) => p.name)).toEqual(["Camiseta A"]);
    const stock = (await run(ctx(a), "inventory.check_stock", { productId: productA })) as { stock: number; low: boolean };
    expect(stock).toMatchObject({ stock: 2, low: true });
    // El producto del otro negocio no existe para este.
    await expect(run(ctx(a), "inventory.check_stock", { productId: productB })).rejects.toMatchObject({ status: 404 });
  });

  test("finance.get_summary y sales.list_recent exigen permiso de dinero y módulo", async () => {
    const summary = (await run(ctx(a), "finance.get_summary", { days: 7 })) as { current: { count: number } };
    expect(summary.current.count).toBe(0);
    await expect(run(ctx(a, { role: "NO_EXISTE" }), "finance.get_summary", {})).rejects.toMatchObject({ code: "forbidden" });
    await expect(run(ctx(a, { activeModules: ["crm"] }), "sales.list_recent", {})).rejects.toMatchObject({ code: "module_inactive" });
    expect(await run(ctx(a), "sales.list_recent", { limit: 5 })).toEqual({ items: [] });
  });

  test("business.get_summary: el dinero solo sale si la persona lo puede ver", async () => {
    const owner = (await run(ctx(a), "business.get_summary", {})) as Record<string, unknown>;
    expect(owner).toMatchObject({ name: "Gimnasio A", vertical: "gym" });
    expect(owner.last7Days).toBeDefined();
    const noMoney = (await run(ctx(a, { role: "NO_EXISTE" }), "business.get_summary", {})) as Record<string, unknown>;
    expect(noMoney.last7Days).toBeUndefined();
    expect(noMoney.name).toBe("Gimnasio A");
  });

  test("entrada inválida → 422 sin tocar la base", async () => {
    await expect(run(ctx(a), "customers.search", { q: "a" })).rejects.toMatchObject({ code: "invalid_input", status: 422 });
  });
});
