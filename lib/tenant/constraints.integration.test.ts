import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { db } from "@/prisma/db";
import { createAdminDb } from "@/lib/admin/db";
import { linkNfc } from "@/lib/business/gym-db";
import { isUniqueViolation } from "@/lib/db-errors";
import { deleteTenantCompletely } from "./deletion";

/**
 * DATA-04: la base, no solo el código, impide datos huérfanos y códigos de
 * acceso repetidos dentro de un negocio.
 */
const TEST_URL = process.env.TEST_DATABASE_URL;
const enabled = Boolean(TEST_URL);

function normalize(url: string | undefined): string {
  return (url ?? "").replace(/\?.*$/, "");
}

describe.skipIf(!enabled)("restricciones del negocio en la base (integración)", () => {
  const suffix = Date.now().toString(36);
  const tenants: string[] = [];

  const newTenant = async (name: string) => {
    const tenant = await createAdminDb().createTenant({
      name,
      slug: `${name.toLowerCase().replace(/\s+/g, "-")}-${suffix}`,
      vertical: "gym",
      modules: [],
      tenantType: "COMPANY",
      ownerEmail: `dueno.${tenants.length}.${suffix}@ejemplo.com`,
    });
    tenants.push(String(tenant.id));
    return String(tenant.id);
  };
  const customer = (tenantId: string, name: string) => db.orm.public.Customer.create({ tenantId, name });

  let tenantA = "";
  let tenantB = "";

  beforeAll(async () => {
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) {
      throw new Error(
        "Estas pruebas exigen una base aparte: exportá TEST_DATABASE_URL y ejecutá con DATABASE_URL=$TEST_DATABASE_URL.",
      );
    }
    tenantA = await newTenant("Gimnasio Uno");
    tenantB = await newTenant("Gimnasio Dos");
  });

  afterAll(async () => {
    for (const id of tenants) await deleteTenantCompletely(id);
    await db.close();
  });

  test("no se puede crear un registro de un negocio que no existe", async () => {
    await expect(
      db.orm.public.Product.create({ tenantId: "00000000-0000-0000-0000-000000000000", name: "Huérfano", price: "1000.00" }),
    ).rejects.toThrow();
  });

  test("un código de acceso no se repite dentro del negocio", async () => {
    const ana = await customer(tenantA, "Ana");
    const beto = await customer(tenantA, "Beto");
    await db.orm.public.Customer.where({ tenantId: tenantA, id: ana.id }).update({ accessCode: `ACC${suffix}` });
    const error = await db.orm.public.Customer.where({ tenantId: tenantA, id: beto.id })
      .update({ accessCode: `ACC${suffix}` })
      .then(() => null, (e: unknown) => e);
    expect(isUniqueViolation(error)).toBe(true);
  });

  test("dos negocios pueden usar el mismo código", async () => {
    const otro = await customer(tenantB, "Carla");
    await expect(
      db.orm.public.Customer.where({ tenantId: tenantB, id: otro.id }).update({ accessCode: `ACC${suffix}` }),
    ).resolves.toBeDefined();
  });

  test("dos vínculos a la vez de la misma tarjeta: queda uno y el otro recibe un mensaje", async () => {
    const dani = await customer(tenantA, "Dani");
    const eva = await customer(tenantA, "Eva");
    const results = await Promise.all([linkNfc(tenantA, dani.id, "04B1C2D3E4"), linkNfc(tenantA, eva.id, "04B1C2D3E4")]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.find((r) => !r.ok)).toMatchObject({ ok: false });
    expect(await db.orm.public.Customer.where({ tenantId: tenantA, nfcUid: "04B1C2D3E4" }).all()).toHaveLength(1);
  });

  test("varios socios sin código ni tarjeta conviven (el índice ignora los vacíos)", async () => {
    await customer(tenantA, "Sin código 1");
    await customer(tenantA, "Sin código 2");
    const empty = await db.orm.public.Customer.where({ tenantId: tenantA, accessCode: null }).all();
    expect(empty.length).toBeGreaterThanOrEqual(2);
  });
});
