import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { db } from "@/prisma/db";
import { isoWeekOf, bogotaToday, mondayOf, formatPlainDate } from "@/lib/construction/lean-engine";

import { createConstructionDb, type ConstructionDb } from "@/lib/construction/construction-db";
/**
 * Integración: actas de avance → valor ganado del informe semanal, y enlace
 * de lookahead / compromisos / bitácora a una partida. Sin TEST_DATABASE_URL
 * se salta.
 */
const TEST_URL = process.env.TEST_DATABASE_URL;
const normalize = (url: string | undefined) => (url ?? "").replace(/\?.*$/, "");

describe.skipIf(!TEST_URL)("avance de obra y valor ganado (integración)", () => {
  let tenantId = "";
  let construction: ConstructionDb;
  let projectId = "";
  let itemId = "";
  const today = formatPlainDate(bogotaToday());

  beforeAll(async () => {
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) {
      throw new Error("Estas pruebas exigen DATABASE_URL=$TEST_DATABASE_URL.");
    }
    tenantId = (
      await db.orm.public.Tenant.create({
        name: "Constructora avance",
        slug: `test-prog-${Date.now().toString(36)}`,
        vertical: "construction",
      })
    ).id;
    construction = createConstructionDb(tenantId);
    const customer = await db.orm.public.Customer.create({ tenantId, name: "Cliente" });
    projectId = (await construction.projects.create({ customerId: customer.id, name: "Obra avance" })).id;
    await construction.budgets.getOrCreate(projectId);
    await construction.lean.getOrCreatePlan(projectId);
    await construction.fieldLog.getOrCreateLog(projectId);
    const chapter = await construction.budgets.createChapter(projectId, { name: "Estructura" });
    itemId = (
      await construction.budgets.createItem(projectId, {
        chapterId: chapter.id,
        code: "2.1",
        description: "Columnas",
        unit: "m3",
        quantity: BigInt(10_000_000), // 10 m3
        unitCostDirect: BigInt(800_000_000_000), // $800.000 / m3
      })
    ).id;
  });

  afterAll(async () => {
    if (tenantId) await db.orm.public.Tenant.where({ id: tenantId }).delete();
  });

  test("no se registra avance antes de contratar la obra", async () => {
    await expect(
      construction.progress.record(projectId, {
        budgetItemId: itemId,
        cutoffDate: today,
        executedQuantity: BigInt(1_000_000),
        authorName: "Residente",
      }),
    ).rejects.toThrow("PROJECT_NOT_CONTRACTED");
  });

  test("la primera acta pasa la obra a En ejecución; el avance y el valor ganado se acumulan", async () => {
    const quote = await construction.projectQuotes.emit(projectId, { validUntil: null, showApuDetail: false });
    await construction.projectQuotes.decide(quote.id, { decision: "APPROVE", userId: "u", userName: "Dueño" });

    const first = await construction.progress.record(projectId, {
      budgetItemId: itemId,
      cutoffDate: today,
      executedQuantity: BigInt(2_500_000),
      note: "Columnas eje A",
      authorName: "Residente",
    });
    expect(first.projectStatus).toBe("IN_EXECUTION");
    await construction.progress.record(projectId, {
      budgetItemId: itemId,
      cutoffDate: today,
      executedQuantity: BigInt(1_500_000),
      authorName: "Residente",
    });

    const [row] = await construction.progress.listByItem(projectId);
    expect(row.executed).toBe("4000000");
    expect(row.pct).toBe(40);
    expect(row.earned).toBe("3200000000000"); // 4 × 800.000
    expect(row.entries).toHaveLength(2);
  });

  test("el informe semanal mide el valor ganado y el avance físico", async () => {
    const { week, year } = isoWeekOf(bogotaToday());
    const report = await construction.reports.getWeeklyReportData(projectId, week, year);
    expect(report!.evm.ev.measurable).toBe(true);
    expect(report!.evm.ev.value).toContain("3.200.000");
    expect(report!.evm.physicalProgressPct).toBe(40);
    expect(report!.evm.pv.measurable).toBe(false);
  });

  test("fecha futura y cantidad cero se rechazan", async () => {
    await expect(
      construction.progress.record(projectId, {
        budgetItemId: itemId,
        cutoffDate: "2999-01-01",
        executedQuantity: BigInt(1),
        authorName: "R",
      }),
    ).rejects.toThrow("INVALID_DATE");
    await expect(
      construction.progress.record(projectId, { budgetItemId: itemId, cutoffDate: today, executedQuantity: BigInt(0), authorName: "R" }),
    ).rejects.toThrow("INVALID_QUANTITY");
  });

  test("lookahead, compromisos y bitácora se enlazan a una partida de la obra (y no a una ajena)", async () => {
    const plan = (await construction.lean.getPlan(projectId))!;
    await construction.lean.createLookaheadTask(projectId, {
      code: "T-1",
      description: "Encofrado columnas",
      weekNumber: 1,
      startDate: plan.windowStart,
      endDate: plan.windowStart,
      responsible: "Maestro",
      isRestricted: true,
      budgetItemId: itemId,
    });
    await construction.lean.createCommitment(projectId, {
      description: "Fundir columnas eje B",
      responsible: "Maestro",
      weekStartDate: formatPlainDate(mondayOf(bogotaToday())),
      budgetItemId: itemId,
    });
    const log = (await construction.fieldLog.getLog(projectId))!;
    await construction.fieldLog.createEntry(log.id, {
      type: "ADVANCE",
      entryDate: today,
      title: "Fundida",
      description: "Columnas eje A",
      weather: "SUNNY",
      laborCount: 6,
      authorName: "Residente",
      authorRole: "STAFF",
      photoUrls: ["/api/apu-images/00000000-0000-0000-0000-000000000000"],
      budgetItemId: itemId,
    });

    const after = (await construction.lean.getPlan(projectId))!;
    expect(after.lookaheadTasks[0]).toMatchObject({ budgetItemId: itemId, isRestricted: true });
    expect(after.commitments[0].budgetItemId).toBe(itemId);
    const entries = (await construction.fieldLog.getLog(projectId))!.entries;
    expect(entries[0].budgetItemId).toBe(itemId);
    expect(entries[0].photoUrls).toHaveLength(1);

    const otherConstruction = createConstructionDb(tenantId);
    const otherCustomer = await db.orm.public.Customer.create({ tenantId, name: "Otro" });
    const otherProject = (await otherConstruction.projects.create({ customerId: otherCustomer.id, name: "Otra obra" })).id;
    await otherConstruction.lean.getOrCreatePlan(otherProject);
    await expect(
      otherConstruction.lean.createCommitment(otherProject, {
        description: "Ajeno",
        responsible: "X",
        weekStartDate: formatPlainDate(mondayOf(bogotaToday())),
        budgetItemId: itemId,
      }),
    ).rejects.toThrow("no pertenece al presupuesto");
  });
});
