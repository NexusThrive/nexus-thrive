import { describe, test, beforeAll, afterAll, expect } from "vitest";
import { db } from "@/prisma/db";
import { createTenantDb } from "@/lib/tenant-db";
import { executeImport } from "@/lib/apu-importer/execute";
import type { ExecutionPlan, PlannedItem } from "@/lib/apu-importer/index";

const TEST_URL = process.env.TEST_DATABASE_URL;
const enabled = Boolean(TEST_URL);

function normalize(url: string | undefined): string {
  return (url ?? "").replace(/\?.*$/, "");
}

function makeItem(overrides: Partial<PlannedItem> = {}): PlannedItem {
  return {
    key: `item-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    code: "CEM-001",
    name: "Cemento Portland",
    unit: "BOL",
    unitPrice: "35000",
    category: "MATERIAL",
    sourceIndex: 0,
    ...overrides,
  };
}

describe.skipIf(!enabled)("apu-importer: price behavior", () => {
  let tenantDb: ReturnType<typeof createTenantDb>;
  let tenantId: string;

  beforeAll(async () => {
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) {
      throw new Error("DATABASE_URL mismatch");
    }
    const t = await db.orm.public.Tenant.create({
      name: "Import Price Test",
      slug: `import-price-${Date.now().toString(36)}`,
      vertical: "construction",
    });
    tenantId = t.id;
    tenantDb = createTenantDb(tenantId);
    
    // Create an existing item with known price
    await tenantDb.apu.createItem({
      name: "Cemento Portland",
      unit: "BOL",
      category: "MATERIAL",
      unitPrice: "28000",
      code: "CEM-001",
    });
  });

  afterAll(async () => {
    // cleanup handled by test DB
  });

  test("sin updatePrices: NO cambia precio de insumo existente", async () => {
    const plan: ExecutionPlan = {
      items: [makeItem({ code: "CEM-001", unitPrice: "35000" })],
      activities: [],
      skippedRows: 0,
      warnings: [],
    };

    const result = await executeImport(tenantId, plan, false);

    expect(result.updatedItems).toBe(1);
    expect(result.createdItems).toBe(0);
    expect(result.priceChanges).toHaveLength(1);
    expect(result.priceChanges[0]).toMatchObject({
      code: "CEM-001",
      currentPrice: "28000",
      newPrice: "35000",
    });
    expect(result.priceChanges[0].variationPct).toBeCloseTo(25, 1);

    // Verify in DB: price should still be 28000
    const item = await tenantDb.apu.getItem(result.priceChanges[0].itemId);
    expect(item?.unitPrice).toBe("28000");
  });

  test("con updatePrices: SÍ actualiza precio de insumo existente", async () => {
    const plan: ExecutionPlan = {
      items: [makeItem({ code: "CEM-001", unitPrice: "35000" })],
      activities: [],
      skippedRows: 0,
      warnings: [],
    };

    const result = await executeImport(tenantId, plan, true);

    expect(result.updatedItems).toBe(1);
    expect(result.priceChanges).toHaveLength(1);

    // Verify in DB: price should now be 35000
    const item = await tenantDb.apu.getItem(result.priceChanges[0].itemId);
    expect(item?.unitPrice).toBe("35000");
  });

  test("insumos nuevos se crean normalmente (sin importar updatePrices)", async () => {
    const plan: ExecutionPlan = {
      items: [makeItem({ 
        key: "new-item-1",
        code: "NEW-001", 
        name: "Nuevo Insumo", 
        unit: "M2", 
        category: "MATERIAL", 
        unitPrice: "15000" 
      })],
      activities: [],
      skippedRows: 0,
      warnings: [],
    };

    const result = await executeImport(tenantId, plan, false);

    expect(result.createdItems).toBe(1);
    expect(result.updatedItems).toBe(0);
    expect(result.priceChanges).toHaveLength(0);

    // Verify created
    const item = await db.orm.public.ApuItem.where({ tenantId, code: "NEW-001" }).first();
    expect(item).toBeTruthy();
    expect(String(item?.unitPrice)).toBe("15000");
  });

  test("sin updatePrices: otros campos SÍ se actualizan (nombre, unidad, categoría)", async () => {
    const plan: ExecutionPlan = {
      items: [makeItem({ 
        code: "CEM-001", 
        name: "Cemento Actualizado", 
        unit: "KG", 
        category: "EQUIPO", 
        unitPrice: "40000" 
      })],
      activities: [],
      skippedRows: 0,
      warnings: [],
    };

    const result = await executeImport(tenantId, plan, false);

    expect(result.updatedItems).toBe(1);
    expect(result.priceChanges).toHaveLength(1);
    expect(result.priceChanges[0].currentPrice).toBe("35000");
    expect(result.priceChanges[0].newPrice).toBe("40000");
    
    // Verify other fields updated but price not
    const item = await tenantDb.apu.getItem(result.priceChanges[0].itemId);
    expect(item?.name).toBe("Cemento Actualizado");
    expect(item?.unit).toBe("KG");
    expect(item?.category).toBe("EQUIPO");
    expect(item?.unitPrice).toBe("35000");
  });
});
