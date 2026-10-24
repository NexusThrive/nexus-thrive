import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { db } from "@/prisma/db";
import { createAdminDb } from "@/lib/admin/db";
import { authenticateApiKey, createApiKey } from "@/lib/api/keys";
import type { ApiDeps } from "@/lib/api/handler";
import { resetRateLimits } from "@/lib/api/rate-limit";
import { recordIncomeNow } from "@/lib/business/money-service";
import { OPERATIONS } from "@/lib/operations/registry";
import { deleteTenantCompletely } from "@/lib/tenant/deletion";
import { tenantWithModules } from "@/lib/tenant/membership";
import { handleMcp } from "./server";

/** «¿Cómo nos fue hoy?» por MCP con datos reales y dos negocios. */
const TEST_URL = process.env.TEST_DATABASE_URL;
const normalize = (url: string | undefined) => (url ?? "").replace(/\?.*$/, "");

describe.skipIf(!TEST_URL)("MCP (integración)", () => {
  const suffix = Date.now().toString(36);
  let a = "";
  let b = "";
  const deps: ApiDeps = {
    operations: OPERATIONS,
    authenticate: (h) => authenticateApiKey(h),
    loadTenant: async (id) => {
      const t = await tenantWithModules(id);
      return t ? { active: t.active, modules: t.modules.filter((m) => m.active).map((m) => String(m.moduleName)) } : null;
    },
    log: () => undefined,
  };
  const rpc = async (secret: string, method: string, params?: unknown) =>
    (await (await handleMcp(new Request("http://localhost/api/mcp", { method: "POST", headers: { authorization: `Bearer ${secret}` }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) }), deps)).json()) as { result: { tools: { name: string }[]; isError: boolean; structuredContent: unknown } };

  beforeAll(async () => {
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) throw new Error("DATABASE_URL debe ser igual a TEST_DATABASE_URL.");
    const make = (name: string, slug: string) => createAdminDb().createTenant({ name, slug, vertical: "gym", modules: ["crm", "inventory", "finance"], tenantType: "COMPANY", ownerEmail: `${slug}@ejemplo.com` });
    a = String((await make("Gym A", `mcp-a-${suffix}`)).id);
    b = String((await make("Gym B", `mcp-b-${suffix}`)).id);
    await recordIncomeNow(a, { amount: 80000, method: "CASH", description: "Mensualidad" }, "u1");
    await recordIncomeNow(b, { amount: 5000, method: "CASH", description: "Entrada" }, "u2");
  });
  afterAll(async () => {
    for (const id of [a, b]) if (id) await deleteTenantCompletely(id);
    await db.close();
  });

  test("lista solo lecturas y responde con las cifras de SU negocio", async () => {
    resetRateLimits();
    const ka = await createApiKey(a, { name: "agente A", environment: "live", scopes: ["read"], createdById: null, createdByRole: "OWNER" });
    const kb = await createApiKey(b, { name: "agente B", environment: "live", scopes: ["read"], createdById: null, createdByRole: "OWNER" });
    const listed = (await rpc(ka.secret, "tools/list")).result.tools.map((t: { name: string }) => t.name);
    expect(listed).toEqual(expect.arrayContaining(["finance_get_summary", "customers_search", "business_get_summary"]));

    const summary = async (secret: string) => (await rpc(secret, "tools/call", { name: "finance_get_summary", arguments: { days: 1 } })).result;
    const ra = await summary(ka.secret);
    const rb = await summary(kb.secret);
    expect(ra.isError).toBe(false);
    expect(JSON.stringify(ra.structuredContent)).toContain("80000");
    expect(JSON.stringify(ra.structuredContent)).not.toContain("5000.");
    expect(JSON.stringify(rb.structuredContent)).toContain("5000");
    expect(JSON.stringify(rb.structuredContent)).not.toContain("80000");
  });

  test("con rol de asesor la herramienta de dinero ni aparece", async () => {
    resetRateLimits();
    const k = await createApiKey(a, { name: "asesor", environment: "live", scopes: ["*"], createdById: null, createdByRole: "ADVISOR" });
    const names = (await rpc(k.secret, "tools/list")).result.tools.map((t: { name: string }) => t.name);
    expect(names).not.toContain("finance_get_summary");
    expect(names).toContain("customers_search");
  });
});
