import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { db } from "@/prisma/db";
import { createAdminDb } from "@/lib/platform/admin/db";
import { deleteTenantCompletely } from "@/lib/core/tenancy/deletion";
import { solutionOfTenant } from "@/lib/core/tenancy/solution-db";
import { setTenantSolution, solutionReport } from "@/lib/platform/admin/solutions-db";

/** HU-transicion-01: cada negocio tiene solución sin perder datos ni funciones. */
const TEST_URL = process.env.TEST_DATABASE_URL;
const normalize = (url: string | undefined) => (url ?? "").replace(/\?.*$/, "");

describe.skipIf(!TEST_URL)("asignación de soluciones (integración)", () => {
  const suffix = Date.now().toString(36);
  let gym = "";
  let cafe = "";
  const make = (name: string, slug: string, vertical: string, modules: string[]) =>
    createAdminDb().createTenant({ name, slug, vertical: vertical as never, modules: modules as never, tenantType: "COMPANY", ownerEmail: `${slug}@ejemplo.com` });

  beforeAll(async () => {
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) throw new Error("DATABASE_URL debe ser igual a TEST_DATABASE_URL.");
    // Un gimnasio que además usa obras (híbrido) y un café (rubro ambiguo).
    gym = String((await make("Gym Híbrido", `sg-${suffix}`, "gym", ["crm", "memberships", "construction"])).id);
    cafe = String((await make("Café Ambiguo", `sc-${suffix}`, "hospitality", ["crm"])).id);
    await db.orm.public.Tenant.where({ id: gym }).update({ settings: { slots: ["10:00"] } as never });
  });
  afterAll(async () => {
    for (const id of [gym, cafe]) if (id) await deleteTenantCompletely(id);
    await db.close();
  });

  test("el 100 % de los negocios tiene solución y los dudosos van primero", async () => {
    const rows = await solutionReport();
    expect(rows.every((r) => r.solution)).toBe(true);
    const mine = rows.filter((r) => r.id === gym || r.id === cafe);
    expect(mine).toHaveLength(2);
    expect(mine.find((r) => r.id === gym)).toMatchObject({ solution: "gym", doubtful: true, outside: ["construction"] });
    expect(mine.find((r) => r.id === cafe)).toMatchObject({ solution: "food", doubtful: true });
    const firstClear = rows.findIndex((r) => !r.doubtful);
    const lastDoubtful = rows.map((r) => r.doubtful).lastIndexOf(true);
    expect(firstClear === -1 || lastDoubtful < firstClear).toBe(true);
  });

  test("fijar la solución a mano conserva los demás ajustes, los módulos y se puede deshacer", async () => {
    const activeModules = async () => (await db.orm.public.TenantModule.where({ tenantId: gym, active: true }).all()).map((m) => String(m.moduleName)).sort();
    const before = await activeModules();
    expect(before).toEqual(expect.arrayContaining(["construction", "memberships"]));
    expect(await setTenantSolution(gym, "business")).toEqual({ name: "Gym Híbrido" });
    expect((await db.orm.public.Tenant.where({ id: gym }).first())?.settings).toEqual({ slots: ["10:00"], solution: "business" });
    expect(await activeModules()).toEqual(before);
    expect(await solutionOfTenant(gym)).toBe("business");
    const reviewed = (await solutionReport()).find((r) => r.id === gym);
    expect(reviewed).toMatchObject({ source: "manual", doubtful: false, outside: [] });

    await setTenantSolution(gym, null);
    expect(await solutionOfTenant(gym)).toBe("gym");
    expect((await db.orm.public.Tenant.where({ id: gym }).first())?.settings).toEqual({ slots: ["10:00"] });
    expect(await setTenantSolution("00000000-0000-0000-0000-000000000000", "gym")).toBeNull();
  });
});
