import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { db } from "@/prisma/db";
import { createTenantDb } from "@/lib/tenant/db";
import { ensureProjectContainers } from "./containers";

/** Integración: los contenedores de la obra se crean una sola vez. */
const TEST_URL = process.env.TEST_DATABASE_URL;
const normalize = (url: string | undefined) => (url ?? "").replace(/\?.*$/, "");

describe.skipIf(!TEST_URL)("ensureProjectContainers (integración)", () => {
  let tenantId = "";
  let projectId = "";
  let tenantDb: ReturnType<typeof createTenantDb>;

  beforeAll(async () => {
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) {
      throw new Error("Estas pruebas exigen DATABASE_URL=$TEST_DATABASE_URL.");
    }
    const stamp = Date.now().toString(36);
    tenantId = (
      await db.orm.public.Tenant.create({
        name: "Tenant contenedores",
        slug: `test-cont-${stamp}`,
        vertical: "construction",
      })
    ).id;
    tenantDb = createTenantDb(tenantId);
    const customer = await db.orm.public.Customer.create({ tenantId, name: "Cliente" });
    projectId = (await tenantDb.projects.create({ customerId: customer.id, name: "Obra" })).id;
  });

  afterAll(async () => {
    if (tenantId) await db.orm.public.Tenant.where({ id: tenantId }).delete();
  });

  test("crea presupuesto, plan y bitácora, y repetir no duplica", async () => {
    expect(await tenantDb.budgets.get(projectId)).toBeNull();
    await ensureProjectContainers(tenantDb, projectId);
    await ensureProjectContainers(tenantDb, projectId);
    expect(await tenantDb.budgets.get(projectId)).not.toBeNull();
    expect(await tenantDb.lean.getPlan(projectId)).not.toBeNull();
    expect(await tenantDb.fieldLog.getLog(projectId)).not.toBeNull();
    expect(await db.orm.public.ProjectBudget.where({ projectId }).all()).toHaveLength(1);
    expect(await db.orm.public.ProjectPlan.where({ projectId }).all()).toHaveLength(1);
    expect(await db.orm.public.FieldLog.where({ projectId }).all()).toHaveLength(1);
  });
});
