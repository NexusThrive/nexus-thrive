import { beforeEach, describe, expect, test } from "vitest";
import { z } from "zod";
import { defineOperation } from "@/lib/operations/types";
import { handleApi, type ApiDeps, type ApiLogEntry } from "./handler";
import { resetRateLimits } from "./rate-limit";
import type { AuthenticatedKey, AuthResult } from "./keys";

const OPS = [
  defineOperation({
    id: "customers.search",
    rest: { method: "GET", path: "/customers" },
    title: "Buscar",
    description: "Busca clientes por texto.",
    module: "crm",
    permission: null,
    risk: "read",
    input: z.object({ q: z.string().min(2), limit: z.number().int().min(1).max(25).default(10) }),
    output: z.object({ echo: z.string(), limit: z.number() }),
    handler: async (ctx, input) => ({ echo: `${ctx.tenantId}:${input.q}`, limit: input.limit }),
  }),
  defineOperation({
    id: "finance.get_summary",
    rest: { method: "GET", path: "/finance/summary" },
    title: "Resumen",
    description: "Resumen de finanzas del periodo.",
    module: "finance",
    permission: "money.handle",
    risk: "read",
    input: z.object({ days: z.union([z.literal(1), z.literal(7), z.literal(30)]).default(7) }),
    output: z.object({ days: z.number() }),
    handler: async (_ctx, input) => ({ days: input.days }),
  }),
  defineOperation({
    id: "products.get",
    rest: { method: "GET", path: "/products/{productId}" },
    title: "Producto",
    description: "Un producto por id del catálogo.",
    module: null,
    permission: null,
    risk: "read",
    input: z.object({ productId: z.string() }),
    output: z.object({ productId: z.string() }),
    handler: async (_ctx, input) => ({ productId: input.productId }),
  }),
];

const KEY: AuthenticatedKey = { id: "k1", tenantId: "t1", name: "n8n", environment: "live", scopes: ["read"], ipAllowlist: [], createdByRole: "OWNER" };
const logs: ApiLogEntry[] = [];
let auth: AuthResult;
let tenant: { active: boolean; modules: string[] } | null;
let quota = { allowed: true, used: 10, limit: 100, resetSeconds: 3600 };
const audited: string[] = [];
const deps: ApiDeps = {
  operations: OPS,
  authenticate: async () => auth,
  loadTenant: async () => tenant,
  log: (e) => void logs.push(e),
  usage: async () => quota,
  audit: (_ctx, op) => void audited.push(op.id),
};
const call = (path: string, init: RequestInit & { ip?: string } = {}) =>
  handleApi(new Request(`http://localhost/api/v1${path}`, { ...init, headers: { authorization: "Bearer nx_live_x", ...(init.ip ? { "x-forwarded-for": init.ip } : {}), ...(init.headers as Record<string, string>) } }), deps);
const body = async (r: Response) => (await r.json()) as Record<string, unknown>;

beforeEach(() => {
  resetRateLimits();
  logs.length = 0;
  audited.length = 0;
  quota = { allowed: true, used: 10, limit: 100, resetSeconds: 3600 };
  auth = { ok: true, key: KEY };
  tenant = { active: true, modules: ["crm", "finance"] };
});

