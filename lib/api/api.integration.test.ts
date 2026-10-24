import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { db } from "@/prisma/db";
import { createAdminDb } from "@/lib/admin/db";
import { deleteTenantCompletely } from "@/lib/tenant/deletion";
import { tenantWithModules } from "@/lib/tenant/membership";
import { OPERATIONS } from "@/lib/operations/registry";
import { handleApi, type ApiDeps, type ApiLogEntry } from "./handler";
import { authenticateApiKey, createApiKey, listApiKeys, revokeApiKey } from "./keys";
import { resetRateLimits } from "./rate-limit";

/**
 * La API completa contra una base real y con DOS negocios: la llave fija el
 * negocio, el rol de quien la creó manda, los alcances recortan, y una llave
 * revocada o vencida deja de servir al instante.
 */
const TEST_URL = process.env.TEST_DATABASE_URL;
const normalize = (url: string | undefined) => (url ?? "").replace(/\?.*$/, "");

describe.skipIf(!TEST_URL)("API /api/v1 (integración)", () => {
  const suffix = Date.now().toString(36);
  let a = "";
  let b = "";
  const logs: ApiLogEntry[] = [];

  const deps: ApiDeps = {
    operations: OPERATIONS,
    authenticate: (header) => authenticateApiKey(header),
    loadTenant: async (tenantId) => {
      const t = await tenantWithModules(tenantId);
      return t ? { active: t.active, modules: t.modules.filter((m) => m.active).map((m) => String(m.moduleName)) } : null;
    },
    log: (e) => void logs.push(e),
  };
  const call = (secret: string, path: string) => handleApi(new Request(`http://localhost/api/v1${path}`, { headers: { authorization: `Bearer ${secret}` } }), deps);

  beforeAll(async () => {
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) throw new Error("DATABASE_URL debe ser igual a TEST_DATABASE_URL.");
    const make = (name: string, slug: string) =>
      createAdminDb().createTenant({ name, slug, vertical: "gym", modules: ["crm", "inventory", "finance"], tenantType: "COMPANY", ownerEmail: `${slug}@ejemplo.com` });
    a = String((await make("Gimnasio A", `api-a-${suffix}`)).id);
    b = String((await make("Gimnasio B", `api-b-${suffix}`)).id);
    await db.orm.public.Customer.create({ tenantId: a, name: "María Fernanda Ríos" });
    await db.orm.public.Customer.create({ tenantId: b, name: "María Torres" });
  });
  afterAll(async () => {
    for (const id of [a, b]) if (id) await deleteTenantCompletely(id);
    await db.close();
  });

  test("la llave fija el negocio: cada una solo ve lo suyo", async () => {
    resetRateLimits();
    const keyA = await createApiKey(a, { name: "n8n A", environment: "live", scopes: ["read"], createdById: "u1", createdByRole: "OWNER" });
    const keyB = await createApiKey(b, { name: "n8n B", environment: "live", scopes: ["read"], createdById: "u2", createdByRole: "OWNER" });
    const resA = await call(keyA.secret, "/customers?q=mar");
    expect(resA.status).toBe(200);
    expect(((await resA.json()) as { data: { items: { name: string }[] } }).data.items.map((c) => c.name)).toEqual(["María Fernanda Ríos"]);
    const resB = await call(keyB.secret, "/customers?q=mar");
    expect(((await resB.json()) as { data: { items: { name: string }[] } }).data.items.map((c) => c.name)).toEqual(["María Torres"]);
    // El negocio no se elige por la ruta ni por la query: no hay forma de pedir el del otro.
    const spoof = await call(keyA.secret, `/customers?q=mar&tenantId=${b}`);
    expect(((await spoof.json()) as { data: { items: { name: string }[] } }).data.items.map((c) => c.name)).toEqual(["María Fernanda Ríos"]);
  });

  test("solo se guarda el hash: la llave completa no está en la base", async () => {
    const { secret, row } = await createApiKey(a, { name: "hash", environment: "test", scopes: ["read"], createdById: null, createdByRole: "OWNER" });
    expect(secret).toMatch(/^nx_test_[0-9a-f]{32}$/);
    const stored = await db.orm.public.ApiKey.where({ id: row.id }).first();
    expect(JSON.stringify(stored)).not.toContain(secret);
    expect(stored?.keyPrefix).toBe(secret.slice(0, 12));
    expect(row).not.toHaveProperty("keyHash");
  });

  test("alcances y rol: `customers.*` no llega a finanzas; un asesor no ve dinero ni con `*`", async () => {
    resetRateLimits();
    const scoped = await createApiKey(a, { name: "solo clientes", environment: "live", scopes: ["customers.*"], createdById: null, createdByRole: "OWNER" });
    expect((await call(scoped.secret, "/customers?q=mar")).status).toBe(200);
    expect(await (await call(scoped.secret, "/finance/summary")).json()).toMatchObject({ code: "scope_denied" });
    const advisor = await createApiKey(a, { name: "asesor", environment: "live", scopes: ["*"], createdById: null, createdByRole: "ADVISOR" });
    expect(await (await call(advisor.secret, "/finance/summary")).json()).toMatchObject({ code: "forbidden" });
    const owner = await createApiKey(a, { name: "dueño", environment: "live", scopes: ["*"], createdById: null, createdByRole: "OWNER" });
    expect((await call(owner.secret, "/finance/summary?days=30")).status).toBe(200);
  });

  test("revocar corta al instante; vencida deja de servir; la mala o ausente da 401", async () => {
    resetRateLimits();
    const k = await createApiKey(a, { name: "temporal", environment: "live", scopes: ["read"], createdById: null, createdByRole: "OWNER" });
    expect((await call(k.secret, "/business")).status).toBe(200);
    expect(await revokeApiKey(a, k.row.id)).toBe(true);
    expect(await (await call(k.secret, "/business")).json()).toMatchObject({ code: "key_revoked", status: 401 });

    const expired = await createApiKey(a, { name: "vencida", environment: "live", scopes: ["read"], createdById: null, createdByRole: "OWNER", expiresAt: new Date(Date.now() - 1000) });
    expect(await (await call(expired.secret, "/business")).json()).toMatchObject({ code: "key_expired" });
    expect(await (await call("nx_live_" + "0".repeat(32), "/business")).json()).toMatchObject({ code: "unauthorized" });
    expect((await handleApi(new Request("http://localhost/api/v1/business"), deps)).status).toBe(401);
  });

  test("una llave de otro negocio no se puede revocar desde este", async () => {
    const k = await createApiKey(b, { name: "de B", environment: "live", scopes: ["read"], createdById: null, createdByRole: "OWNER" });
    expect(await revokeApiKey(a, k.row.id)).toBe(false);
    expect((await listApiKeys(a)).some((x) => x.id === k.row.id)).toBe(false);
    expect((await listApiKeys(b)).some((x) => x.id === k.row.id)).toBe(true);
  });

  test("se registra «último uso» y cada llamada deja su registro (sin cuerpos ni secretos)", async () => {
    resetRateLimits();
    logs.length = 0;
    const k = await createApiKey(a, { name: "uso", environment: "live", scopes: ["read"], createdById: null, createdByRole: "OWNER" });
    await call(k.secret, "/customers?q=mar");
    expect(logs[0]).toMatchObject({ tenantId: a, apiKeyId: k.row.id, operationId: "customers.search", status: 200, method: "GET", path: "/customers" });
    expect(JSON.stringify(logs[0])).not.toContain(k.secret);
    const refreshed = (await listApiKeys(a)).find((x) => x.id === k.row.id);
    expect(refreshed?.lastUsedAt).not.toBeNull();
  });
});
