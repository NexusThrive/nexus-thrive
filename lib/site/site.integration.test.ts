import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { db } from "@/prisma/db";
import { createAdminDb } from "@/lib/admin/db";
import { deleteTenantCompletely } from "@/lib/tenant/deletion";
import { publicSite, saveSite, setPublished, siteForEditor, type SiteInput } from "./site-db";

/** Mini-sitio contra Postgres real y DOS negocios. */
const TEST_URL = process.env.TEST_DATABASE_URL;
const normalize = (url: string | undefined) => (url ?? "").replace(/\?.*$/, "");

describe.skipIf(!TEST_URL)("mini-sitio (integración)", () => {
  const suffix = Date.now().toString(36);
  let a = "";
  let b = "";
  const input = (over: Partial<SiteInput> = {}): SiteInput => ({ enabled: true, siteSlug: `gym-${suffix}`, template: "moderna", title: "", description: "", heroTitle: "", heroSubtitle: "", about: "Somos un gimnasio de barrio.", accent: "#D4AF37", showCatalog: true, showMap: true, ...over });

  beforeAll(async () => {
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) throw new Error("DATABASE_URL debe ser igual a TEST_DATABASE_URL.");
    const make = (name: string, slug: string) => createAdminDb().createTenant({ name, slug, vertical: "gym", modules: ["inventory"], tenantType: "COMPANY", ownerEmail: `${slug}@ejemplo.com` });
    a = String((await make("Simplapp Gym", `si-a-${suffix}`)).id);
    b = String((await make("Otro Negocio", `si-b-${suffix}`)).id);
    await db.orm.public.Tenant.where({ id: a }).update({ city: "Bogotá", address: "Calle 80 # 12-34", whatsappNumber: "+573001234567" });
  });
  afterAll(async () => {
    for (const id of [a, b]) if (id) await deleteTenantCompletely(id);
    await db.close();
  });

  test("sin guardar o sin publicar, el sitio público no existe (no se distingue)", async () => {
    expect(await publicSite(`gym-${suffix}`)).toBeNull();
    expect(await saveSite(a, input({ enabled: false }))).toEqual({ ok: true });
    expect(await publicSite(`gym-${suffix}`)).toBeNull();
  });

  test("publicado: trae textos por defecto del negocio, su plantilla y solo los productos marcados y activos", async () => {
    const p1 = (await db.orm.public.Product.create({ tenantId: a, name: "Plan mensual", price: "120000.00", description: "Acceso total" })).id;
    const p2 = (await db.orm.public.Product.create({ tenantId: a, name: "Interno", price: "5000.00" })).id;
    const p3 = (await db.orm.public.Product.create({ tenantId: a, name: "Descontinuado", price: "1000.00", active: false })).id;
    expect(await setPublished(a, [p1, p3])).toBe(1); // el inactivo no se puede publicar
    expect(await saveSite(a, input())).toEqual({ ok: true });
    const site = (await publicSite(`gym-${suffix}`))!;
    expect(site).toMatchObject({ template: "moderna", title: "Simplapp Gym en Bogotá", heroTitle: "Simplapp Gym", about: "Somos un gimnasio de barrio.", business: { whatsapp: "+573001234567" } });
    expect(site.products.map((p) => p.name)).toEqual(["Plan mensual"]); // el inactivo y el no marcado no salen
    void p2;
    const ed = await siteForEditor(a);
    expect(ed.catalog.map((c) => [c.name, c.published])).toEqual([["Interno", false], ["Plan mensual", true]]);
  });

  test("la dirección es única en toda la plataforma, validada y reservada", async () => {
    expect(await saveSite(b, input())).toMatchObject({ ok: false, field: "siteSlug", message: expect.stringContaining("otro negocio") });
    expect(await saveSite(b, input({ siteSlug: "admin" }))).toMatchObject({ ok: false, field: "siteSlug" });
    expect(await saveSite(b, input({ siteSlug: "Con Espacio" }))).toMatchObject({ ok: false });
    expect(await saveSite(b, input({ siteSlug: `otro-${suffix}`, accent: "rojo" }))).toMatchObject({ ok: false, field: "accent" });
    expect(await saveSite(b, input({ siteSlug: `otro-${suffix}`, title: "x".repeat(71) }))).toMatchObject({ ok: false, field: "title" });
    expect(await saveSite(b, input({ siteSlug: `otro-${suffix}`, enabled: false }))).toEqual({ ok: true });
    // Cambiar la dirección de A libera la anterior y el sitio se mueve.
    expect(await saveSite(a, input({ siteSlug: `gym-nuevo-${suffix}` }))).toEqual({ ok: true });
    expect(await publicSite(`gym-${suffix}`)).toBeNull();
    expect(await publicSite(`gym-nuevo-${suffix}`)).not.toBeNull();
  });

  test("aislamiento: publicar productos del otro negocio por id no los marca; B no ve nada de A", async () => {
    const mine = (await db.orm.public.Product.where({ tenantId: a, name: "Interno" }).first())!.id;
    expect(await setPublished(b, [mine])).toBe(0);
    expect((await db.orm.public.Product.where({ tenantId: a, id: mine }).first())!.publishedOnline).toBe(false);
    expect((await siteForEditor(b)).catalog).toEqual([]);
    expect((await publicSite(`otro-${suffix}`))).toBeNull(); // B sigue sin publicar
  });
});
