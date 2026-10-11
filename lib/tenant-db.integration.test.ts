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

/**
 * Rechazos de la sección 2 (tabla 0.3) que SÍ se pueden probar en la capa de
 * datos: presupuesto bloqueado y cadena de pertenencia cruzada entre negocios.
 * El rechazo por rol vive en las actions (requiere sesión de Clerk) y se
 * verifica con los helpers puros de rol.
 */
describe.skipIf(!enabled)("presupuesto: bloqueo y pertenencia (integración)", () => {
  let tenantIdA = "";
  let tenantIdB = "";
  let projectId = "";
  let budgetId = "";
  let chapterId = "";
  let itemId = "";
  let dbA: ReturnType<typeof createTenantDb>;
  let dbB: ReturnType<typeof createTenantDb>;

  beforeAll(async () => {
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) {
      throw new Error(
        "Estas pruebas exigen una base aparte: exportá TEST_DATABASE_URL y ejecutá con DATABASE_URL=$TEST_DATABASE_URL.",
      );
    }
    const stamp = Date.now().toString(36);
    const a = await db.orm.public.Tenant.create({
      name: "Tenant A",
      slug: `test-bud-a-${stamp}`,
      vertical: "construction",
    });
    const b = await db.orm.public.Tenant.create({
      name: "Tenant B",
      slug: `test-bud-b-${stamp}`,
      vertical: "construction",
    });
    tenantIdA = a.id;
    tenantIdB = b.id;
    dbA = createTenantDb(tenantIdA);
    dbB = createTenantDb(tenantIdB);

    const customer = await db.orm.public.Customer.create({
      tenantId: tenantIdA,
      name: "Cliente A",
    });
    const project = await db.orm.public.Project.create({
      tenantId: tenantIdA,
      customerId: customer.id,
      code: `PROY-BUD-${stamp}`,
      name: "Obra A",
    });
    projectId = project.id;
    budgetId = (await dbA.budgets.getOrCreate(projectId)).id;
    chapterId = (await dbA.budgets.createChapter(projectId, { name: "Cap 1" }))
      .id;
    itemId = (
      await dbA.budgets.createItem(projectId, {
        chapterId,
        code: "1.1",
        description: "Pared",
        unit: "m2",
        quantity: BigInt(1_000_000),
        unitCostDirect: BigInt(20_000_000_000),
      })
    ).id;
  });

  afterAll(async () => {
    if (tenantIdA) {
      await db.orm.public.Tenant.where({ id: tenantIdA }).delete();
    }
    if (tenantIdB) {
      await db.orm.public.Tenant.where({ id: tenantIdB }).delete();
    }
  });

  async function revision(): Promise<number> {
    const row = await db.orm.public.ProjectBudget
      .where({ id: budgetId })
      .select("revision")
      .first();
    return Number(row?.revision ?? 0);
  }

  test("el otro negocio no ve el presupuesto ni el proyecto", async () => {
    expect(await dbB.budgets.get(projectId)).toBeNull();
    expect(await dbB.projects.get(projectId)).toBeNull();
    await expect(
      dbB.projects.updateProject(projectId, { name: "robo" }),
    ).rejects.toThrow("NOT_FOUND");
  });

  test("el otro negocio no puede tocar capítulos ni partidas", async () => {
    await expect(
      dbB.budgets.updateChapter(projectId, chapterId, { name: "robo" }),
    ).rejects.toThrow("Presupuesto no encontrado en este negocio.");
    await expect(dbB.budgets.deleteChapter(projectId, chapterId)).rejects.toThrow(
      "Presupuesto no encontrado en este negocio.",
    );
    await expect(
      dbB.budgets.updateItem(projectId, itemId, {
        code: "9.9",
        description: "robo",
        unit: "m2",
        quantity: BigInt(1_000_000),
        unitCostDirect: BigInt(1),
      }),
    ).rejects.toThrow("Presupuesto no encontrado en este negocio.");
  });

  test("guardado sin cambios no avanza la revisión", async () => {
    const before = await revision();
    await dbA.budgets.updateChapter(projectId, chapterId, { name: "Cap 1" });
    await dbA.budgets.updateItem(projectId, itemId, {
      code: "1.1",
      description: "Pared",
      unit: "m2",
      quantity: BigInt(1_000_000),
      unitCostDirect: BigInt(20_000_000_000),
    });
    await dbA.budgets.updateAiu(projectId, {
      adminPct: BigInt(100_000),
      imprevPct: BigInt(50_000),
      utilidadPct: BigInt(50_000),
      ivaUtilidadPct: BigInt(190_000),
    });
    expect(await revision()).toBe(before);
  });

  test("cambio real sí avanza la revisión", async () => {
    const before = await revision();
    await dbA.budgets.updateChapter(projectId, chapterId, { name: "Cap 1 bis" });
    expect(await revision()).toBe(before + 1);
  });

  test("revisión vieja → STALE_REVISION", async () => {
    await expect(
      dbA.budgets.updateChapter(
        projectId,
        chapterId,
        { name: "Cap 2" },
        (await revision()) - 1,
      ),
    ).rejects.toThrow("STALE_REVISION");
  });

  test("presupuesto bloqueado: nada se muta ni se borra", async () => {
    await dbA.budgets.setLocked(projectId, true);
    await expect(
      dbA.budgets.createChapter(projectId, { name: "Cap bloqueado" }),
    ).rejects.toThrow("El presupuesto está bloqueado.");
    await expect(
      dbA.budgets.updateChapter(projectId, chapterId, { name: "otro" }),
    ).rejects.toThrow("El presupuesto está bloqueado.");
    await expect(
      dbA.budgets.deleteChapter(projectId, chapterId),
    ).rejects.toThrow("El presupuesto está bloqueado.");
    await expect(
      dbA.budgets.deleteItem(projectId, itemId),
    ).rejects.toThrow("El presupuesto está bloqueado.");
    await expect(
      dbA.budgets.updateAiu(projectId, {
        adminPct: BigInt(200_000),
        imprevPct: BigInt(0),
        utilidadPct: BigInt(0),
        ivaUtilidadPct: BigInt(0),
      }),
    ).rejects.toThrow("El presupuesto está bloqueado.");
    const chapter = await db.orm.public.BudgetChapter
      .where({ id: chapterId })
      .select("name")
      .first();
    expect(chapter?.name).toBe("Cap 1 bis");
    await dbA.budgets.setLocked(projectId, false);
  });

  test("verifyTotals sigue cuadrando tras las mutaciones", async () => {
    const check = await dbA.budgets.verifyTotals(projectId);
    expect(check.mismatches).toEqual([]);
  });
});
