import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { db } from "@/prisma/db";
import { createAdminDb } from "@/lib/platform/admin/db";
import { deleteTenantCompletely } from "@/lib/core/tenancy/deletion";
import { duplicateGroups, findOrCreateContact, POSSIBLE_DUPLICATE_TAG } from "@/lib/business/customers/contacts-db";
import { saveCustomer } from "@/lib/business/customers/customers-db";
import { confirmIntent } from "@/lib/domains/finance/payments/intents-db";
import { placeOrder } from "@/lib/business/store/store-db";
import { composePorts } from "@/lib/runtime/ports";

/** HU-contacto-unico-01: una persona, una ficha, venga de donde venga. */
const TEST_URL = process.env.TEST_DATABASE_URL;
const normalize = (url: string | undefined) => (url ?? "").replace(/\?.*$/, "");

describe.skipIf(!TEST_URL)("contacto único (integración)", () => {
  const suffix = Date.now().toString(36);
  let a = "";
  let b = "";
  let siteSlug = "";
  let productId = "";
  const customers = (tenantId: string) => db.orm.public.Customer.where({ tenantId }).all();
  const order = (phone: string, name = "Camila Torres") => placeOrder(siteSlug, { customer: { name, phone, email: "", address: "", city: "", notes: "" }, lines: [{ productId, quantity: 1 }] });

  beforeAll(async () => {
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) throw new Error("DATABASE_URL debe ser igual a TEST_DATABASE_URL.");
    composePorts();
    const admin = createAdminDb();
    a = String((await admin.createTenant({ name: "Contactos A", slug: `ca-${suffix}`, vertical: "retail", modules: ["crm", "website"], tenantType: "COMPANY", ownerEmail: `ca-${suffix}@ejemplo.com` })).id);
    b = String((await admin.createTenant({ name: "Contactos B", slug: `cb-${suffix}`, vertical: "retail", modules: ["crm"], tenantType: "COMPANY", ownerEmail: `cb-${suffix}@ejemplo.com` })).id);
    siteSlug = `cu-${suffix}`;
    await db.orm.public.SiteConfig.create({ tenantId: a, siteSlug, enabled: true, showCatalog: true } as never);
    productId = (await db.orm.public.Product.create({ tenantId: a, name: "Gorra", price: "40000.00", kind: "PRODUCT", active: true, publishedOnline: true, trackStock: false } as never)).id;
  });
  afterAll(async () => {
    for (const id of [a, b]) if (id) await deleteTenantCompletely(id);
    await db.close();
  });

  test("el mismo teléfono desde la web y desde la tienda cae en una sola ficha", async () => {
    const web = await findOrCreateContact({ orm: db.orm }, a, { name: "Camila", phone: "+57 300 111 2233", source: "WEB", stage: "PROSPECT" });
    expect(web).toMatchObject({ created: true, conflict: false });
    expect((await order("300-111-2233")).ok).toBe(true);
    const mine = (await customers(a)).filter((c) => c.phoneNorm === "573001112233");
    expect(mine).toHaveLength(1);
    expect(mine[0]).toMatchObject({ id: web!.id, source: "WEB", stage: "PROSPECT", name: "Camila" });
    const stored = await db.orm.public.StoreOrder.where({ tenantId: a }).first();
    expect(stored?.customerId).toBe(web!.id);
  });

  test("pagar el pedido lo vuelve cliente y, desde la tercera compra, recurrente", async () => {
    const stage = async () => (await db.orm.public.Customer.where({ tenantId: a, phoneNorm: "573001112233" }).first())!.stage;
    const payLast = async () => {
      const intent = await db.orm.public.PaymentIntent.where({ tenantId: a }).orderBy((i) => i.createdAt.desc()).first();
      return confirmIntent(a, intent!.reference, { kind: "MANUAL", evidence: "Transferencia 998877", userId: "u" });
    };
    expect(await stage()).toBe("PROSPECT");
    expect((await payLast()).ok).toBe(true);
    expect(await stage()).toBe("CUSTOMER");
    for (let i = 0; i < 2; i++) {
      await order("3001112233");
      await payLast();
    }
    expect(await stage()).toBe("RECURRING");
    // Una ficha ya recurrente nunca baja de etapa por un contacto nuevo.
    await findOrCreateContact({ orm: db.orm }, a, { name: "Camila Torres", phone: "3001112233", source: "WEB", stage: "PROSPECT" });
    expect(await stage()).toBe("RECURRING");
  });

  test("el mismo teléfono con otro nombre NO se fusiona solo: queda como posible duplicado", async () => {
    const other = await findOrCreateContact({ orm: db.orm }, a, { name: "Andrés Gómez", phone: "300 111 2233", source: "STORE" });
    expect(other).toMatchObject({ created: true, conflict: true });
    const dup = await db.orm.public.Customer.where({ tenantId: a, id: other!.id }).first();
    expect(dup?.tags).toContain(POSSIBLE_DUPLICATE_TAG);
    const groups = await duplicateGroups(a);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.phoneNorm).toBe("573001112233");
    expect(groups[0]!.contacts.map((c) => c.name).sort()).toEqual(["Andrés Gómez", "Camila"]);
  });

  test("sin teléfono se busca por correo y no se mezclan negocios", async () => {
    const first = await findOrCreateContact({ orm: db.orm }, a, { name: "Laura Pérez", email: "Laura@Ejemplo.com", source: "WEB" });
    const again = await findOrCreateContact({ orm: db.orm }, a, { name: "Laura", email: "laura@ejemplo.com", source: "STORE" });
    expect(again).toMatchObject({ id: first!.id, created: false });
    const elsewhere = await findOrCreateContact({ orm: db.orm }, b, { name: "Laura Pérez", email: "laura@ejemplo.com", phone: "3001112233", source: "WEB" });
    expect(elsewhere).toMatchObject({ created: true });
    expect(elsewhere!.id).not.toBe(first!.id);
    expect((await customers(b)).filter((c) => c.phoneNorm === "573001112233")).toHaveLength(1);
  });

  test("guardar la ficha a mano también deja el teléfono canónico", async () => {
    const saved = await saveCustomer(a, null, { name: "Socio Manual", email: null, phone: "(57) 310 555 0000", documentId: null, birthDate: null, city: null, tags: [], profile: {} });
    if (!saved.ok) throw new Error(saved.message);
    expect(await db.orm.public.Customer.where({ tenantId: a, id: saved.id }).first()).toMatchObject({ phoneNorm: "573105550000", source: "MANUAL" });
    await saveCustomer(a, saved.id, { name: "Socio Manual", email: null, phone: "311 555 0000", documentId: null, birthDate: null, city: null, tags: [], profile: {} });
    expect((await db.orm.public.Customer.where({ tenantId: a, id: saved.id }).first())?.phoneNorm).toBe("573115550000");
  });
});
