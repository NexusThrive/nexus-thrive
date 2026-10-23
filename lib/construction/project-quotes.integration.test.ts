import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { db } from "@/prisma/db";
import { createTenantDb } from "@/lib/tenant/db";
import type { QuoteDocument } from "./quote-document";
import { buildApuSnapshot, calculateQuoteTotals } from "@/lib/construction/apu-engine";

/**
 * Integración: la cotización nace de la obra.
 * Emitir versiones → reemplazo → decisión del cliente → obra contratada con
 * línea base y presupuesto bloqueado. Se salta sin TEST_DATABASE_URL.
 */
const TEST_URL = process.env.TEST_DATABASE_URL;
const normalize = (url: string | undefined) => (url ?? "").replace(/\?.*$/, "");

describe.skipIf(!TEST_URL)("projectQuotes (integración)", () => {
  let tenantId = "";
  let tenantDb: ReturnType<typeof createTenantDb>;
  let customerId = "";

  async function newProjectWithBudget(name: string) {
    const project = await tenantDb.projects.create({ customerId, name });
    await tenantDb.budgets.getOrCreate(project.id);
    const chapter = await tenantDb.budgets.createChapter(project.id, { name: "Obra gris" });
    const item = await tenantDb.budgets.createItem(project.id, {
      chapterId: chapter.id,
      code: "1.1",
      description: "Muro",
      unit: "m2",
      quantity: BigInt(10_000_000),
      unitCostDirect: BigInt(50_000_000_000),
    });
    return { projectId: project.id, chapterId: chapter.id, itemId: item.id };
  }

  const status = async (projectId: string) =>
    (await db.orm.public.Project.where({ id: projectId }).select("status").first())?.status;
  const budgetRow = async (projectId: string) =>
    (await db.orm.public.ProjectBudget.where({ projectId }).first())!;

  beforeAll(async () => {
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) {
      throw new Error("Estas pruebas exigen DATABASE_URL=$TEST_DATABASE_URL.");
    }
    const stamp = Date.now().toString(36);
    tenantId = (
      await db.orm.public.Tenant.create({
        name: "Constructora Prueba",
        legalName: "Constructora Prueba S.A.S.",
        taxId: "900123456",
        slug: `test-pq-${stamp}`,
        vertical: "construction",
      })
    ).id;
    tenantDb = createTenantDb(tenantId);
    customerId = (await db.orm.public.Customer.create({ tenantId, name: "Cliente Obra" })).id;
  });

  afterAll(async () => {
    if (tenantId) await db.orm.public.Tenant.where({ id: tenantId }).delete();
  });

  test("emitir: versión 1 con la foto del presupuesto; la obra pasa a En cotización", async () => {
    const { projectId } = await newProjectWithBudget("Casa campestre");
    const budget = await budgetRow(projectId);
    const { id, version } = await tenantDb.projectQuotes.emit(
      projectId,
      { validUntil: "2026-12-31", showApuDetail: false },
      budget.revision,
    );
    expect(version).toBe(1);
    expect(await status(projectId)).toBe("BIDDING");

    const doc = await tenantDb.projectQuotes.getDocument(id);
    const document = doc!.document as QuoteDocument;
    expect(doc!.quote.status).toBe("SENT");
    expect(document.totals.grand).toBe(String(budget.grandTotal));
    expect(document.totals.direct).toBe(String(budget.directCostTotal));
    expect(document.issuer.name).toBe("Constructora Prueba S.A.S.");
    expect(document.client.name).toBe("Cliente Obra");
    expect(document.chapters[0].items[0].resources).toBeUndefined();
    expect(document.budgetRevision).toBe(budget.revision);
  });

  test("una nueva versión reemplaza a la anterior y un cambio posterior no altera la foto", async () => {
    const { projectId, itemId } = await newProjectWithBudget("Bodega");
    const v1 = await tenantDb.projectQuotes.emit(projectId, { validUntil: null, showApuDetail: true });
    const firstTotal = (await tenantDb.projectQuotes.getDocument(v1.id))!.document.totals.grand;

    await tenantDb.budgets.updateItem(projectId, itemId, {
      code: "1.1",
      description: "Muro",
      unit: "m2",
      quantity: BigInt(20_000_000),
      unitCostDirect: BigInt(50_000_000_000),
    });
    const v2 = await tenantDb.projectQuotes.emit(projectId, { validUntil: null, showApuDetail: true });
    expect(v2.version).toBe(2);

    const versions = await tenantDb.projectQuotes.list(projectId);
    expect(versions.map((q) => [q.version, q.status])).toEqual([
      [2, "SENT"],
      [1, "SUPERSEDED"],
    ]);
    expect((await tenantDb.projectQuotes.getDocument(v1.id))!.document.totals.grand).toBe(firstTotal);
    expect(BigInt((await tenantDb.projectQuotes.getDocument(v2.id))!.document.totals.grand)).toBeGreaterThan(
      BigInt(firstTotal),
    );
    await expect(
      tenantDb.projectQuotes.decide(v1.id, { decision: "APPROVE", userId: "u", userName: "U" }),
    ).rejects.toThrow("NOT_PENDING");
  });

  test("no se aprueba una versión si el presupuesto cambió después de emitirla", async () => {
    const { projectId } = await newProjectWithBudget("Local comercial");
    const v1 = await tenantDb.projectQuotes.emit(projectId, { validUntil: null, showApuDetail: false });
    await tenantDb.budgets.createChapter(projectId, { name: "Acabados" });
    await expect(
      tenantDb.projectQuotes.decide(v1.id, { decision: "APPROVE", userId: "u", userName: "U" }),
    ).rejects.toThrow("BUDGET_CHANGED");
    expect(await status(projectId)).toBe("BIDDING");
  });

  test("aprobar: obra contratada, línea base de la revisión cotizada y presupuesto bloqueado", async () => {
    const { projectId } = await newProjectWithBudget("Edificio");
    await expect(
      tenantDb.projects.updateProject(projectId, { expectedStatus: "DRAFT", status: "BIDDING" }),
    ).resolves.toBe("BIDDING");
    await expect(
      tenantDb.projects.updateProject(projectId, { expectedStatus: "BIDDING", status: "APPROVED" }),
    ).rejects.toThrow("APPROVED_REQUIRES_QUOTE");

    const quote = await tenantDb.projectQuotes.emit(projectId, { validUntil: null, showApuDetail: false });
    const quoted = await budgetRow(projectId);
    const result = await tenantDb.projectQuotes.decide(quote.id, {
      decision: "APPROVE",
      note: "Firmado en reunión",
      userId: "user-1",
      userName: "Dueño",
    });
    expect(result).toEqual({ status: "APPROVED", baselineVersion: 1 });
    expect(await status(projectId)).toBe("APPROVED");

    const budget = await budgetRow(projectId);
    expect(budget.isLocked).toBe(true);
    const baselines = await tenantDb.budgets.listBaselines(projectId);
    expect(baselines).toHaveLength(1);
    expect(baselines[0].budgetRevision).toBe(quoted.revision);
    expect(baselines[0].grandTotal).toBe(String(quoted.grandTotal));
    const doc = await tenantDb.projectQuotes.getDocument(quote.id);
    expect(doc!.quote).toMatchObject({ status: "APPROVED", decidedByName: "Dueño", decisionNote: "Firmado en reunión" });

    await expect(
      tenantDb.projectQuotes.emit(projectId, { validUntil: null, showApuDetail: false }),
    ).rejects.toThrow("PROJECT_NOT_QUOTABLE");
    await expect(
      tenantDb.projects.updateProject(projectId, { expectedStatus: "APPROVED", status: "IN_EXECUTION" }),
    ).resolves.toBe("IN_EXECUTION");
  });

  test("rechazar deja la obra en cotización; emitir con revisión vieja falla", async () => {
    const { projectId } = await newProjectWithBudget("Parqueadero");
    const budget = await budgetRow(projectId);
    const quote = await tenantDb.projectQuotes.emit(projectId, { validUntil: null, showApuDetail: false });
    await expect(
      tenantDb.projectQuotes.decide(quote.id, { decision: "REJECT", note: "Muy caro", userId: "u", userName: "U" }),
    ).resolves.toEqual({ status: "REJECTED" });
    expect(await status(projectId)).toBe("BIDDING");
    await expect(
      tenantDb.projectQuotes.emit(projectId, { validUntil: null, showApuDetail: false }, budget.revision - 1),
    ).rejects.toThrow("STALE_REVISION");
  });

  test("presupuesto vacío no se cotiza", async () => {
    const project = await tenantDb.projects.create({ customerId, name: "Sin partidas" });
    await tenantDb.budgets.getOrCreate(project.id);
    await expect(
      tenantDb.projectQuotes.emit(project.id, { validUntil: null, showApuDetail: false }),
    ).rejects.toThrow("EMPTY_BUDGET");
  });

  test("carpetas y seguimientos", async () => {
    const { projectId } = await newProjectWithBudget("Carpeta");
    const quote = await tenantDb.projectQuotes.emit(projectId, { validUntil: null, showApuDetail: false });
    const call = await tenantDb.projectQuotes.createFollowUp(projectId, {
      type: "CALL",
      note: "Llamar para revisar la propuesta",
      quoteId: quote.id,
      scheduledFor: "2026-11-02",
      authorName: "Asesor",
    });
    await tenantDb.projectQuotes.createFollowUp(projectId, {
      type: "NOTE",
      note: "Cliente pidió plazo",
      quoteId: null,
      scheduledFor: null,
      authorName: "Asesor",
    });

    let folder = (await tenantDb.projectQuotes.listFolders()).find((f) => f.projectId === projectId)!;
    expect(folder).toMatchObject({ quoteCount: 1, pendingFollowUps: 1, customerName: "Cliente Obra" });
    expect(folder.latest).toMatchObject({ version: 1, status: "SENT" });
    expect(folder.nextFollowUp).not.toBeNull();

    const followUps = await tenantDb.projectQuotes.listFollowUps(projectId);
    expect(followUps.find((f) => f.id === call.id)!.quoteVersion).toBe(1);
    expect(await tenantDb.projectQuotes.completeFollowUp(call.id)).toBe(true);
    folder = (await tenantDb.projectQuotes.listFolders()).find((f) => f.projectId === projectId)!;
    expect(folder.pendingFollowUps).toBe(0);

    const other = createTenantDb((await db.orm.public.Tenant.create({
      name: "Otro",
      slug: `test-pq-other-${Date.now().toString(36)}`,
      vertical: "construction",
    })).id);
    expect(await other.projectQuotes.getDocument(quote.id)).toBeNull();
    await expect(
      other.projectQuotes.decide(quote.id, { decision: "APPROVE", userId: "x", userName: "X" }),
    ).rejects.toThrow("NOT_FOUND");
  });

  test("una cotización antigua aprobada pasa a una obra contratada sin perder sus partidas ni su APU", async () => {
    const snapshot = buildApuSnapshot({
      activity: { id: "act-1", code: "2.01", name: "Excavación", unit: "m3" },
      components: [
        { itemId: "i-1", code: "OF", name: "Oficial", unit: "día", category: "MANO_DE_OBRA", unitPrice: "120000", consumption: "0.5", wastePercent: "0" },
        { itemId: "i-2", code: "HM", name: "Herramienta", unit: "un", category: "EQUIPO", unitPrice: "1000", consumption: "2", wastePercent: "10" },
      ],
    });
    const lines = [{ quantity: "12.5", unitCost: snapshot.unitCost }];
    const totals = calculateQuoteTotals(lines, {
      adminPercent: "10",
      imprevPercent: "5",
      utilPercent: "5",
      taxPercent: "19",
    });
    const legacy = await db.orm.public.Quote.create({
      tenantId,
      customerId,
      title: "Excavación lote 4",
      code: `PRES-LEG-${Date.now().toString(36)}`,
      status: "APPROVED",
      adminPercent: "10",
      imprevPercent: "5",
      utilPercent: "5",
      taxPercent: "19",
      directCost: totals.directCost,
      totalAmount: totals.totalAmount,
    });
    await db.orm.public.QuoteItem.create({
      quoteId: legacy.id,
      name: "Excavación",
      unit: "m3",
      quantity: "12.5",
      unitCost: snapshot.unitCost,
      totalCost: totals.directCost,
      apuSnapshot: snapshot as never,
    });
    expect((await tenantDb.projectQuotes.listLegacy()).map((q) => q.id)).toContain(legacy.id);

    const project = await tenantDb.projects.create({ customerId, name: legacy.title });
    await tenantDb.budgets.getOrCreate(project.id);
    const result = await tenantDb.projectQuotes.adoptLegacyQuote(legacy.id, project.id, {
      userId: "u",
      userName: "Dueño",
    });
    expect(result.projectStatus).toBe("APPROVED");
    // Mismo total que la cotización antigua (a centavos).
    expect(Math.abs(Number(result.newTotal) / 1_000_000 - Number(result.legacyTotal))).toBeLessThan(0.01);

    const tree = (await tenantDb.budgets.get(project.id))!;
    const item = tree.chapters[0].items[0];
    expect(item.code).toBe("2.01");
    expect(item.quantity).toBe("12500000");
    expect(item.resources.map((r) => r.name)).toEqual(["Oficial", "Herramienta"]);
    expect(tree.isLocked).toBe(true);
    expect(await status(project.id)).toBe("APPROVED");
    expect(await tenantDb.budgets.listBaselines(project.id)).toHaveLength(1);
    const versions = await tenantDb.projectQuotes.list(project.id);
    expect(versions).toHaveLength(1);
    expect(versions[0]).toMatchObject({ version: 1, status: "APPROVED", code: legacy.code });
    expect((await tenantDb.projectQuotes.listLegacy()).map((q) => q.id)).not.toContain(legacy.id);
    await expect(
      tenantDb.projectQuotes.adoptLegacyQuote(legacy.id, project.id, { userId: "u", userName: "U" }),
    ).rejects.toThrow("ALREADY_MIGRATED");
  });
});
