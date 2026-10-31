/**
 * Límite de clientes del plan: política de Core (`lib/core/tenancy/customer-limit.ts`), usada por el
 * medidor de consumo, la importación y el alta de clientes.
 */
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { db } from "@/prisma/db";
import { customerLimit } from "@/lib/core/tenancy/customer-limit";
import { consumptionFor } from "@/lib/core/entitlements/consumption-db";

const TEST_URL = process.env.TEST_DATABASE_URL;
const normalize = (url: string | undefined) => (url ?? "").replace(/\?.*$/, "");

describe.skipIf(!TEST_URL)("límite de clientes (integración)", () => {
  const suffix = Date.now().toString(36);
  let sinLimite = "";
  let conLimite = "";
  let otro = "";

  beforeAll(async () => {
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) throw new Error("DATABASE_URL debe ser igual a TEST_DATABASE_URL.");
    const make = async (n: string, extra: { maxCustomers?: number } = {}) =>
      (await db.orm.public.Tenant.create({ name: `Límite ${n}`, slug: `limite-${n}-${suffix}`, vertical: "general", ...extra })).id;
    sinLimite = await make("a");
    conLimite = await make("b", { maxCustomers: 3 });
    otro = await make("c");
    for (const name of ["Uno", "Dos"]) await db.orm.public.Customer.create({ tenantId: conLimite, name });
    await db.orm.public.Customer.create({ tenantId: conLimite, name: "Archivado", active: false });
    await db.orm.public.Customer.create({ tenantId: sinLimite, name: "Solo" });
    for (const name of ["X", "Y", "Z", "W"]) await db.orm.public.Customer.create({ tenantId: otro, name });
  });
  afterAll(async () => {
    for (const id of [sinLimite, conLimite, otro]) if (id) await db.orm.public.Tenant.where({ id }).delete();
  });

  test("sin límite propio devuelve limit null y cuenta los clientes activos", async () => {
    expect(await customerLimit(sinLimite)).toEqual({ limit: null, used: 1 });
  });

  test("con límite acordado lo devuelve y cuenta solo los activos (el archivado no cuenta)", async () => {
    expect(await customerLimit(conLimite)).toEqual({ limit: 3, used: 2 });
  });

  test("cuenta por negocio: los clientes de otro negocio no suman", async () => {
    expect((await customerLimit(otro)).used).toBe(4);
    expect((await customerLimit(conLimite)).used).toBe(2);
  });

  test("un negocio inexistente no falla: sin límite y sin clientes", async () => {
    expect(await customerLimit("00000000-0000-0000-0000-000000000000")).toEqual({ limit: null, used: 0 });
  });

  test("el medidor de consumo (Core) usa el mismo conteo", async () => {
    const consumo = await consumptionFor(conLimite);
    expect(JSON.stringify(consumo)).toContain("2");
    expect(JSON.stringify(consumo)).toContain("3");
  });
});
