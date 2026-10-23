import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { db } from "@/prisma/db";
import { createTenantDb } from "./db";

/**
 * Integración de la Etapa 3: importar una actividad del catálogo APU al
 * presupuesto (`budgets.importActivityFromCatalog`) y editar una línea de
 * recurso (`budgets.updateResource`).
 *
 * Igual que el resto de pruebas de integración: se saltan sin
 * `TEST_DATABASE_URL` y fallan si `DATABASE_URL` no apunta a esa misma base.
 *
 * Aritmética esperada (micro-unidades, SCALE = 1_000_000), calculada a mano:
 *   Cemento:  0,25 × (1 + 10 %) × $30.000 = $8.250   → 8_250_000_000
 *   Oficial:  0,10 × (1 +  0 %) × $50.000 = $5.000   → 5_000_000_000
 *   Costo unitario directo                 = $13.250 → 13_250_000_000
 *   Cantidad 2,5 → total partida           = $33.125 → 33_125_000_000
 */
const TEST_URL = process.env.TEST_DATABASE_URL;
const enabled = Boolean(TEST_URL);

function normalize(url: string | undefined): string {
  return (url ?? "").replace(/\?.*$/, "");
}

const M = (value: bigint | number | string) => BigInt(value);

describe.skipIf(!enabled)("budgets.importActivityFromCatalog / updateResource (integración)", () => {
  let tenantIdA = "";
  let tenantIdB = "";
  let dbA: ReturnType<typeof createTenantDb>;
  let dbB: ReturnType<typeof createTenantDb>;
  let projectId = "";
  let budgetId = "";
  let chapterId = "";
  let activityId = "";
  let emptyActivityId = "";
  let activityIdB = "";
  let cementId = "";
  let laborId = "";
  let foreignItemId = "";

  beforeAll(async () => {
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) {
      throw new Error(
        "Estas pruebas exigen una base aparte: exportá TEST_DATABASE_URL y ejecutá con DATABASE_URL=$TEST_DATABASE_URL.",
      );
    }
    const stamp = Date.now().toString(36);
    const a = await db.orm.public.Tenant.create({
      name: "Tenant APU A",
      slug: `test-apu-a-${stamp}`,
      vertical: "construction",
    });
    const b = await db.orm.public.Tenant.create({
      name: "Tenant APU B",
      slug: `test-apu-b-${stamp}`,
      vertical: "construction",
    });
    tenantIdA = a.id;
    tenantIdB = b.id;
    dbA = createTenantDb(tenantIdA);
    dbB = createTenantDb(tenantIdB);

    const customer = await db.orm.public.Customer.create({
      tenantId: tenantIdA,
      name: "Cliente APU",
    });
    const project = await db.orm.public.Project.create({
      tenantId: tenantIdA,
      customerId: customer.id,
      code: `PROY-APU-${stamp}`,
      name: "Obra APU",
    });
    projectId = project.id;
    budgetId = (await dbA.budgets.getOrCreate(projectId)).id;
    chapterId = (await dbA.budgets.createChapter(projectId, { name: "Mampostería" })).id;

    const cement = await db.orm.public.ApuItem.create({
      tenantId: tenantIdA,
      code: `CEM-${stamp}`,
      name: "Cemento gris",
      unit: "bulto",
      category: "MATERIAL",
      unitPrice: "30000",
    });
    const labor = await db.orm.public.ApuItem.create({
      tenantId: tenantIdA,
      code: `OFI-${stamp}`,
      name: "Oficial",
      unit: "hh",
      category: "MANO_DE_OBRA",
      unitPrice: "50000",
    });
    // Insumo de OTRO tenant colgado de la actividad de A: jamás debe entrar.
    const foreign = await db.orm.public.ApuItem.create({
      tenantId: tenantIdB,
      code: `FOR-${stamp}`,
      name: "Insumo ajeno",
      unit: "und",
      category: "MATERIAL",
      unitPrice: "999999",
    });
    cementId = cement.id;
    laborId = labor.id;
    foreignItemId = foreign.id;

    const activity = await db.orm.public.ApuActivity.create({
      tenantId: tenantIdA,
      code: `MUR-${stamp}`,
      name: "Muro en bloque",
      unit: "m2",
    });
    activityId = activity.id;
    await db.orm.public.ApuActivityComposition.create({
      activityId,
      itemId: cementId,
      consumption: "0.25",
      wastePercent: "10",
    });
    await db.orm.public.ApuActivityComposition.create({
      activityId,
      itemId: laborId,
      consumption: "0.1",
      wastePercent: "0",
    });
    await db.orm.public.ApuActivityComposition.create({
      activityId,
      itemId: foreignItemId,
      consumption: "1",
      wastePercent: "0",
    });

    emptyActivityId = (
      await db.orm.public.ApuActivity.create({
        tenantId: tenantIdA,
        code: `VAC-${stamp}`,
        name: "Actividad sin composición",
        unit: "m2",
      })
    ).id;

    activityIdB = (
      await db.orm.public.ApuActivity.create({
        tenantId: tenantIdB,
        code: `MUR-B-${stamp}`,
        name: "Muro de B",
        unit: "m2",
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

  async function budgetRow() {
    const row = await db.orm.public.ProjectBudget.where({ id: budgetId }).first();
    if (!row) throw new Error("fixture: presupuesto desaparecido");
    return row;
  }

  async function itemCount(): Promise<number> {
    return (await db.orm.public.BudgetItem.where({ chapterId }).all()).length;
  }

  async function resourcesOf(itemId: string) {
    return db.orm.public.BudgetItemResource.where({ itemId }).all();
  }

  let importedItemId = "";

  test("importa la actividad con costos en punto fijo y sin insumos ajenos", async () => {
    const before = await budgetRow();

    const { id } = await dbA.budgets.importActivityFromCatalog(
      projectId,
      chapterId,
      activityId,
      M(2_500_000),
      before.revision,
    );
    importedItemId = id;

    const item = await db.orm.public.BudgetItem.where({ id }).first();
    expect(item?.sourceActivityId).toBe(activityId);
    expect(item?.description).toBe("Muro en bloque");
    expect(item?.unit).toBe("m2");
    expect(M(item!.quantity)).toBe(M(2_500_000));
    expect(M(item!.unitCostDirect)).toBe(M(13_250_000_000));
    expect(M(item!.totalCostDirect)).toBe(M(33_125_000_000));

    const resources = await resourcesOf(id);
    expect(resources).toHaveLength(2);
    expect(resources.map((r) => r.sourceItemId).sort()).toEqual([cementId, laborId].sort());
    expect(resources.some((r) => r.sourceItemId === foreignItemId)).toBe(false);

    const cement = resources.find((r) => r.sourceItemId === cementId)!;
    expect(cement.type).toBe("MATERIAL");
    expect(M(cement.performance)).toBe(M(250_000));
    expect(M(cement.wastePct)).toBe(M(100_000)); // 10 % como fracción micro
    expect(M(cement.unitPrice)).toBe(M(30_000_000_000));
    expect(M(cement.totalPrice)).toBe(M(8_250_000_000));

    const labor = resources.find((r) => r.sourceItemId === laborId)!;
    expect(M(labor.wastePct)).toBe(M(0));
    expect(M(labor.totalPrice)).toBe(M(5_000_000_000));

    const after = await budgetRow();
    expect(after.revision).toBe(before.revision + 1);
    expect(M(after.directCostTotal)).toBe(M(33_125_000_000));
  });

  test("los precios quedan congelados: cambiar el catálogo no altera la partida", async () => {
    await db.orm.public.ApuItem.where({ id: cementId }).update({ unitPrice: "45000" });

    const item = await db.orm.public.BudgetItem.where({ id: importedItemId }).first();
    expect(M(item!.unitCostDirect)).toBe(M(13_250_000_000));
    const cement = (await resourcesOf(importedItemId)).find((r) => r.sourceItemId === cementId)!;
    expect(M(cement.unitPrice)).toBe(M(30_000_000_000));

    await db.orm.public.ApuItem.where({ id: cementId }).update({ unitPrice: "30000" });
  });

  test("rechaza una revisión vieja sin escribir nada", async () => {
    const before = await budgetRow();
    const count = await itemCount();
    await expect(
      dbA.budgets.importActivityFromCatalog(
        projectId,
        chapterId,
        activityId,
        M(1_000_000),
        before.revision - 1,
      ),
    ).rejects.toThrow("STALE_REVISION");
    expect(await itemCount()).toBe(count);
    expect((await budgetRow()).revision).toBe(before.revision);
  });

  test("rechaza una actividad sin composición", async () => {
    const count = await itemCount();
    await expect(
      dbA.budgets.importActivityFromCatalog(projectId, chapterId, emptyActivityId),
    ).rejects.toThrow("La actividad no tiene composición APU para importar.");
    expect(await itemCount()).toBe(count);
  });

  test("aislamiento: ni B importa en A, ni A importa del catálogo de B", async () => {
    const count = await itemCount();
    await expect(
      dbB.budgets.importActivityFromCatalog(projectId, chapterId, activityIdB),
    ).rejects.toThrow("Presupuesto no encontrado en este negocio.");
    await expect(
      dbA.budgets.importActivityFromCatalog(projectId, chapterId, activityIdB),
    ).rejects.toThrow("Actividad del catálogo no encontrada.");
    expect(await itemCount()).toBe(count);
  });

  test("updateResource recalcula línea, partida y presupuesto", async () => {
    const before = await budgetRow();
    const cement = (await resourcesOf(importedItemId)).find((r) => r.sourceItemId === cementId)!;

    // Desperdicio 10 % → 0 %: cemento 8.250 → 7.500; unitario 13.250 → 12.500.
    const { revision } = await dbA.budgets.updateResource(
      projectId,
      cement.id,
      { wastePct: M(0) },
      before.revision,
    );
    expect(revision).toBe(before.revision + 1);

    const updated = (await resourcesOf(importedItemId)).find((r) => r.id === cement.id)!;
    expect(M(updated.wastePct)).toBe(M(0));
    expect(M(updated.totalPrice)).toBe(M(7_500_000_000));

    const item = await db.orm.public.BudgetItem.where({ id: importedItemId }).first();
    expect(M(item!.unitCostDirect)).toBe(M(12_500_000_000));
    expect(M(item!.totalCostDirect)).toBe(M(31_250_000_000));

    const after = await budgetRow();
    expect(after.revision).toBe(before.revision + 1);
    expect(M(after.directCostTotal)).toBe(M(31_250_000_000));
  });

  test("updateResource rechaza rendimiento no positivo y desperdicio negativo", async () => {
    const cement = (await resourcesOf(importedItemId)).find((r) => r.sourceItemId === cementId)!;
    await expect(
      dbA.budgets.updateResource(projectId, cement.id, { performance: M(0) }),
    ).rejects.toThrow("El rendimiento debe ser mayor a cero.");
    await expect(
      dbA.budgets.updateResource(projectId, cement.id, { wastePct: M(-1) }),
    ).rejects.toThrow("El desperdicio no puede ser negativo.");
  });

  test("updateResource: el otro negocio no puede tocar la línea", async () => {
    const cement = (await resourcesOf(importedItemId)).find((r) => r.sourceItemId === cementId)!;
    await expect(
      dbB.budgets.updateResource(projectId, cement.id, { wastePct: M(500_000) }),
    ).rejects.toThrow("Presupuesto no encontrado en este negocio.");
    const unchanged = (await resourcesOf(importedItemId)).find((r) => r.id === cement.id)!;
    expect(M(unchanged.wastePct)).toBe(M(0));
  });

  test("updateResource rechaza desperdicio mayor a 100 %", async () => {
    const cement = (await resourcesOf(importedItemId)).find((r) => r.sourceItemId === cementId)!;
    await expect(
      dbA.budgets.updateResource(projectId, cement.id, { wastePct: M(1_000_001) }),
    ).rejects.toThrow("El desperdicio no puede superar el 100 %.");
  });

  test("concurrencia: dos ediciones sobre la misma revisión, solo una gana", async () => {
    const before = await budgetRow();
    const [cement, labor] = await (async () => {
      const rs = await resourcesOf(importedItemId);
      return [
        rs.find((r) => r.sourceItemId === cementId)!,
        rs.find((r) => r.sourceItemId === laborId)!,
      ];
    })();

    const results = await Promise.allSettled([
      dbA.budgets.updateResource(projectId, cement.id, { wastePct: M(50_000) }, before.revision),
      dbA.budgets.updateResource(projectId, labor.id, { wastePct: M(50_000) }, before.revision),
    ]);
    const ok = results.filter((r) => r.status === "fulfilled");
    const failed = results.filter((r) => r.status === "rejected");
    expect(ok).toHaveLength(1);
    expect(failed).toHaveLength(1);
    expect(String((failed[0] as PromiseRejectedResult).reason)).toContain("STALE_REVISION");

    // La perdedora se revirtió entera: exactamente una línea cambió.
    const changed = (await resourcesOf(importedItemId)).filter(
      (r) => M(r.wastePct) === M(50_000),
    );
    expect(changed).toHaveLength(1);
    expect((await budgetRow()).revision).toBe(before.revision + 1);

    // Restaura el estado para las pruebas siguientes.
    const current = await budgetRow();
    await dbA.budgets.updateResource(projectId, changed[0].id, { wastePct: M(0) }, current.revision);
  });

  test("el APU se devuelve en orden estable: tipo y luego nombre", async () => {
    const tree = await dbA.budgets.get(projectId);
    const item = tree!.chapters
      .flatMap((chapter) => chapter.items)
      .find((it) => it.id === importedItemId)!;
    expect(item.resources.map((r) => r.type)).toEqual(["MATERIAL", "LABOR"]);
  });

  test("presupuesto bloqueado: no se importa ni se edita", async () => {
    const cement = (await resourcesOf(importedItemId)).find((r) => r.sourceItemId === cementId)!;
    await dbA.budgets.setLocked(projectId, true);
    try {
      await expect(
        dbA.budgets.importActivityFromCatalog(projectId, chapterId, activityId),
      ).rejects.toThrow("El presupuesto está bloqueado.");
      await expect(
        dbA.budgets.updateResource(projectId, cement.id, { wastePct: M(50_000) }),
      ).rejects.toThrow("El presupuesto está bloqueado.");
    } finally {
      await dbA.budgets.setLocked(projectId, false, undefined, "fin de prueba");
    }
  });
});
