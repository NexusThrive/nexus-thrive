import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { db } from "@/prisma/db";
import { buildMasterPackPlan } from "./master-pack-plan";
import { executeMasterPackImport } from "./master-pack-import";
import { samplePack } from "./__fixtures__/sample-pack";

/**
 * Reglas de "no se pierde ningún dato" con un pack sintético (corre en CI).
 * Se salta sin TEST_DATABASE_URL.
 */
const TEST_URL = process.env.TEST_DATABASE_URL;
const normalize = (url: string | undefined) => (url ?? "").replace(/\?.*$/, "");

describe.skipIf(!TEST_URL)("executeMasterPackImport (integración)", () => {
  let tenantId = "";
  let legacyItemId = "";
  let legacyActivityId = "";

  const run = (pack = samplePack(), updatePrices = true) =>
    executeMasterPackImport({
      tenantId,
      parse: pack,
      plan: buildMasterPackPlan(pack),
      fileName: "pack.xlsx",
      fileSha256: "f".repeat(64),
      importedBy: "test",
      updatePrices,
    });

  beforeAll(async () => {
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) {
      throw new Error("Estas pruebas exigen DATABASE_URL=$TEST_DATABASE_URL.");
    }
    tenantId = (
      await db.orm.public.Tenant.create({
        name: "Tenant import",
        slug: `test-mpi-${Date.now().toString(36)}`,
        vertical: "construction",
      })
    ).id;
    // Datos del importador anterior: insumo y actividad sin sourceKey.
    legacyItemId = (
      await db.orm.public.ApuItem.create({
        tenantId,
        code: "CEM-01",
        name: "Cemento gris",
        unit: "kg",
        category: "MATERIAL",
        unitPrice: "450",
      })
    ).id;
    legacyActivityId = (
      await db.orm.public.ApuActivity.create({ tenantId, code: "1.01", name: "Acarreo viejo", unit: "m3" })
    ).id;
    await db.orm.public.ApuActivityComposition.create({
      activityId: legacyActivityId,
      itemId: legacyItemId,
      consumption: "5",
      wastePercent: "0",
    });
  });

  afterAll(async () => {
    if (tenantId) await db.orm.public.Tenant.where({ id: tenantId }).delete();
  });

  test("adopta lo existente en vez de duplicarlo y deja el precio anterior en el historial", async () => {
    const result = await run();
    expect(result.items.adopted).toBe(1);
    expect(result.activities.adopted).toBe(1);
    expect(result.lines.replacedLegacy).toBe(1);

    const item = await db.orm.public.ApuItem.where({ id: legacyItemId }).first();
    expect(item!.code).toBe("CEM-01"); // el código del usuario se conserva
    expect(String(item!.unitPrice)).toBe("500");
    expect(item!.imageId).not.toBeNull();
    const history = await db.orm.public.ApuItemPriceHistory.where({ itemId: legacyItemId })
      .orderBy((h) => h.createdAt.asc())
      .all();
    expect(history.map((h) => [h.source, String(h.price)])).toEqual([
      ["ANTERIOR", "450"],
      ["IMPORT", "500"],
    ]);

    const activity = await db.orm.public.ApuActivity.where({ id: legacyActivityId }).first();
    expect(activity!.sourceKey).toBe("APU:1.01");
    expect(activity!.name).toBe("Acarreo");
    const lines = await db.orm.public.ApuActivityComposition.where({ activityId: legacyActivityId }).all();
    expect(lines).toHaveLength(3);
    expect(lines.every((l) => l.origin === "IMPORT")).toBe(true);
  });

  test("un archivo sin la foto no la borra y una línea manual sobrevive", async () => {
    const manual = await db.orm.public.ApuActivityComposition.create({
      activityId: legacyActivityId,
      itemId: legacyItemId,
      consumption: "1",
      wastePercent: "0",
      origin: "MANUAL",
      order: 50,
    });
    const withoutImage = samplePack({ images: new Map() });
    withoutImage.materials[0].imageSha256 = null;
    const result = await run(withoutImage);
    expect(result.lines.manualKept).toBe(1);
    expect(await db.orm.public.ApuActivityComposition.where({ id: manual.id }).first()).not.toBeNull();
    const item = await db.orm.public.ApuItem.where({ id: legacyItemId }).first();
    expect(item!.imageId).not.toBeNull();
  });

  test("sin actualizar precios, el precio del insumo no cambia", async () => {
    const cheaper = samplePack();
    cheaper.materials[0].unitPrice = "480";
    cheaper.apus[0].lines[0].unitPrice = "480";
    cheaper.apus[0].lines[0].partial = "960";
    cheaper.apus[0].totalCost = "17065.44";
    const result = await run(cheaper, false);
    expect(result.prices.changed).toBe(0);
    const item = await db.orm.public.ApuItem.where({ id: legacyItemId }).first();
    expect(String(item!.unitPrice)).toBe("500");
    expect((await db.orm.public.ApuImportRun.where({ tenantId }).all()).length).toBe(3);
  });

  test("lo que no viene en el archivo no se borra", async () => {
    const extra = await db.orm.public.ApuItem.create({
      tenantId,
      name: "Insumo propio",
      unit: "un",
      category: "OTRO",
      unitPrice: "1",
    });
    await run();
    expect(await db.orm.public.ApuItem.where({ id: extra.id }).first()).not.toBeNull();
  });
});
