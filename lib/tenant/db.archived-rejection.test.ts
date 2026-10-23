import { describe, test, beforeAll, afterAll, expect } from "vitest";
import { db } from "@/prisma/db";
import { createTenantDb } from "@/lib/tenant/db";

const TEST_URL = process.env.TEST_DATABASE_URL;
const enabled = Boolean(TEST_URL);

function normalize(url: string | undefined): string {
  return (url ?? "").replace(/\?.*$/, "");
}

describe.skipIf(!enabled)("addComposition rejects archived items/activities", () => {
  let tenantDb: ReturnType<typeof createTenantDb>;
  let tenantId: string;

  beforeAll(async () => {
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) {
      throw new Error("DATABASE_URL mismatch");
    }
    const t = await db.orm.public.Tenant.create({
      name: "Archive Rejection Test",
      slug: `archive-rej-${Date.now().toString(36)}`,
      vertical: "construction",
    });
    tenantId = t.id;
    tenantDb = createTenantDb(tenantId);
  });

  test("addComposition rechaza actividad archivada", async () => {
    const item = await tenantDb.apu.createItem({
      name: "Item for Archived Activity",
      unit: "M2",
      category: "MATERIAL",
      unitPrice: "100.00",
    });
    const act = await tenantDb.apu.createActivity({
      name: "Activity to Archive",
      unit: "M2",
      code: "ACT-ARCHIVE",
      compositions: [],
    });
    if (!act) throw new Error("Failed to create activity");
    
    await tenantDb.apu.archiveActivity(act.id);
    
    await expect(
      tenantDb.apu.addComposition(act.id, {
        itemId: item.id,
        consumption: "1.0",
        wastePercent: "0",
      })
    ).rejects.toThrow("APU_INVALID");
  });

  test("addComposition rechaza insumo archivado", async () => {
    const item = await tenantDb.apu.createItem({
      name: "Item to Archive",
      unit: "M2",
      category: "MATERIAL",
      unitPrice: "100.00",
    })
    const act = await tenantDb.apu.createActivity({
      name: "Active Activity",
      unit: "M2",
      code: "ACT-ACTIVE",
      compositions: [],
    });
    if (!act) throw new Error("Failed to create activity");
    
    await tenantDb.apu.archiveItem(item.id);
    
    await expect(
      tenantDb.apu.addComposition(act.id, {
        itemId: item.id,
        consumption: "1.0",
        wastePercent: "0",
      })
    ).rejects.toThrow("APU_INVALID");
  });

  test("addComposition funciona con ambos activos", async () => {
    const item = await tenantDb.apu.createItem({
      name: "Active Item",
      unit: "M2",
      category: "MATERIAL",
      unitPrice: "100.00",
    });
    const act = await tenantDb.apu.createActivity({
      name: "Active Activity 2",
      unit: "M2",
      code: "ACT-ACTIVE-2",
      compositions: [],
    });
    if (!act) throw new Error("Failed to create activity");
    
    const result = await tenantDb.apu.addComposition(act.id, {
      itemId: item.id,
      consumption: "1.0",
      wastePercent: "0",
    });
    
    expect(result).toHaveProperty("id");
  });
});
