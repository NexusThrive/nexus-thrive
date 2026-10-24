import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { db } from "@/prisma/db";
import { createAdminDb } from "@/lib/admin/db";
import { confirmIntent } from "@/lib/payments/intents-db";
import { presenceV2 } from "@/lib/presence/pillars-db";
import { saveSite } from "@/lib/site/site-db";
import { placeOrder } from "@/lib/store/store-db";
import { deleteTenantCompletely } from "@/lib/tenant/deletion";
import { attributionStats, createLead, createLink, createReview, growthReport, handleReview, listLinks, listReviews, reputationOf, resolveLink, setLinkActive } from "./growth-db";

/** Atribución y reputación de punta a punta contra Postgres real y DOS negocios. */
const TEST_URL = process.env.TEST_DATABASE_URL;
const normalize = (url: string | undefined) => (url ?? "").replace(/\?.*$/, "");
const customer = { name: "María Pérez", phone: "300 123 4567", email: "", address: "Calle 1", city: "Bogotá", notes: "" };
const IG = { source: "instagram", medium: "social", campaign: "octubre" };

describe.skipIf(!TEST_URL)("atribución y reputación (integración)", () => {
  const suffix = Date.now().toString(36);
  let a = "";
  let b = "";
  let product = "";
  const slug = `gr-${suffix}`;

  beforeAll(async () => {
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) throw new Error("DATABASE_URL debe ser igual a TEST_DATABASE_URL.");
    const make = (name: string, s: string) => createAdminDb().createTenant({ name, slug: s, vertical: "retail", modules: ["inventory", "payments"], tenantType: "COMPANY", ownerEmail: `${s}@ejemplo.com` });
    a = String((await make("Negocio A", `gr-a-${suffix}`)).id);
    b = String((await make("Negocio B", `gr-b-${suffix}`)).id);
    product = (await db.orm.public.Product.create({ tenantId: a, name: "Plan", price: "100000.00", publishedOnline: true })).id;
    await saveSite(a, { enabled: true, siteSlug: slug, template: "clasica", title: "", description: "", heroTitle: "", heroSubtitle: "", about: "", accent: "#D4AF37", showCatalog: true, showMap: true });
  });
  afterAll(async () => {
    for (const id of [a, b]) if (id) await deleteTenantCompletely(id);
    await db.close();
  });

  test("enlace corto con UTM: valida, cuenta clics sin perderlos y respeta apagado y aislamiento", async () => {
    expect(await createLink(a, { name: "x", utmSource: "instagram", utmMedium: "social", utmCampaign: "octubre", spend: 0 })).toMatchObject({ ok: false });
    expect(await createLink(a, { name: "Producto ajeno", utmSource: "ig", utmMedium: "social", utmCampaign: "c", spend: 0, path: "/p/00000000-0000-0000-0000-000000000000" })).toMatchObject({ ok: false, message: expect.stringContaining("no existe") });
    const l = await createLink(a, { name: "Instagram octubre", ...{ utmSource: "Instagram", utmMedium: "Social", utmCampaign: "Octubre" }, spend: 200_000 });
    if (!l.ok) throw new Error(l.message);
    expect(l.code).toMatch(/^[a-z0-9]{7}$/);
    await Promise.all(Array.from({ length: 6 }, () => resolveLink(l.code)));
    expect(await resolveLink(l.code)).toMatchObject({ siteSlug: slug, utmSource: "instagram", utmMedium: "social", utmCampaign: "octubre" });
    expect((await listLinks(a))[0]!.clicks).toBeGreaterThanOrEqual(6); // varios a la vez pueden competir; ninguno se pierde por completo
    expect(await resolveLink("no-existe")).toBeNull();
    const row = (await listLinks(a))[0]!;
    expect(await setLinkActive(b, row.id, false)).toBe(false);
    expect(await setLinkActive(a, row.id, false)).toBe(true);
    expect(await resolveLink(l.code)).toBeNull();
    expect(await listLinks(b)).toEqual([]);
    await setLinkActive(a, row.id, true);
  });

  test("contactos y ventas guardan su origen (limpio) y el reporte los junta con la inversión", async () => {
    expect(await createLead(slug, { name: "Ma", phone: "1", email: "malo", message: "", origin: IG })).toMatchObject({ ok: false, fields: { name: expect.any(String), phone: expect.any(String), email: expect.any(String) } });
    for (let i = 0; i < 3; i++) expect(await createLead(slug, { name: "Cliente " + i, phone: "300 123 456" + i, email: "", message: "Quiero info", origin: IG })).toEqual({ ok: true });
    expect(await createLead(slug, { name: "Directo Uno", phone: "3001234560", email: "", message: "", origin: { source: "<script>", medium: "", campaign: "" } })).toEqual({ ok: true });
    expect(await createLead("no-existe", { name: "Ma Pérez", phone: "3001234567", email: "", message: "", origin: null })).toMatchObject({ ok: false });
    // Dos ventas pagadas desde Instagram y una directa.
    for (const origin of [IG, IG, undefined]) {
      const o = await placeOrder(slug, { customer, lines: [{ productId: product, quantity: 1 }], origin });
      if (!o.ok) throw new Error(o.message);
      await confirmIntent(a, o.reference, { kind: "MANUAL", evidence: "Transferencia " + Math.random().toString().slice(2, 8), userId: "u" });
    }
    const report = await growthReport(a);
    const ig = report.rows.find((r) => r.label === "instagram / social / octubre")!;
    expect(ig).toMatchObject({ spend: 200_000, leads: 3, orders: 2, revenue: 200_000, roas: 1, costPerLead: 66_667 });
    expect(report.rows.find((r) => r.label === "script / ninguno")?.leads).toBe(1); // lo raro se limpia, no se ejecuta ni se guarda crudo
    expect(report.rows.find((r) => r.label === "Directo")).toMatchObject({ orders: 1, revenue: 100_000 });
    expect((await growthReport(b)).rows).toEqual([]);
    // 3 + 1 contactos y 3 ventas = 7 entradas digitales; con campaña identificada: 3 + 2 + 1 (el origen raro cuenta como una fuente) = 6.
    expect(await attributionStats(a)).toEqual({ withOrigin: 6, total: 7 });
    expect(await attributionStats(b)).toBeNull();
  });

  test("las reseñas: 4–5 estrellas invitan a Google; 1–2 quedan en alerta con su evento; se atienden", async () => {
    expect(await createReview(slug, { rating: 9, comment: "", name: "", contact: "" })).toMatchObject({ ok: false });
    const good = await createReview(slug, { rating: 5, comment: "Excelente", name: "Ana", contact: "" });
    expect(good).toMatchObject({ ok: true, low: false, googleReviewUrl: null }); // sin ficha de Google conectada
    await db.orm.public.GoogleListing.create({ tenantId: a, placeId: "ChIJN1t_tDeuEmsRUsoyG83frY4", status: "OK", rating: "4.0", ratingCount: 20 });
    expect(await createReview(slug, { rating: 4, comment: "Bien", name: "", contact: "" })).toMatchObject({ ok: true, googleReviewUrl: expect.stringContaining("writereview?placeid=ChIJ") });
    const bad = await createReview(slug, { rating: 1, comment: "Llegó tarde", name: "Pedro", contact: "3009998877" });
    expect(bad).toMatchObject({ ok: true, low: true, googleReviewUrl: null });
    const low = (await listReviews(a)).find((r) => r.rating === 1)!;
    expect(low.status).toBe("ALERTED");
    expect((await db.orm.public.OutboxEvent.where({ tenantId: a, type: "review.low" }).all()).length).toBe(1);
    expect(await handleReview(b, low.id)).toBe(false);
    expect(await handleReview(a, low.id)).toBe(true);
    expect((await listReviews(a)).find((r) => r.id === low.id)!.status).toBe("HANDLED");
    expect(await listReviews(b)).toEqual([]);
  });

  test("la reputación combina las reseñas internas con la calificación de Google y alimenta los pilares de presencia", async () => {
    const rep = (await reputationOf(a))!;
    // internas: 5, 4, 1 (promedio 3,33; 3) + Google 4,0 (20) → (10 + 80)/23 = 3,91
    expect(rep).toMatchObject({ count: 23, average: 3.91, alerts: 0 });
    expect(await reputationOf(b)).toBeNull();
    const pillars = (await presenceV2(a)).pillars;
    expect(pillars.find((p) => p.key === "reputation")!.score).not.toBeNull();
    expect(pillars.find((p) => p.key === "attribution")!.score).toBe(86); // 6 de 7
    expect((await presenceV2(b)).pillars.find((p) => p.key === "reputation")!.score).toBeNull();
  });
});
