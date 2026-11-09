import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { db } from "@/prisma/db";
import { createAdminDb } from "@/lib/platform/admin/db";
import { deleteTenantCompletely } from "@/lib/core/tenancy/deletion";
import { createLead } from "@/lib/business/growth/growth-db";
import { createOpportunity, listOpportunities, loseOpportunity, migrateContactLeads, moveStage, setNextAction, winOpportunity } from "@/lib/business/growth/opportunities-db";
import { findOrCreateContact } from "@/lib/business/customers/contacts-db";
import { confirmIntent } from "@/lib/domains/finance/payments/intents-db";
import { placeOrder } from "@/lib/business/store/store-db";
import { composePorts } from "@/lib/runtime/ports";

/** HU-leads-01: seguir a cada interesado hasta que compra o se pierde, sin duplicar al contacto. */
const TEST_URL = process.env.TEST_DATABASE_URL;
const normalize = (url: string | undefined) => (url ?? "").replace(/\?.*$/, "");

describe.skipIf(!TEST_URL)("oportunidades (integración)", () => {
  const suffix = Date.now().toString(36);
  let a = "";
  let b = "";
  let siteSlug = "";
  let productId = "";

  beforeAll(async () => {
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) throw new Error("DATABASE_URL debe ser igual a TEST_DATABASE_URL.");
    composePorts();
    const admin = createAdminDb();
    a = String((await admin.createTenant({ name: "Oportunidades A", slug: `oa2-${suffix}`, vertical: "retail", modules: ["crm", "website"], tenantType: "COMPANY", ownerEmail: `oa2-${suffix}@ejemplo.com` })).id);
    b = String((await admin.createTenant({ name: "Oportunidades B", slug: `ob2-${suffix}`, vertical: "retail", modules: ["crm"], tenantType: "COMPANY", ownerEmail: `ob2-${suffix}@ejemplo.com` })).id);
    siteSlug = `op-${suffix}`;
    await db.orm.public.SiteConfig.create({ tenantId: a, siteSlug, enabled: true, showCatalog: true, enableContactForm: true } as never).catch(async () => db.orm.public.SiteConfig.create({ tenantId: a, siteSlug, enabled: true, showCatalog: true } as never));
    productId = (await db.orm.public.Product.create({ tenantId: a, name: "Camiseta", price: "50000.00", kind: "PRODUCT", active: true, publishedOnline: true, trackStock: false } as never)).id;
  });
  afterAll(async () => {
    for (const id of [a, b]) if (id) await deleteTenantCompletely(id);
    await db.close();
  });

  test("un formulario del sitio crea el contacto y su oportunidad abierta; el mismo teléfono no duplica a la persona", async () => {
    const r = await createLead(siteSlug, { name: "Camila Torres", phone: "300 111 2233", email: "", message: "Quiero 40 camisetas", origin: null });
    expect(r.ok).toBe(true);
    await createLead(siteSlug, { name: "Camila", phone: "+57 3001112233", email: "", message: "Y también gorras", origin: null });
    const customers = (await db.orm.public.Customer.where({ tenantId: a }).all()).filter((c) => c.phoneNorm === "573001112233");
    expect(customers).toHaveLength(1);
    expect(customers[0]).toMatchObject({ source: "WEB", stage: "PROSPECT" });
    const open = await listOpportunities(a);
    expect(open).toHaveLength(2);
    expect(open.every((o) => o.customerId === customers[0]!.id && o.stage === "NEW")).toBe(true);
  });

  test("la compra pagada gana la oportunidad abierta de esa persona sin crear otra ficha", async () => {
    expect((await placeOrder(siteSlug, { customer: { name: "Camila Torres", phone: "3001112233", email: "", address: "", city: "", notes: "" }, lines: [{ productId, quantity: 2 }] })).ok).toBe(true);
    const intent = await db.orm.public.PaymentIntent.where({ tenantId: a }).orderBy((i) => i.createdAt.desc()).first();
    expect((await confirmIntent(a, intent!.reference, { kind: "MANUAL", evidence: "Transferencia 112233", userId: "u" })).ok).toBe(true);
    expect(await listOpportunities(a, "OPEN")).toHaveLength(0);
    const won = await listOpportunities(a, "WON");
    expect(won).toHaveLength(2);
    const order = await db.orm.public.StoreOrder.where({ tenantId: a }).first();
    expect((await db.orm.public.Opportunity.where({ tenantId: a, status: "WON" }).first())?.orderId).toBe(order!.id);
    expect((await db.orm.public.Customer.where({ tenantId: a }).all()).filter((c) => c.phoneNorm === "573001112233")).toHaveLength(1);
    expect((await db.orm.public.Customer.where({ tenantId: a, phoneNorm: "573001112233" }).first())?.stage).toBe("CUSTOMER");
  });

  test("etapa, siguiente paso, ganar y perder con motivo; solo las abiertas se mueven", async () => {
    const contact = await findOrCreateContact({ orm: db.orm }, a, { name: "Laura Pérez", phone: "310 555 0000", source: "MANUAL" });
    const created = await db.transaction((tx) => createOpportunity(tx, a, { customerId: contact!.id, interest: "Gorras bordadas", estimatedValue: 300_000 }));
    if (!created.ok) throw new Error(created.message);
    expect(await moveStage(a, created.id, "QUOTED")).toEqual({ ok: true });
    expect(await moveStage(b, created.id, "QUOTED")).toMatchObject({ ok: false });
    expect(await setNextAction(a, created.id, "ab", null)).toMatchObject({ ok: false });
    expect(await setNextAction(a, created.id, "Enviar cotización", Temporal.Instant.from("2026-11-10T17:00:00Z"))).toEqual({ ok: true });
    expect(await loseOpportunity(a, created.id, "")).toMatchObject({ ok: false });
    expect(await loseOpportunity(a, created.id, "Compró en otro lado")).toEqual({ ok: true });
    expect(await moveStage(a, created.id, "NEW")).toMatchObject({ ok: false });
    expect((await listOpportunities(a, "LOST"))[0]).toMatchObject({ lostReason: "Compró en otro lado", nextAction: null });
    expect(await db.transaction((tx) => winOpportunity(tx, a, created.id))).toMatchObject({ ok: false });
    expect(await db.transaction((tx) => createOpportunity(tx, a, { customerId: "00000000-0000-0000-0000-000000000000", interest: "Algo" }))).toMatchObject({ ok: false });
  });

  test("los contactos del formulario que ya existían migran a oportunidades, una sola vez", async () => {
    await db.orm.public.ContactLead.create({ tenantId: b, name: "Viejo Contacto", phone: "320 777 8888", message: "Quería cotizar" });
    await db.orm.public.ContactLead.create({ tenantId: b, name: "Otro Viejo", phone: "321 888 9999" });
    expect(await migrateContactLeads(b)).toEqual({ migrated: 2, skipped: 0 });
    expect(await migrateContactLeads(b)).toEqual({ migrated: 0, skipped: 2 });
    const open = await listOpportunities(b);
    expect(open.map((o) => o.interest).sort()).toEqual(["Escribió desde el sitio", "Quería cotizar"]);
    expect((await db.orm.public.Customer.where({ tenantId: b }).all()).map((c) => c.phoneNorm).sort()).toEqual(["573208778888".replace("8778888", "7778888"), "573218889999"].sort());
    expect(await listOpportunities(a)).not.toEqual(expect.arrayContaining(open));
  });
});
