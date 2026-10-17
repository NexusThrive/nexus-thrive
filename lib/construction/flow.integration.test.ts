import { afterAll, beforeAll, describe, expect, test } from "vitest";
import * as XLSX from "xlsx";
import { db } from "@/prisma/db";
import { createTenantDb } from "@/lib/tenant-db";
import { formatPlainDate, isoWeekOf, bogotaToday } from "@/lib/lean-engine";
import { buildMasterPackPlan } from "@/lib/apu-importer/master-pack-plan";
import { executeMasterPackImport } from "@/lib/apu-importer/master-pack-import";
import { samplePack } from "@/lib/apu-importer/__fixtures__/sample-pack";
import { ensureProjectContainers } from "./containers";
import { buildBudgetWorkbook } from "./budget-export";

/**
 * Flujo completo de construcción (criterio de cierre de la rama):
 * catálogo importado → obra → presupuesto con APU del catálogo → cotización
 * v1 y v2 → aprobación → línea base e Informe Cero con la constructora →
 * avance → informe semanal con valor ganado → Excel y BOM.
 */
const TEST_URL = process.env.TEST_DATABASE_URL;
const normalize = (url: string | undefined) => (url ?? "").replace(/\?.*$/, "");

describe.skipIf(!TEST_URL)("flujo completo de una obra (integración)", () => {
  let tenantId = "";
  let tenantDb: ReturnType<typeof createTenantDb>;

  beforeAll(async () => {
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) {
      throw new Error("Estas pruebas exigen DATABASE_URL=$TEST_DATABASE_URL.");
    }
    tenantId = (
      await db.orm.public.Tenant.create({
        name: "Andina",
        legalName: "Constructora Andina S.A.S.",
        taxId: "901234567",
        city: "Medellín",
        slug: `test-flow-${Date.now().toString(36)}`,
        vertical: "construction",
      })
    ).id;
    tenantDb = createTenantDb(tenantId);
  });

  afterAll(async () => {
    if (tenantId) await db.orm.public.Tenant.where({ id: tenantId }).delete();
  });

  test("de la importación del catálogo al informe semanal", async () => {
    // 1. Catálogo APU importado (pack con foto, auxiliar y línea porcentual).
    const pack = samplePack();
    const imported = await executeMasterPackImport({
      tenantId,
      parse: pack,
      plan: buildMasterPackPlan(pack),
      fileName: "pack.xlsx",
      fileSha256: "a".repeat(64),
      importedBy: "test",
      updatePrices: true,
    });
    expect(imported.verification.mismatches).toBe(0);
    const activity = (await tenantDb.apu.listActivities({ q: "Acarreo" })).rows[0];
    expect(activity.chapterName).toBe("PRELIMINARES");

    // 2. Obra con sus contenedores y una partida importada del catálogo.
    const customer = await db.orm.public.Customer.create({ tenantId, name: "Inversiones Río" });
    const project = await tenantDb.projects.create({ customerId: customer.id, name: "Bodega Río" });
    await ensureProjectContainers(tenantDb, project.id);
    const chapter = await tenantDb.budgets.createChapter(project.id, { name: "Preliminares" });
    const { id: itemId } = await tenantDb.budgets.importActivityFromCatalog(
      project.id,
      chapter.id,
      activity.id,
      BigInt(100_000_000), // 100 m3
    );
    let budget = (await tenantDb.budgets.get(project.id))!;
    const item = budget.chapters[0].items[0];
    expect(item.resources.map((r) => r.section)).toEqual([
      "MATERIALES:",
      "MANO de OBRA:",
      "EQUIPO y HERRAMIENTAS:",
    ]);
    expect(item.resources[0].imageId).not.toBeNull();
    // Costo del APU del archivo (17.105,44) × 100 m3.
    expect(Math.round(Number(item.totalCostDirect) / 1_000_000)).toBe(1_710_544);

    // 3. Cotización v1, ajuste, v2 y aprobación del cliente.
    const v1 = await tenantDb.projectQuotes.emit(project.id, { validUntil: "2026-12-31", showApuDetail: true });
    await tenantDb.budgets.updateAiu(project.id, {
      adminPct: BigInt(120_000),
      imprevPct: BigInt(50_000),
      utilidadPct: BigInt(60_000),
      ivaUtilidadPct: BigInt(190_000),
    });
    const v2 = await tenantDb.projectQuotes.emit(project.id, { validUntil: "2026-12-31", showApuDetail: true });
    expect(v2.version).toBe(2);
    expect((await tenantDb.projectQuotes.getDocument(v1.id))!.quote.status).toBe("SUPERSEDED");
    await tenantDb.projectQuotes.decide(v2.id, { decision: "APPROVE", userId: "u", userName: "Dueño" });
    budget = (await tenantDb.budgets.get(project.id))!;
    expect(budget.isLocked).toBe(true);
    expect((await tenantDb.projects.get(project.id))!.status).toBe("APPROVED");
    const document = (await tenantDb.projectQuotes.getDocument(v2.id))!.document;
    expect(document.totals.grand).toBe(budget.grandTotal);
    expect(document.chapters[0].items[0].resources).toHaveLength(3);

    // 4. Informe Cero con la constructora y el cliente.
    const informe = (await tenantDb.reports.getInformeCeroData(project.id))!;
    expect(informe.constructorName).toBe("Constructora Andina S.A.S.");
    expect(informe.constructorNit).toBe("901234567");
    expect(informe.clientName).toBe("Inversiones Río");
    expect(await tenantDb.budgets.listBaselines(project.id)).toHaveLength(1);

    // 5. Avance y valor ganado en el informe semanal.
    await tenantDb.progress.record(project.id, {
      budgetItemId: itemId,
      cutoffDate: formatPlainDate(bogotaToday()),
      executedQuantity: BigInt(25_000_000), // 25 de 100 m3
      authorName: "Residente",
    });
    expect((await tenantDb.projects.get(project.id))!.status).toBe("IN_EXECUTION");
    const { week, year } = isoWeekOf(bogotaToday());
    const weekly = (await tenantDb.reports.getWeeklyReportData(project.id, week, year))!;
    expect(weekly.evm.ev.measurable).toBe(true);
    expect(weekly.evm.physicalProgressPct).toBe(25);

    // 6. Excel y BOM del presupuesto.
    const workbook = XLSX.read(
      buildBudgetWorkbook({
        budget,
        projectCode: project.code,
        projectName: project.name,
        customerName: "Inversiones Río",
        issuerName: "Constructora Andina S.A.S.",
        generatedOn: "2026-10-16",
      }),
      { type: "array" },
    );
    expect(workbook.SheetNames).toEqual(["Presupuesto", "APU"]);
    const bom = await tenantDb.reports.getBomExportData(project.id);
    expect(bom.length).toBeGreaterThan(0);
  });
});
