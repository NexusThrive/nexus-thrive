import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { db } from "@/prisma/db";
import { createAdminDb } from "@/lib/admin/db";
import { saveCustomer } from "@/lib/business/customers-db";
import { runOperation } from "@/lib/operations/engine";
import { OPERATIONS } from "@/lib/operations/registry";
import { deleteTenantCompletely } from "@/lib/tenant/deletion";
import { createParty, findDuplicates, listParties, syncCustomerParty } from "./parties-db";

/** Tercero único contra Postgres real y con DOS negocios. */
const TEST_URL = process.env.TEST_DATABASE_URL;
const normalize = (url: string | undefined) => (url ?? "").replace(/\?.*$/, "");

describe.skipIf(!TEST_URL)("tercero único (integración)", () => {
  const suffix = Date.now().toString(36);
  let a = "";
  let b = "";

  beforeAll(async () => {
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) throw new Error("DATABASE_URL debe ser igual a TEST_DATABASE_URL.");
    const make = (name: string, slug: string) => createAdminDb().createTenant({ name, slug, vertical: "gym", modules: ["crm"], tenantType: "COMPANY", ownerEmail: `${slug}@ejemplo.com` });
    a = String((await make("Gym A", `pt-a-${suffix}`)).id);
    b = String((await make("Gym B", `pt-b-${suffix}`)).id);
  });
  afterAll(async () => {
    for (const id of [a, b]) if (id) await deleteTenantCompletely(id);
    await db.close();
  });

  test("cada cliente que se guarda tiene su tercero con el rol CUSTOMER", async () => {
    const saved = await saveCustomer(a, null, { name: "Ana Pérez", email: "ANA@x.com", phone: "3001112233", documentId: "1.023.456-789" } as never);
    if (!saved.ok) throw new Error(saved.message);
    const customer = await db.orm.public.Customer.where({ tenantId: a, id: saved.id }).first();
    expect(customer?.partyId).toBeTruthy();
    const [party] = await listParties(a, { role: "CUSTOMER", q: "ana" });
    expect(party).toMatchObject({ id: customer?.partyId, legalName: "Ana Pérez", documentNumber: "1023456789", email: "ana@x.com", roles: ["CUSTOMER"] });
  });

  test("editar el cliente actualiza su tercero; no se crea otro", async () => {
    const [before] = await listParties(a, { q: "Ana" });
    const customer = await db.orm.public.Customer.where({ tenantId: a, name: "Ana Pérez" }).first();
    await saveCustomer(a, customer!.id, { name: "Ana María Pérez", email: "ana@x.com", phone: "3001112233", documentId: "1023456789" } as never);
    const found = await listParties(a, { q: "1023456789" });
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ id: before.id, legalName: "Ana María Pérez" });
  });

  test("un documento repetido en el mismo negocio es imposible; en otro negocio sí es válido", async () => {
    const dup = await createParty(a, { legalName: "Otra Ana", documentNumber: "1.023.456.789", roles: ["SUPPLIER"] });
    expect(dup).toMatchObject({ ok: false, code: "duplicate_document" });
    const other = await createParty(b, { legalName: "Ana en B", documentNumber: "1023456789", roles: ["CUSTOMER"] });
    expect(other.ok).toBe(true);
    // y la restricción es de la base, no solo del código: 8 altas simultáneas con el mismo documento dejan UNA
    const race = await Promise.all(Array.from({ length: 8 }, () => createParty(a, { legalName: "Carrera SAS", documentNumber: "900555111", kind: "COMPANY" })));
    expect(race.filter((r) => r.ok)).toHaveLength(1);
    expect((await listParties(a, { q: "900555111" }))).toHaveLength(1);
  });

  test("un proveedor se crea sin ser cliente", async () => {
    const res = await createParty(a, { legalName: "Distribuidora Andina SAS", kind: "COMPANY", documentType: "NIT", documentNumber: "900.123.456", checkDigit: "7", roles: ["SUPPLIER"] });
    if (!res.ok) throw new Error(res.message);
    expect(res.party.roles).toEqual(["SUPPLIER"]);
    const suppliers = await listParties(a, { role: "SUPPLIER" });
    expect(suppliers.map((p) => p.legalName)).toContain("Distribuidora Andina SAS");
    expect((await listParties(a, { role: "CUSTOMER" })).map((p) => p.legalName)).not.toContain("Distribuidora Andina SAS");
    expect(await db.orm.public.Customer.where({ tenantId: a, name: "Distribuidora Andina SAS" }).first()).toBeNull();
  });

  test("un proveedor que luego compra suma el rol sobre la misma ficha (sin duplicar)", async () => {
    const customer = await saveCustomer(a, null, { name: "Distribuidora Andina", documentId: "900123456" } as never);
    if (!customer.ok) throw new Error(customer.message);
    const row = await db.orm.public.Customer.where({ tenantId: a, id: customer.id }).first();
    const party = (await listParties(a, { q: "900123456" }))[0];
    expect(row?.partyId).toBe(party.id);
    expect(party.roles).toEqual(["CUSTOMER", "SUPPLIER"]);
  });

  test("detección de duplicados blandos: correo, teléfono y nombre (sin bloquear)", async () => {
    const created = await createParty(a, { legalName: "Luis Gómez", email: "luis@x.com", phone: "+57 310 222 3344" });
    expect(created.ok).toBe(true);
    const again = await createParty(a, { legalName: "Luis Gomez", email: "otro@x.com", phone: "3102223344" });
    expect(again.ok && again.possibleDuplicates.map((d) => d.reason)).toEqual(["phone"]);
    const byName = await findDuplicates(a, { legalName: "LUIS  GÓMEZ" });
    expect(byName.length).toBeGreaterThanOrEqual(1);
    expect((await findDuplicates(b, { legalName: "Luis Gómez" }))).toEqual([]); // otro negocio no cuenta
  });

  test("aislamiento: la búsqueda y la operación solo ven el negocio de la llave", async () => {
    const ctx = (tenantId: string, role = "OWNER") => ({ tenantId, role, activeModules: ["crm"], actor: { type: "API_KEY" as const, id: "k" } });
    const inB = (await runOperation(OPERATIONS, ctx(b), "parties.search", { q: "ana" })) as { items: { legalName: string }[] };
    expect(inB.items.map((i) => i.legalName)).toEqual(["Ana en B"]);
    const inA = (await runOperation(OPERATIONS, ctx(a), "parties.search", { role: "SUPPLIER" })) as { items: { legalName: string }[] };
    expect(inA.items.map((i) => i.legalName)).not.toContain("Ana en B");
    await expect(runOperation(OPERATIONS, ctx(a, "ADVISOR"), "parties.search", {})).rejects.toMatchObject({ code: "forbidden" });
  });

  test("syncCustomerParty de un cliente de otro negocio no hace nada", async () => {
    const c = await db.orm.public.Customer.where({ tenantId: a }).first();
    expect(await syncCustomerParty(b, c!.id)).toEqual({ partyId: null });
  });
});
