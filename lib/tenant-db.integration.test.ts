import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { db } from "@/prisma/db";
import { createTenantDb } from "./tenant-db";

/**
 * Pruebas de integración del ciclo de vida del proyecto
 * (`projects.updateProject`: compare-and-set sobre `status`).
 *
 * NO tocan la base de desarrollo: se saltan salvo que exista
 * `TEST_DATABASE_URL`, y además exigen que `DATABASE_URL` apunte a esa misma
 * base (si no, fallan a propósito). Ver docs/construction/cierre-etapa-1.md
 * para el procedimiento con una base aparte.
 */
const TEST_URL = process.env.TEST_DATABASE_URL;
const enabled = Boolean(TEST_URL);

function normalize(url: string | undefined): string {
  return (url ?? "").replace(/\?.*$/, "");
}

describe.skipIf(!enabled)("projects.updateProject (integración)", () => {
  const slug = `test-cas-${Date.now().toString(36)}`;
  let tenantId = "";
  let projectId = "";
  let tenantDb: ReturnType<typeof createTenantDb>;

  beforeAll(async () => {
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) {
      throw new Error(
        "Estas pruebas exigen una base aparte: exportá TEST_DATABASE_URL y ejecutá con DATABASE_URL=$TEST_DATABASE_URL.",
      );
    }

    const tenant = await db.orm.public.Tenant.create({
      name: "Tenant de prueba CAS",
      slug,
      vertical: "construction",
    });
    tenantId = tenant.id;
    tenantDb = createTenantDb(tenantId);

    const customer = await db.orm.public.Customer.create({
      tenantId,
      name: "Cliente de prueba",
    });
    const project = await db.orm.public.Project.create({
      tenantId,
      customerId: customer.id,
      code: `PROY-CAS-${Date.now().toString(36)}`,
      name: "Proyecto de prueba",
      description: "Fixture de integración",
    });
    projectId = project.id;
  });

  afterAll(async () => {
    if (tenantId) {
      await db.orm.public.Tenant.where({ id: tenantId }).delete();
    }
  });

  async function currentStatus(): Promise<string> {
    const row = await db.orm.public.Project.where({ id: projectId })
      .select("status", "updatedAt")
      .first();
    return String(row?.status ?? "");
  }

  async function updatedAt(): Promise<string> {
    const row = await db.orm.public.Project.where({ id: projectId })
      .select("updatedAt")
      .first();
    return String(row?.updatedAt ?? "");
  }

  test("transición válida con expectedStatus correcto", async () => {
    const result = await tenantDb.projects.updateProject(projectId, {
      expectedStatus: "DRAFT",
      status: "BIDDING",
    });
    expect(result).toBe("BIDDING");
    expect(await currentStatus()).toBe("BIDDING");
  });

  test("expectedStatus viejo → STALE_STATUS y no escribe", async () => {
    await expect(
      tenantDb.projects.updateProject(projectId, {
        expectedStatus: "DRAFT",
        status: "CANCELLED",
      }),
    ).rejects.toThrow("STALE_STATUS");
    expect(await currentStatus()).toBe("BIDDING");
  });

  test("transición no permitida → INVALID_TRANSITION", async () => {
    await expect(
      tenantDb.projects.updateProject(projectId, {
        expectedStatus: "BIDDING",
        status: "COMPLETED",
      }),
    ).rejects.toThrow("INVALID_TRANSITION");
    expect(await currentStatus()).toBe("BIDDING");
  });

  test("sin expectedStatus no hay cambio de estado", async () => {
    await expect(
      tenantDb.projects.updateProject(projectId, { status: "APPROVED" }),
    ).rejects.toThrow("MISSING_EXPECTED_STATUS");
    expect(await currentStatus()).toBe("BIDDING");
  });

  test("guardado sin cambios no escribe (updatedAt intacto)", async () => {
    const before = await updatedAt();
    const result = await tenantDb.projects.updateProject(projectId, {
      expectedStatus: "BIDDING",
      status: "BIDDING",
    });
    expect(result).toBe("BIDDING");
    expect(await updatedAt()).toBe(before);
  });

  test("nombre y descripción se actualizan sin tocar el estado", async () => {
    const result = await tenantDb.projects.updateProject(projectId, {
      name: "Proyecto renombrado",
      description: null,
    });
    expect(result).toBe("BIDDING");
    const row = await db.orm.public.Project.where({ id: projectId })
      .select("name", "description", "status")
      .first();
    expect(row?.name).toBe("Proyecto renombrado");
    expect(row?.description).toBeNull();
    expect(row?.status).toBe("BIDDING");
  });

  test("CANCELLED es terminal", async () => {
    await tenantDb.projects.updateProject(projectId, {
      expectedStatus: "BIDDING",
      status: "CANCELLED",
    });
    expect(await currentStatus()).toBe("CANCELLED");
    await expect(
      tenantDb.projects.updateProject(projectId, {
        expectedStatus: "CANCELLED",
        status: "APPROVED",
      }),
    ).rejects.toThrow("INVALID_TRANSITION");
    expect(await currentStatus()).toBe("CANCELLED");
  });

  test("proyecto inexistente → NOT_FOUND", async () => {
    await expect(
      tenantDb.projects.updateProject("00000000-0000-0000-0000-000000000000", {
        name: "x",
      }),
    ).rejects.toThrow("NOT_FOUND");
  });
});
