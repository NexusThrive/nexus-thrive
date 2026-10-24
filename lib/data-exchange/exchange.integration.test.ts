import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { db } from "@/prisma/db";
import { createAdminDb } from "@/lib/admin/db";
import { deleteTenantCompletely } from "@/lib/tenant/deletion";
import { exportCustomers, exportProducts, importCustomers, importProducts } from "./exchange-db";
import { readTable, type Table } from "./table";

/** Importar y exportar contra Postgres real y DOS negocios. */
const TEST_URL = process.env.TEST_DATABASE_URL;
const normalize = (url: string | undefined) => (url ?? "").replace(/\?.*$/, "");
const csv = (s: string): Table => {
  const r = readTable(new TextEncoder().encode(s).buffer as ArrayBuffer, "a.csv");
  if (!r.ok) throw new Error(r.message);
  return r.table;
};

describe.skipIf(!TEST_URL)("importar y exportar (integración)", () => {
  const suffix = Date.now().toString(36);
  let a = "";
  let b = "";

  beforeAll(async () => {
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) throw new Error("DATABASE_URL debe ser igual a TEST_DATABASE_URL.");
    const make = (name: string, slug: string) => createAdminDb().createTenant({ name, slug, vertical: "retail", modules: ["inventory", "crm"], tenantType: "COMPANY", ownerEmail: `${slug}@ejemplo.com` });
    a = String((await make("Tienda A", `ex-a-${suffix}`)).id);
    b = String((await make("Tienda B", `ex-b-${suffix}`)).id);
  });
  afterAll(async () => {
    for (const id of [a, b]) if (id) await deleteTenantCompletely(id);
    await db.close();
  });

  test("2 000 productos: crea con reporte por fila y reimportar no cambia nada", async () => {
    const lines = ["Nombre,SKU,Precio,Costo,Unidad,IVA"];
    for (let i = 1; i <= 2000; i++) lines.push(i % 500 === 0 ? `X${i},S${i},barato,,,` : `Artículo ${i},SKU-${i},${1000 + i},${500 + i},und,19`);
    const table = csv(lines.join("\n"));

    const dry = await importProducts(a, table, { dryRun: true });
    expect(dry).toMatchObject({ created: 1996, errors: expect.any(Array) });
    expect((await db.orm.public.Product.where({ tenantId: a }).all()).length).toBe(0); // la vista previa no escribe

    const first = await importProducts(a, table, { dryRun: false });
    expect(first).toMatchObject({ total: 2000, created: 1996, updated: 0, unchanged: 0 });
    expect(first.errors.map((e) => e.line)).toEqual([501, 1001, 1501, 2001]);
    expect(first.errors[0]?.message).toContain("Precio inválido");

    const again = await importProducts(a, table, { dryRun: false });
    expect(again).toMatchObject({ created: 0, updated: 0, unchanged: 1996 });
    expect((await db.orm.public.Product.where({ tenantId: a }).all()).length).toBe(1996);
  }, 120_000);

  test("un cambio en el archivo actualiza solo esa fila; el stock no se toca", async () => {
    const p = await db.orm.public.Product.where({ tenantId: a, sku: "SKU-7" }).first();
    await db.orm.public.Product.where({ tenantId: a, id: p!.id }).update({ stock: 9 });
    const r = await importProducts(a, csv("Nombre,SKU,Precio\nArtículo 7,SKU-7,5000"), { dryRun: false });
    expect(r).toMatchObject({ created: 0, updated: 1 });
    const after = await db.orm.public.Product.where({ tenantId: a, sku: "SKU-7" }).first();
    expect(Number(after!.price)).toBe(5000);
    expect(after!.stock).toBe(9);
  });

  test("sin SKU se empareja por nombre sin tildes ni mayúsculas", async () => {
    await importProducts(a, csv("Nombre,Precio\nCafé molido,8000"), { dryRun: false });
    const r = await importProducts(a, csv("Nombre,Precio\nCAFE  MOLIDO,8000"), { dryRun: false });
    expect(r.unchanged + r.updated).toBe(1);
    expect(r.created).toBe(0);
  });

  test("clientes: crea, empareja por documento aunque venga con puntos, suma etiquetas y no borra datos", async () => {
    const t1 = csv("Nombre,Documento,Correo,Teléfono,Etiquetas\nAna Gómez,1.020.304-050,ana@correo.com,3001234567,VIP\nBeto Ruiz,,beto@correo.com,,\nMala,,sin-arroba,,");
    const first = await importCustomers(a, t1, { dryRun: false });
    expect(first).toMatchObject({ created: 2, updated: 0, errors: [{ line: 4 }] });
    const again = await importCustomers(a, t1, { dryRun: false });
    expect(again).toMatchObject({ created: 0, updated: 0, unchanged: 2 });

    const upd = await importCustomers(a, csv("Nombre,Documento,Ciudad,Etiquetas\nAna Gómez Pérez,1020304050,Cali,referido"), { dryRun: false });
    expect(upd).toMatchObject({ created: 0, updated: 1 });
    const ana = await db.orm.public.Customer.where({ tenantId: a, email: "ana@correo.com" }).first();
    expect(ana).toMatchObject({ name: "Ana Gómez Pérez", city: "Cali", phone: "3001234567" });
    expect([...(ana!.tags ?? [])].sort()).toEqual(["VIP", "referido"]);
    expect(ana!.partyId).toBeTruthy(); // quedó en el tercero único
  });

  test("el límite de clientes del acuerdo se respeta fila por fila", async () => {
    await db.orm.public.Tenant.where({ id: b }).update({ maxCustomers: 2 });
    const r = await importCustomers(b, csv("Nombre,Documento\nUno,1\nDos,2\nTres,3"), { dryRun: false });
    expect(r.created).toBe(2);
    expect(r.errors).toEqual([{ line: 4, message: expect.stringContaining("2 clientes activos") }]);
  });

  test("aislamiento: lo importado en A no existe ni se empareja en B", async () => {
    expect((await db.orm.public.Product.where({ tenantId: b }).all()).length).toBe(0);
    const r = await importProducts(b, csv("Nombre,SKU,Precio\nArtículo 7,SKU-7,1"), { dryRun: false });
    expect(r.created).toBe(1);
    expect(Number((await db.orm.public.Product.where({ tenantId: a, sku: "SKU-7" }).first())!.price)).toBe(5000);
    expect(await exportCustomers(b)).not.toContain("Ana");
    expect(await exportProducts(b)).not.toContain("SKU-1999");
  });

  test("exportar y reimportar es idempotente (ida y vuelta)", async () => {
    const out = await exportProducts(a);
    const table = readTable(new TextEncoder().encode(out).buffer as ArrayBuffer, "p.csv");
    if (!table.ok) throw new Error(table.message);
    const r = await importProducts(a, table.table, { dryRun: false });
    expect(r).toMatchObject({ created: 0, updated: 0, errors: [] });
    const c = readTable(new TextEncoder().encode(await exportCustomers(a)).buffer as ArrayBuffer, "c.csv");
    if (!c.ok) throw new Error(c.message);
    expect(await importCustomers(a, c.table, { dryRun: false })).toMatchObject({ created: 0, updated: 0, errors: [] });
  }, 120_000);
});