describe("API /api/v1 (núcleo)", () => {
  test("éxito: { data }, id de petición y cabeceras de límite; la query se convierte al tipo del esquema", async () => {
    const res = await call("/customers?q=ma&limit=5");
    expect(res.status).toBe(200);
    expect(await body(res)).toEqual({ data: { echo: "t1:ma", limit: 5 } });
    expect(res.headers.get("x-request-id")).toMatch(/^req_/);
    expect(res.headers.get("ratelimit-limit")).toBe("120");
    expect(res.headers.get("ratelimit-remaining")).toBe("119");
    expect(logs[0]).toMatchObject({ tenantId: "t1", apiKeyId: "k1", operationId: "customers.search", status: 200 });
  });

  test("un valor literal numérico (1|7|30) también se convierte", async () => {
    expect((await body(await call("/finance/summary?days=30"))).data).toEqual({ days: 30 });
  });

  test("parámetros de ruta", async () => {
    expect((await body(await call("/products/abc-1"))).data).toEqual({ productId: "abc-1" });
  });

  test("sin llave o con llave mala → 401 problem+json con WWW-Authenticate", async () => {
    auth = { ok: false, reason: "missing" };
    const res = await call("/customers?q=ma");
    expect(res.status).toBe(401);
    expect(res.headers.get("content-type")).toContain("application/problem+json");
    expect(res.headers.get("www-authenticate")).toContain("Bearer");
    expect(await body(res)).toMatchObject({ code: "unauthorized", status: 401, type: "https://nexusthrive.co/errors/unauthorized" });
    auth = { ok: false, reason: "revoked" };
    expect(await body(await call("/customers?q=ma"))).toMatchObject({ code: "key_revoked" });
    auth = { ok: false, reason: "expired" };
    expect(await body(await call("/customers?q=ma"))).toMatchObject({ code: "key_expired" });
  });

  test("alcances: la llave no incluye la operación → 403 scope_denied", async () => {
    auth = { ok: true, key: { ...KEY, scopes: ["customers.*"] } };
    expect(await body(await call("/finance/summary"))).toMatchObject({ code: "scope_denied", status: 403 });
    expect((await call("/customers?q=ma")).status).toBe(200);
  });

  test("el rol de la llave es el de quien la creó: sin dinero aunque el alcance sea `*`", async () => {
    auth = { ok: true, key: { ...KEY, scopes: ["*"], createdByRole: "ADVISOR" } };
    expect(await body(await call("/finance/summary"))).toMatchObject({ code: "forbidden", status: 403 });
  });

  test("módulo inactivo → 403 module_inactive", async () => {
    tenant = { active: true, modules: ["crm"] };
    expect(await body(await call("/finance/summary"))).toMatchObject({ code: "module_inactive" });
  });

  test("negocio inactivo o inexistente → 403 tenant_inactive", async () => {
    tenant = { active: false, modules: [] };
    expect(await body(await call("/customers?q=ma"))).toMatchObject({ code: "tenant_inactive" });
    tenant = null;
    expect((await call("/customers?q=ma")).status).toBe(403);
  });

  test("lista de IP permitidas", async () => {
    auth = { ok: true, key: { ...KEY, ipAllowlist: ["203.0.113.7"] } };
    expect((await call("/customers?q=ma", { ip: "198.51.100.1" })).status).toBe(403);
    expect((await call("/customers?q=ma", { ip: "203.0.113.7, 10.0.0.1" })).status).toBe(200);
  });

  test("entrada inválida → 422 con `errors` por campo", async () => {
    const res = await call("/customers?q=a&limit=99");
    expect(res.status).toBe(422);
    const json = await body(res);
    expect(json.code).toBe("invalid_input");
    expect((json.errors as { path: string }[]).map((e) => e.path).sort()).toEqual(["limit", "q"]);
  });

  test("ruta inexistente → 404; método equivocado → 405 con Allow", async () => {
    expect((await call("/nada")).status).toBe(404);
    const res = await call("/customers", { method: "POST", body: "{}" });
    expect(res.status).toBe(405);
    expect(res.headers.get("allow")).toBe("GET");
  });

  test("límite de peticiones → 429 con Retry-After", async () => {
    let last: Response | null = null;
    for (let i = 0; i < 121; i++) last = await call("/customers?q=ma");
    expect(last!.status).toBe(429);
    expect(last!.headers.get("retry-after")).toBeTruthy();
    expect(await body(last!)).toMatchObject({ code: "rate_limited" });
  });

  test("/me: qué es la llave y qué puede hacer", async () => {
    const data = (await body(await call("/me"))).data as { name: string; operations: { id: string; path: string }[] };
    expect(data.name).toBe("n8n");
    expect(data.operations.map((o) => o.id)).toContain("customers.search");
    expect(data.operations.find((o) => o.id === "customers.search")?.path).toBe("/api/v1/customers");
  });

  test("/openapi.json es público (no pide llave)", async () => {
    auth = { ok: false, reason: "missing" };
    const res = await call("/openapi.json");
    expect(res.status).toBe(200);
    expect(((await body(res)) as { openapi: string }).openapi).toBe("3.1.0");
  });

  test("un fallo al registrar la llamada no rompe la respuesta", async () => {
    const res = await handleApi(new Request("http://localhost/api/v1/customers?q=ma", { headers: { authorization: "Bearer x" } }), {
      ...deps,
      log: () => {
        throw new Error("base caída");
      },
    });
    expect(res.status).toBe(200);
  });

  test("cupo mensual: informa lo que queda y, agotado, responde 429 con Retry-After", async () => {
    const ok = await call("/customers?q=ma");
    expect(ok.headers.get("x-quota-limit")).toBe("100");
    expect(ok.headers.get("x-quota-remaining")).toBe("90");
    quota = { allowed: false, used: 100, limit: 100, resetSeconds: 7200 };
    const res = await call("/customers?q=ma");
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("7200");
    expect(await body(res)).toMatchObject({ code: "quota_exceeded" });
    expect(logs.at(-1)).toMatchObject({ status: 429 });
  });

  test("las lecturas no se auditan; las demás sí (ver api.integration para el origen)", async () => {
    await call("/customers?q=ma");
    expect(audited).toEqual([]);
  });
});
