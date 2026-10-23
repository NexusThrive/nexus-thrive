import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { db } from "@/prisma/db";
import { createTenantDb } from "@/lib/tenant/db";
import { parseMasterPack } from "./master-pack";
import { buildMasterPackPlan } from "./master-pack-plan";
import { executeMasterPackImport } from "./master-pack-import";

/**
 * Importación real del pack (2.288 APU, 1.323 fotos) dos veces sobre una base
 * de prueba. Requiere TEST_DATABASE_URL y MASTER_PACK_FILE.
 */
const FILE = process.env.MASTER_PACK_FILE;
const TEST_URL = process.env.TEST_DATABASE_URL;
const normalize = (url: string | undefined) => (url ?? "").replace(/\?.*$/, "");

describe.skipIf(!FILE || !TEST_URL)("importación del pack completo (integración)", () => {
  let tenantId = "";
  const raw = FILE ? readFileSync(FILE) : Buffer.alloc(0);
  const buffer = raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength) as ArrayBuffer;
  const sha = createHash("sha256").update(raw).digest("hex");
  const parse = FILE ? parseMasterPack(buffer) : null;
  const plan = parse ? buildMasterPackPlan(parse) : null;

  const run = () =>
    executeMasterPackImport({
      tenantId,
      parse: parse!,
      plan: plan!,
      fileName: "MASTER PACK.xlsx",
      fileSha256: sha,
      importedBy: "test",
      updatePrices: true,
    });

  const count = async () => ({
    items: (await db.orm.public.ApuItem.where({ tenantId }).select("id").all()).length,
    activities: (await db.orm.public.ApuActivity.where({ tenantId }).select("id").all()).length,
    chapters: (await db.orm.public.ApuChapter.where({ tenantId }).select("id").all()).length,
    images: (await db.orm.public.ApuImage.where({ tenantId }).select("id").all()).length,
    itemsWithImage: (
      await db.orm.public.ApuItem.where({ tenantId }).where((i) => i.imageId.isNotNull()).select("id").all()
    ).length,
  });

  beforeAll(async () => {
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) {
      throw new Error("Estas pruebas exigen DATABASE_URL=$TEST_DATABASE_URL.");
    }
    tenantId = (
      await db.orm.public.Tenant.create({
        name: "Tenant pack",
        slug: `test-pack-${Date.now().toString(36)}`,
        vertical: "construction",
      })
    ).id;
  });

  afterAll(async () => {
    if (tenantId) await db.orm.public.Tenant.where({ id: tenantId }).delete();
  });

  let manualLineId = "";

  test("primera importación: todo el archivo, verificado", async () => {
    const started = Date.now();
    const result = await run();
    console.log("primera", Date.now() - started, "ms", JSON.stringify(result));
    const totals = await count();
    expect(totals).toEqual({
      items: plan!.items.length,
      activities: plan!.activities.length,
      chapters: plan!.chapters.length,
      images: new Set(plan!.items.map((i) => i.imageSha256).filter(Boolean)).size,
      itemsWithImage: plan!.items.filter((i) => i.imageSha256).length,
    });
    expect(result.lines.written).toBe(plan!.lineCount);
    expect(result.verification.mismatches).toBe(0);

    // Una línea porcentual conserva lo que dice el archivo.
    const activity = await db.orm.public.ApuActivity.where({ tenantId, code: "1.01" }).first();
    const lines = await db.orm.public.ApuActivityComposition.where({ activityId: activity!.id })
      .orderBy((l) => l.order.asc())
      .all();
    expect(lines.map((l) => l.section)).toEqual(["EQUIPO y HERRAMIENTAS:", "MANO de OBRA:"]);
    expect(String(lines[0].lineQuantity)).toBe("0.0013");
    expect(activity!.referenceUnitPrice !== null).toBe(true);

    // Línea manual agregada por el usuario.
    const anyItem = await db.orm.public.ApuItem.where({ tenantId }).first();
    manualLineId = (
      await db.orm.public.ApuActivityComposition.create({
        activityId: activity!.id,
        itemId: anyItem!.id,
        consumption: "1",
        wastePercent: "0",
        origin: "MANUAL",
        order: 99,
      })
    ).id;
  }, 300_000);

  test("reimportar no duplica ni pierde nada (líneas manuales y fotos se conservan)", async () => {
    const before = await count();
    const result = await run();
    console.log("segunda", JSON.stringify(result));
    expect(await count()).toEqual(before);
    expect(result.items.created).toBe(0);
    expect(result.activities.created).toBe(0);
    expect(result.images.stored).toBe(0);
    expect(result.lines.replacedImported).toBe(plan!.lineCount);
    expect(result.lines.written).toBe(plan!.lineCount);
    expect(result.lines.manualKept).toBe(1);
    expect(await db.orm.public.ApuActivityComposition.where({ id: manualLineId }).first()).not.toBeNull();
    const runs = await db.orm.public.ApuImportRun.where({ tenantId }).all();
    expect(runs).toHaveLength(2);
  }, 300_000);

  test("una actividad con línea porcentual y foto pasa al presupuesto con el costo del archivo", async () => {
    // Actividad con línea %MO y al menos un insumo con foto.
    const candidates = plan!.activities.filter(
      (a) =>
        !a.isAuxiliary &&
        a.lines.some((l) => l.lineUnit.startsWith("%")) &&
        a.lines.some((l) => plan!.items.find((i) => i.sourceKey === l.itemSourceKey)?.imageSha256),
    );
    expect(candidates.length).toBeGreaterThan(0);
    const target = candidates[0];
    const activity = await db.orm.public.ApuActivity.where({ tenantId, sourceKey: target.sourceKey }).first();

    const tenantDb = createTenantDb(tenantId);
    const customer = await db.orm.public.Customer.create({ tenantId, name: "Cliente" });
    const project = await tenantDb.projects.create({ customerId: customer.id, name: "Obra pack" });
    await tenantDb.budgets.getOrCreate(project.id);
    const chapter = await tenantDb.budgets.createChapter(project.id, { name: "Capítulo" });
    const { id } = await tenantDb.budgets.importActivityFromCatalog(project.id, chapter.id, activity!.id);

    const item = await db.orm.public.BudgetItem.where({ id }).first();
    const referenceMicro = BigInt(Math.round(Number(target.referenceUnitPrice) * 1_000_000));
    const diff = BigInt(item!.unitCostDirect) - referenceMicro;
    // El archivo redondea cada parcial a centavos (un centavo por línea) y, en
    // algunos APU, el total al peso (misma regla que la verificación del plan).
    const roundedToPeso = !String(target.referenceUnitPrice).includes(".");
    const tolerance = roundedToPeso ? 1_000_000 : target.lines.length * 10_000;
    expect(diff < 0n ? -diff : diff).toBeLessThanOrEqual(BigInt(tolerance));

    const resources = await db.orm.public.BudgetItemResource.where({ itemId: id })
      .orderBy((r) => r.order.asc())
      .all();
    expect(resources).toHaveLength(target.lines.length);
    expect(resources.map((r) => r.section)).toEqual(target.lines.map((l) => l.section));
    expect(resources.some((r) => r.imageId)).toBe(true);
    const percent = resources.find((r) => r.unit.startsWith("%"))!;
    expect(BigInt(percent.performance)).toBeLessThan(BigInt(1_000_000));
    console.log("presupuesto", target.code, String(item!.unitCostDirect), target.referenceUnitPrice);
  }, 120_000);
});
