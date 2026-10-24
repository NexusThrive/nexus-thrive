import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { db } from "@/prisma/db";
import { createAdminDb } from "@/lib/admin/db";
import { runOperation } from "@/lib/operations/engine";
import { OPERATIONS } from "@/lib/operations/registry";
import { deleteTenantCompletely } from "@/lib/tenant/deletion";
import { addBarcode, createPriceList, createVariant, findByBarcode, listVariants, resolvePrice, setDefaultPriceList, setListPrice, setProductTax } from "./catalog-db";

/** Catálogo maestro contra Postgres real y con DOS negocios. */
const TEST_URL = process.env.TEST_DATABASE_URL;
const normalize = (url: string | undefined) => (url ?? "").replace(/\?.*$/, "");

describe.skipIf(!TEST_URL)("catálogo maestro (integración)", () => {
  const suffix = Date.now().toString(36);
  let a = "";
  let b = "";
  let camiseta = "";
  let varM = "";
  let varL = "";
  let publico = "";
  let mayorista = "";
  const ean = "4006381333931";

  beforeAll(async () => {
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) throw new Error("DATABASE_URL debe ser igual a TEST_DATABASE_URL.");
    const make = (name: string, slug: string) => createAdminDb().createTenant({ name, slug, vertical: "gym", modules: ["inventory"], tenantType: "COMPANY", ownerEmail: `${slug}@ejemplo.com` });
    a = String((await make("Tienda A", `cm-a-${suffix}`)).id);
    b = String((await make("Tienda B", `cm-b-${suffix}`)).id);
    camiseta = (await db.orm.public.Product.create({ tenantId: a, name: "Camiseta NEXUS", price: "50000.00", trackStock: true, stock: 12 })).id;
  });
  afterAll(async () => {
    for (const id of [a, b]) if (id) await deleteTenantCompletely(id);
    await db.close();
  });

  test("un producto con tallas y dos listas de precios se busca por código de barras", async () => {
    const m = await createVariant(a, camiseta, { name: "Talla M", sku: `CAM-M-${suffix}`, attributes: { talla: "M" } });
    const l = await createVariant(a, camiseta, { name: "Talla L", sku: `CAM-L-${suffix}`, attributes: { talla: "L" }, price: 55000 });
    if (!m.ok || !l.ok) throw new Error("variantes");
    varM = m.id;
    varL = l.id;
    expect((await listVariants(a, camiseta)).map((v) => v.name)).toEqual(["Talla L", "Talla M"]);

    expect(await addBarcode(a, { productId: camiseta, variantId: varM, code: ean })).toMatchObject({ ok: true });
    expect(await addBarcode(a, { productId: camiseta, variantId: varL, code: `INT-${suffix}` })).toMatchObject({ ok: true });

    const pub = await createPriceList(a, { name: "Público", isDefault: true });
    const may = await createPriceList(a, { name: "Mayorista" });
    if (!pub.ok || !may.ok) throw new Error("listas");
    publico = pub.id;
    mayorista = may.id;
    await setListPrice(a, { priceListId: publico, productId: camiseta, price: 52000 }); // producto
    await setListPrice(a, { priceListId: mayorista, productId: camiseta, price: 40000 });
    await setListPrice(a, { priceListId: mayorista, productId: camiseta, variantId: varL, price: 43000 }); // variante

    // Lista predeterminada (Público): M cae al precio de la lista para el producto.
    expect(await findByBarcode(a, ean)).toMatchObject({ product: { name: "Camiseta NEXUS", stock: 12 }, variant: { name: "Talla M", attributes: { talla: "M" } }, price: 52000, priceSource: "list_product" });
    // Con la lista mayorista elegida.
    expect(await findByBarcode(a, ean, mayorista)).toMatchObject({ price: 40000, priceSource: "list_product" });
    expect(await findByBarcode(a, `INT-${suffix}`, mayorista)).toMatchObject({ variant: { name: "Talla L" }, price: 43000, priceSource: "list_variant" });
    // El lector mete saltos y espacios: se limpian.
    expect(await findByBarcode(a, ` ${ean}\n`)).toMatchObject({ price: 52000 });
    expect(await findByBarcode(a, "9999999999994")).toBeNull();
  });

  test("sin lista de precios cae al precio de la variante y luego al del producto", async () => {
    expect(await resolvePrice(a, { productId: camiseta, variantId: varL, priceListId: "no-existe" })).toEqual({ price: 55000, source: "variant" });
    expect(await resolvePrice(a, { productId: camiseta, variantId: varM, priceListId: "no-existe" })).toEqual({ price: 50000, source: "product" });
    expect(await resolvePrice(a, { productId: "otro-producto" })).toBeNull();
  });

  test("un código es único por negocio y exige dígito verificador; otro negocio puede usar el mismo", async () => {
    expect(await addBarcode(a, { productId: camiseta, code: ean })).toMatchObject({ ok: false, code: "duplicate_barcode" });
    expect(await addBarcode(a, { productId: camiseta, code: "4006381333930" })).toMatchObject({ ok: false, code: "invalid_barcode" });
    const other = (await db.orm.public.Product.create({ tenantId: b, name: "Camiseta B", price: "30000.00" })).id;
    expect(await addBarcode(b, { productId: other, code: ean })).toMatchObject({ ok: true });
    expect(await findByBarcode(b, ean)).toMatchObject({ product: { name: "Camiseta B" }, price: 30000 });
  });

  test("aislamiento: un producto, variante o lista de otro negocio no se toca ni se lee", async () => {
    expect(await createVariant(b, camiseta, { name: "Intruso" })).toMatchObject({ ok: false });
    expect(await addBarcode(b, { productId: camiseta, variantId: varM, code: `X-${suffix}` })).toMatchObject({ ok: false });
    expect(await setListPrice(b, { priceListId: mayorista, productId: camiseta, price: 1 })).toMatchObject({ ok: false });
    expect(await setDefaultPriceList(b, publico)).toBe(false);
    expect(await resolvePrice(b, { productId: camiseta })).toBeNull();
  });

  test("solo una lista es la predeterminada; nombre de lista único; un precio por ítem", async () => {
    await setDefaultPriceList(a, mayorista);
    const defaults = (await db.orm.public.PriceList.where({ tenantId: a, isDefault: true }).all()).map((l) => l.name);
    expect(defaults).toEqual(["Mayorista"]);
    expect(await createPriceList(a, { name: "Mayorista" })).toMatchObject({ ok: false, code: "duplicate_name" });
    await Promise.all(Array.from({ length: 6 }, (_, i) => setListPrice(a, { priceListId: publico, productId: camiseta, variantId: varM, price: 1000 + i })));
    expect(await db.orm.public.PriceListItem.where({ tenantId: a, priceListId: publico, variantId: varM }).all()).toHaveLength(1);
  });

  test("SKU de variante único por negocio", async () => {
    expect(await createVariant(a, camiseta, { name: "Duplicada", sku: `CAM-M-${suffix}` })).toMatchObject({ ok: false, code: "duplicate_sku" });
  });

  test("clasificación fiscal: gravado con tarifa; excluido y exento no cobran IVA", async () => {
    expect(await setProductTax(a, camiseta, { taxCategory: "GRAVADO", taxRatePct: 19, unitCode: "EA" })).toMatchObject({ ok: true });
    let p = await db.orm.public.Product.where({ tenantId: a, id: camiseta }).first();
    expect([p?.taxCategory, Number(p?.taxRatePct), p?.unitCode]).toEqual(["GRAVADO", 19, "EA"]);
    await setProductTax(a, camiseta, { taxCategory: "EXENTO", taxRatePct: 19 });
    p = await db.orm.public.Product.where({ tenantId: a, id: camiseta }).first();
    expect([p?.taxCategory, Number(p?.taxRatePct)]).toEqual(["EXENTO", 0]);
    expect(await setProductTax(a, camiseta, { taxCategory: "GRAVADO", taxRatePct: 190 })).toMatchObject({ ok: false });
    expect(await setProductTax(b, camiseta, { taxCategory: "EXENTO" })).toMatchObject({ ok: false });
  });

  test("la operación de la API busca por código y respeta el negocio y el módulo", async () => {
    const ctx = (tenantId: string, modules = ["inventory"]) => ({ tenantId, role: "ADVISOR", activeModules: modules, actor: { type: "API_KEY" as const, id: "k" } });
    const hit = (await runOperation(OPERATIONS, ctx(a), "products.find_by_barcode", { code: ean })) as { product: { name: string }; price: number };
    expect(hit.product.name).toBe("Camiseta NEXUS");
    expect((await runOperation(OPERATIONS, ctx(b), "products.find_by_barcode", { code: ean }) as { product: { name: string } }).product.name).toBe("Camiseta B");
    await expect(runOperation(OPERATIONS, ctx(a), "products.find_by_barcode", { code: "9999999999994" })).rejects.toMatchObject({ status: 404 });
    await expect(runOperation(OPERATIONS, ctx(a, []), "products.find_by_barcode", { code: ean })).rejects.toMatchObject({ code: "module_inactive" });
  });
});
