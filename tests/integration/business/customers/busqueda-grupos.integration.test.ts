import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { db } from "@/prisma/db";
import { createAdminDb } from "@/lib/platform/admin/db";
import { deleteTenantCompletely } from "@/lib/core/tenancy/deletion";
import {
  createCustomerGroup,
  deleteCustomerGroup,
  listCustomerGroups,
  loadCustomerSearchRows,
  setGroupMembers,
  updateCustomerGroup,
} from "@/lib/business/customers/customer-search-db";
import { createSavedSearch, deleteSavedSearch, listSavedSearches, setDefaultSavedSearch } from "@/lib/core/saved-searches-db";

/** Grupos propios de clientes y favoritos de la búsqueda: aislados por negocio y, los favoritos, por persona. */
const TEST_URL = process.env.TEST_DATABASE_URL;
const normalize = (url: string | undefined) => (url ?? "").replace(/\?.*$/, "");

describe.skipIf(!TEST_URL)("grupos de clientes y búsquedas guardadas (integración)", () => {
  const suffix = Date.now().toString(36);
  let a = "";
  let b = "";
  let maria = "";
  let ferreteria = "";

  beforeAll(async () => {
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) throw new Error("DATABASE_URL debe ser igual a TEST_DATABASE_URL.");
    const admin = createAdminDb();
    a = String((await admin.createTenant({ name: "Grupos A", slug: `ga-${suffix}`, vertical: "retail", modules: ["crm"], tenantType: "COMPANY", ownerEmail: `ga-${suffix}@ejemplo.com` })).id);
    b = String((await admin.createTenant({ name: "Grupos B", slug: `gb-${suffix}`, vertical: "retail", modules: ["crm"], tenantType: "COMPANY", ownerEmail: `gb-${suffix}@ejemplo.com` })).id);
    maria = (await db.orm.public.Customer.create({ tenantId: a, name: "María Pérez", city: "Bogotá", tags: ["vip"] })).id;
    ferreteria = (await db.orm.public.Customer.create({ tenantId: a, name: "Ferretería Sol", city: "Medellín" })).id;
    await db.orm.public.Customer.create({ tenantId: b, name: "Cliente de otro negocio" });
  });
  afterAll(async () => {
    for (const id of [a, b]) if (id) await deleteTenantCompletely(id);
    await db.close();
  });

  test("un grupo propio se crea, se llena, se renombra y sus clientes aparecen en la búsqueda", async () => {
    const created = await createCustomerGroup(a, "  Clientes   VIP ", "crown");
    if (!created.ok || !created.id) throw new Error("no se creó");
    expect(await createCustomerGroup(a, "Clientes VIP", "star")).toMatchObject({ ok: false });
    expect(await createCustomerGroup(a, "   ", "star")).toMatchObject({ ok: false });
    expect(await createCustomerGroup(b, "Clientes VIP", "star")).toMatchObject({ ok: true }); // el nombre es único por negocio

    expect(await setGroupMembers(a, created.id, [maria, maria], "add")).toEqual({ ok: true });
    expect(await setGroupMembers(a, created.id, [maria], "add")).toEqual({ ok: true }); // repetir no duplica
    expect((await listCustomerGroups(a)).find((g) => g.id === created.id)).toMatchObject({ name: "Clientes VIP", icon: "crown", members: 1 });

    const { rows } = await loadCustomerSearchRows(a);
    expect(rows.find((r) => r.id === maria)?.groupIds).toEqual([created.id]);
    expect(rows.find((r) => r.id === ferreteria)?.groupIds).toEqual([]);
    expect(rows.some((r) => r.name === "Cliente de otro negocio")).toBe(false);

    expect(await updateCustomerGroup(a, created.id, "VIP", "star")).toEqual({ ok: true, id: created.id });
    expect(await setGroupMembers(a, created.id, [maria], "remove")).toEqual({ ok: true });
    expect((await listCustomerGroups(a))[0]?.members).toBe(0);
  });

  test("no se puede meter en un grupo a un cliente de otro negocio ni tocar un grupo ajeno", async () => {
    const mine = await createCustomerGroup(a, "Ruta norte", "map-pin");
    if (!mine.ok || !mine.id) throw new Error("no se creó");
    const otherCustomer = await db.orm.public.Customer.where({ tenantId: b }).first();
    expect(await setGroupMembers(a, mine.id, [otherCustomer!.id], "add")).toEqual({ ok: true });
    expect((await listCustomerGroups(a)).find((g) => g.id === mine.id)?.members).toBe(0);
    expect(await setGroupMembers(b, mine.id, [otherCustomer!.id], "add")).toMatchObject({ ok: false });
    await deleteCustomerGroup(b, mine.id); // otro negocio: no hace nada
    expect((await listCustomerGroups(a)).some((g) => g.id === mine.id)).toBe(true);
  });

  test("los favoritos son de cada persona y solo uno es el predeterminado por sección", async () => {
    const first = await createSavedSearch(a, "ana", "customers", { name: "Por cobrar", params: { filtros: "saldo", raro: "x" }, isDefault: true });
    const second = await createSavedSearch(a, "ana", "customers", { name: "Con cita", params: { filtros: "cita-proxima" }, isDefault: true });
    if (!first.ok || !first.id || !second.ok || !second.id) throw new Error("no se guardaron");
    expect(await createSavedSearch(a, "ana", "customers", { name: "  ", params: {}, isDefault: false })).toMatchObject({ ok: false });

    const mine = await listSavedSearches(a, "ana", "customers");
    expect(mine.map((s) => [s.name, s.isDefault])).toEqual([["Por cobrar", false], ["Con cita", true]]);
    expect(mine[0]?.params).toEqual({ filtros: "saldo" }); // lo desconocido no se guarda
    expect(await listSavedSearches(a, "luis", "customers")).toEqual([]);
    expect(await listSavedSearches(a, "ana", "crm")).toEqual([]);
    expect(await listSavedSearches(b, "ana", "customers")).toEqual([]);

    expect(await setDefaultSavedSearch(a, "luis", first.id, true)).toMatchObject({ ok: false }); // no es de Luis
    await deleteSavedSearch(a, "luis", first.id);
    expect(await listSavedSearches(a, "ana", "customers")).toHaveLength(2);
    expect(await setDefaultSavedSearch(a, "ana", first.id, true)).toMatchObject({ ok: true });
    expect((await listSavedSearches(a, "ana", "customers")).filter((s) => s.isDefault).map((s) => s.name)).toEqual(["Por cobrar"]);
  });
});
