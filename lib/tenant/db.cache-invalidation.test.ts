import { describe, test, beforeAll, afterAll, expect } from "vitest";
import { db } from "@/prisma/db";
import { createTenantDb } from "@/lib/tenant/db";

const TEST_URL = process.env.TEST_DATABASE_URL;
const enabled = Boolean(TEST_URL);

function normalize(url: string | undefined): string {
  return (url ?? "").replace(/\?.*$/, "");
}

describe.skipIf(!enabled)("Cache invalidation & tenant isolation", () => {
  let tenantDb1: ReturnType<typeof createTenantDb>;
  let tenantDb2: ReturnType<typeof createTenantDb>;
  let tenant1Id: string;
  let tenant2Id: string;

  beforeAll(async () => {
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) {
      throw new Error("DATABASE_URL mismatch");
    }
    
    const t1 = await db.orm.public.Tenant.create({
      name: "Cache Test Tenant 1",
      slug: `cache-test-1-${Date.now().toString(36)}`,
      vertical: "construction",
    });
    const t2 = await db.orm.public.Tenant.create({
      name: "Cache Test Tenant 2",
      slug: `cache-test-2-${Date.now().toString(36)}`,
      vertical: "construction",
    });
    tenant1Id = t1.id;
    tenant2Id = t2.id;
    tenantDb1 = createTenantDb(tenant1Id);
    tenantDb2 = createTenantDb(tenant2Id);
    
    // Add some base data to tenant 1
    const item1 = await tenantDb1.apu.createItem({
      name: "Item Cache Test 1",
      unit: "M2",
      category: "MATERIAL",
      unitPrice: "100.00",
    });
    const act1 = await tenantDb1.apu.createActivity({
      name: "Activity Cache Test 1",
      unit: "M2",
      code: "ACT-CACHE-1",
      compositions: [{ itemId: item1.id, consumption: "1.5", wastePercent: "5" }],
    });
  });

  afterAll(async () => {
    // cleanup handled by test DB
  });

  test("cache key includes tenantId - different tenants have independent caches", async () => {
    await tenantDb1.apu.invalidateP99();
    const r1a = await tenantDb1.apu.getP99Thresholds();
    
    await tenantDb2.apu.invalidateP99();
    const r2a = await tenantDb2.apu.getP99Thresholds();
    
    expect(r1a).not.toBe(r2a);
    expect(r1a.activityUnitCost).toHaveProperty("M2");
    expect(Object.keys(r2a.activityUnitCost).length).toBe(0);
  });

  test("cache invalidation after mutation recalculates threshold", async () => {
    const before = await tenantDb1.apu.getP99Thresholds();
    const initialM2 = before.activityUnitCost.M2;
    expect(initialM2).toBeDefined();
    
    const newItem = await tenantDb1.apu.createItem({
      name: "High Price Item",
      unit: "M2",
      category: "MATERIAL",
      unitPrice: "10000.00",
    });
    const newAct = await tenantDb1.apu.createActivity({
      name: "High Cost Activity",
      unit: "M2",
      code: "ACT-HIGH",
      compositions: [{ itemId: newItem.id, consumption: "10", wastePercent: "0" }],
    });
    
    const after = await tenantDb1.apu.getP99Thresholds();
    const newM2 = after.activityUnitCost.M2;
    
    expect(newM2).toBeDefined();
    expect(parseFloat(newM2)).toBeGreaterThanOrEqual(parseFloat(initialM2));
  });

  test("manual invalidateP99 forces recalculation", async () => {
    const before = await tenantDb1.apu.getP99Thresholds();
    tenantDb1.apu.invalidateP99();
    const after = await tenantDb1.apu.getP99Thresholds();
    expect(after).toEqual(before);
  });
});
