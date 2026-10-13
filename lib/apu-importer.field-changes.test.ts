import { describe, test, beforeAll, expect } from "vitest";
import { db } from "@/prisma/db";
import { createTenantDb } from "@/lib/tenant-db";
import { analyzeFile, buildExecutionPlan, computeImportChangesFromPlan } from "@/lib/apu-importer";

const TEST_URL = process.env.TEST_DATABASE_URL;
const enabled = Boolean(TEST_URL);

function normalize(url: string | undefined): string {
  return (url ?? "").replace(/\?.*$/, "");
}

describe.skipIf(!enabled)("apu-importer: field changes in preview", () => {
  let tenantDb: ReturnType<typeof createTenantDb>;
  let tenantId: string;

  beforeAll(async () => {
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) {
      throw new Error("DATABASE_URL mismatch");
    }
    const t = await db.orm.public.Tenant.create({
      name: "Import Field Changes Test",
      slug: `import-field-${Date.now().toString(36)}`,
      vertical: "construction",
    });
    tenantId = t.id;
    tenantDb = createTenantDb(tenantId);
    
    await tenantDb.apu.createItem({
      name: "Cemento Original",
      unit: "BOL",
      category: "MATERIAL",
      unitPrice: "28000",
      code: "CEM-001",
    });
  });

  test("detecta cambio de nombre", async () => {
    const csv = `code,name,unit,category,unitPrice
CEM-001,Cemento Modificado,BOL,MATERIAL,28000`;
    
    const buffer = new TextEncoder().encode(csv).buffer;
    const preview = analyzeFile({ buffer, fileName: "test.csv", fileSize: buffer.byteLength });
    const plan = buildExecutionPlan({ mapping: preview.mapping, rows: preview.rows });
    
    console.log("Plan items (name change):", JSON.stringify(plan.items, null, 2));
    
    const existingItems = await tenantDb.apu.listItems({ limit: 100 });
    const { fieldChanges } = computeImportChangesFromPlan(existingItems.rows, plan);
    
    expect(fieldChanges).toHaveLength(1);
    expect(fieldChanges[0]).toMatchObject({
      code: "CEM-001",
      field: "name",
      currentValue: "Cemento Original",
      newValue: "Cemento Modificado",
    });
  });

  test("detecta cambio de unidad", async () => {
    const csv = `code,name,unit,category,unitPrice
CEM-001,Cemento Original,KG,MATERIAL,28000`;
    
    const buffer = new TextEncoder().encode(csv).buffer;
    const preview = analyzeFile({ buffer, fileName: "test.csv", fileSize: buffer.byteLength });
    const plan = buildExecutionPlan({ mapping: preview.mapping, rows: preview.rows });
    
    console.log("Plan items (unit change):", JSON.stringify(plan.items, null, 2));
    
    const existingItems = await tenantDb.apu.listItems({ limit: 100 });
    const { fieldChanges } = computeImportChangesFromPlan(existingItems.rows, plan);
    
    console.log("Field changes (unit):", JSON.stringify(fieldChanges, null, 2));
    
    expect(fieldChanges).toHaveLength(1);
    expect(fieldChanges[0]).toMatchObject({
      code: "CEM-001",
      field: "unit",
      currentValue: "BULTO",
      newValue: "KG",
    });
  });

  test("detecta cambio de categoría", async () => {
    const csv = `code,name,unit,category,unitPrice
CEM-001,Cemento Original,BOL,EQUIPO,28000`;
    
    const buffer = new TextEncoder().encode(csv).buffer;
    const preview = analyzeFile({ buffer, fileName: "test.csv", fileSize: buffer.byteLength });
    const plan = buildExecutionPlan({ mapping: preview.mapping, rows: preview.rows });
    
    console.log("Plan items (category change):", JSON.stringify(plan.items, null, 2));
    
    const existingItems = await tenantDb.apu.listItems({ limit: 100 });
    const { fieldChanges } = computeImportChangesFromPlan(existingItems.rows, plan);
    
    console.log("Field changes (category):", JSON.stringify(fieldChanges, null, 2));
    
    expect(fieldChanges).toHaveLength(1);
    expect(fieldChanges[0]).toMatchObject({
      code: "CEM-001",
      field: "category",
      currentValue: "MATERIAL",
      newValue: "EQUIPO",
    });
  });
});
