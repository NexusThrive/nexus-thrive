import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { db } from "@/prisma/db";
import { createAdminDb } from "@/lib/admin/db";
import { auditOperation } from "@/lib/operations/audit";
import { deleteTenantCompletely } from "@/lib/tenant/deletion";
import { consumeMeter, setMeterLimit, usageSnapshot } from "./meters";

const TEST_URL = process.env.TEST_DATABASE_URL;
const normalize = (url: string | undefined) => (url ?? "").replace(/\?.*$/, "");

describe.skipIf(!TEST_URL)("medidores y origen en la bitácora (integración)", () => {
  const suffix = Date.now().toString(36);
  let a = "";
  let b = "";
  const NOW = Date.UTC(2026, 9, 24, 15, 0);

  beforeAll(async () => {
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) throw new Error("DATABASE_URL debe ser igual a TEST_DATABASE_URL.");
    const make = (name: string, slug: string) => createAdminDb().createTenant({ name, slug, vertical: "gym", modules: ["crm"], tenantType: "COMPANY", ownerEmail: `${slug}@ejemplo.com` });
    a = String((await make("Gym A", `us-a-${suffix}`)).id);
    b = String((await make("Gym B", `us-b-${suffix}`)).id);
  });
  afterAll(async () => {
    await db.orm.public.AuditLog.where({ targetTenantId: a }).deleteAll();
    for (const id of [a, b]) if (id) await deleteTenantCompletely(id);
    await db.close();
  });

  test("cuenta por negocio y medidor; no se mezclan", async () => {
    await consumeMeter(a, "api.requests", 1, NOW);
    await consumeMeter(a, "api.requests", 1, NOW);
    await consumeMeter(b, "api.requests", 1, NOW);
    await consumeMeter(a, "messages.sent", 5, NOW);
    const sa = await usageSnapshot(a, NOW);
    expect(sa.find((m) => m.meter === "api.requests")?.used).toBe(2);
    expect(sa.find((m) => m.meter === "messages.sent")?.used).toBe(5);
    expect((await usageSnapshot(b, NOW)).find((m) => m.meter === "api.requests")?.used).toBe(1);
  });

  test("al llegar al cupo deja de sumar y avisa; subir el cupo lo reabre", async () => {
    await setMeterLimit(a, "automations.runs", 3, NOW);
    const results = [];
    for (let i = 0; i < 5; i++) results.push(await consumeMeter(a, "automations.runs", 1, NOW));
    expect(results.map((r) => r.allowed)).toEqual([true, true, true, false, false]);
    expect(results[4]).toMatchObject({ used: 3, limit: 3 });
    await setMeterLimit(a, "automations.runs", 10, NOW);
    expect((await consumeMeter(a, "automations.runs", 1, NOW)).allowed).toBe(true);
  });

  test("concurrencia: 30 peticiones a la vez cuentan exactamente 30, y con cupo 20 pasan exactamente 20", async () => {
    await Promise.all(Array.from({ length: 30 }, () => consumeMeter(b, "events.delivered", 1, NOW)));
    expect((await usageSnapshot(b, NOW)).find((m) => m.meter === "events.delivered")?.used).toBe(30);
    await setMeterLimit(b, "ai.tokens", 20, NOW);
    const all = await Promise.all(Array.from({ length: 30 }, () => consumeMeter(b, "ai.tokens", 1, NOW)));
    expect(all.filter((r) => r.allowed)).toHaveLength(20);
  });

  test("un mes nuevo empieza en cero", async () => {
    const nov = Date.UTC(2026, 10, 3, 15, 0);
    expect((await usageSnapshot(a, nov)).find((m) => m.meter === "api.requests")?.used).toBe(0);
  });

  test("la bitácora guarda quién fue: llave de API, petición y solo nombres de campos", async () => {
    await auditOperation({ tenantId: a, role: "OWNER", activeModules: [], actor: { type: "API_KEY", id: "key-123" }, requestId: "req_abc" }, { id: "customers.create", risk: "write" }, { name: "María", phone: "300" }, "Gym A");
    const row = await db.orm.public.AuditLog.where({ targetTenantId: a, action: "BIZ_API_OPERATION" }).first();
    expect(row).toMatchObject({ actorType: "API_KEY", apiKeyId: "key-123", requestId: "req_abc", actorId: "api_key:key-123" });
    expect(row?.metadata).toMatchObject({ operationId: "customers.create", fields: ["name", "phone"] });
    expect(JSON.stringify(row?.metadata)).not.toContain("María");
  });
});
