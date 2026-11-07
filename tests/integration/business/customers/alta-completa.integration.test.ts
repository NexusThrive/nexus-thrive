import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { db } from "@/prisma/db";
import { createAdminDb } from "@/lib/platform/admin/db";
import { deleteTenantCompletely } from "@/lib/core/tenancy/deletion";
import { EMPTY_NEW_CUSTOMER } from "@/lib/business/customers/new-customer";
import { createFullCustomer, findCustomerByContact } from "@/lib/business/customers/new-customer-db";

/** Vista «Nuevo cliente»: el alta guarda el tercero fiscal completo, el origen y la nota; los duplicados se avisan sin bloquear. */
const TEST_URL = process.env.TEST_DATABASE_URL;
const normalize = (url: string | undefined) => (url ?? "").replace(/\?.*$/, "");

describe.skipIf(!TEST_URL)("alta completa de cliente (integración)", () => {
  const suffix = Date.now().toString(36);
  let a = "";
  let b = "";

  beforeAll(async () => {
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) throw new Error("DATABASE_URL debe ser igual a TEST_DATABASE_URL.");
    const admin = createAdminDb();
    a = String((await admin.createTenant({ name: "Alta A", slug: `al-${suffix}`, vertical: "retail", modules: ["crm"], tenantType: "COMPANY", ownerEmail: `al-${suffix}@ejemplo.com` })).id);
    b = String((await admin.createTenant({ name: "Alta B", slug: `am-${suffix}`, vertical: "retail", modules: ["crm"], tenantType: "COMPANY", ownerEmail: `am-${suffix}@ejemplo.com` })).id);
  });
  afterAll(async () => {
    for (const id of [a, b]) if (id) await deleteTenantCompletely(id);
    await db.close();
  });

  test("guarda cliente, tercero fiscal, origen y nota", async () => {
    const r = await createFullCustomer(a, { ...EMPTY_NEW_CUSTOMER, kind: "COMPANY", name: "Restaurante Sol", phone: "300 123 4567", email: "Sol@Correo.com", documentType: "NIT", documentNumber: "900.123.456-7", address: "Calle 10 # 5-20", city: "Cartagena", region: "Bolívar", country: "CO", tags: "Empresa, Mayorista", source: "Instagram", notes: "Prefiere WhatsApp", invoiceEmail: "facturas@sol.co", taxResponsibility: "O-48" }, null);
    if (!r.ok) throw new Error(r.message);
    const c = await db.orm.public.Customer.where({ tenantId: a, id: r.id }).first();
    expect(c).toMatchObject({ name: "Restaurante Sol", email: "sol@correo.com", phone: "3001234567", documentId: "9001234567", city: "Cartagena", source: "Instagram", tags: ["Empresa", "Mayorista"] });
    const p = await db.orm.public.Party.where({ tenantId: a, id: c!.partyId! }).first();
    expect(p).toMatchObject({ kind: "COMPANY", documentType: "NIT", addressLine: "Calle 10 # 5-20", region: "Bolívar", countryCode: "CO", taxResponsibility: "O-48", email: "facturas@sol.co" });
    expect((await db.orm.public.CustomerNote.where({ tenantId: a, customerId: r.id }).all()).map((n) => n.content)).toEqual(["Prefiere WhatsApp"]);
  });

  test("sin nombre no guarda; con datos inválidos devuelve el campo", async () => {
    expect(await createFullCustomer(a, { ...EMPTY_NEW_CUSTOMER }, null)).toMatchObject({ ok: false, errors: { name: "Escribe el nombre del cliente" } });
    expect(await createFullCustomer(a, { ...EMPTY_NEW_CUSTOMER, name: "Ana", phone: "123" }, null)).toMatchObject({ ok: false, errors: { phone: expect.any(String) } });
  });

  test("avisa de duplicados por teléfono o correo, solo dentro del negocio", async () => {
    const r = await createFullCustomer(a, { ...EMPTY_NEW_CUSTOMER, name: "María Pérez", phone: "310 555 0101", email: "maria@correo.com" }, null);
    if (!r.ok) throw new Error(r.message);
    expect(await findCustomerByContact(a, { phone: "+57 310 555 0101" })).toEqual({ id: r.id, name: "María Pérez", field: "phone" });
    expect(await findCustomerByContact(a, { email: "MARIA@correo.com" })).toEqual({ id: r.id, name: "María Pérez", field: "email" });
    expect(await findCustomerByContact(b, { phone: "310 555 0101" })).toBeNull();
    // No bloquea: se puede crear otro con el mismo teléfono.
    expect((await createFullCustomer(a, { ...EMPTY_NEW_CUSTOMER, name: "María P.", phone: "310 555 0101" }, null)).ok).toBe(true);
  });
});
