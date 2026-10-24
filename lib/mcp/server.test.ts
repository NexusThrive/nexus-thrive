import { beforeEach, describe, expect, test } from "vitest";
import { z } from "zod";
import { defineOperation } from "@/lib/operations/types";
import type { ApiDeps, ApiLogEntry } from "@/lib/api/handler";
import type { AuthenticatedKey, AuthResult } from "@/lib/api/keys";
import { resetRateLimits } from "@/lib/api/rate-limit";
import { handleMcp, toolName } from "./server";

const op = (id: string, risk: "read" | "write", extra: Partial<Parameters<typeof defineOperation>[0]> = {}) =>
  defineOperation({
    id,
    title: id,
    description: `Operación ${id}`,
    module: null,
    permission: null,
    risk,
    input: z.object({ q: z.string().min(2).optional() }),
    output: z.object({ echo: z.string() }),
    handler: async (ctx, input) => ({ echo: `${ctx.tenantId}:${input.q ?? ""}` }),
    ...extra,
  });
const OPS = [
  op("customers.search", "read"),
  op("finance.get_summary", "read", { module: "finance", permission: "money.handle" }),
  op("customers.create", "write"),
];

const KEY: AuthenticatedKey = { id: "k1", tenantId: "t1", name: "agente", environment: "live", scopes: ["*"], ipAllowlist: [], createdByRole: "OWNER" };
let auth: AuthResult;
let modules: string[];
const logs: ApiLogEntry[] = [];
const deps: ApiDeps = { operations: OPS, authenticate: async () => auth, loadTenant: async () => ({ active: true, modules }), log: (e) => void logs.push(e) };

const rpc = (body: unknown, init: RequestInit = {}) =>
  handleMcp(new Request("http://localhost/api/mcp", { method: "POST", headers: { authorization: "Bearer nx_live_x" }, body: typeof body === "string" ? body : JSON.stringify(body), ...init }), deps);
const call = async (method: string, params?: unknown, id: number | string = 1) => (await (await rpc({ jsonrpc: "2.0", id, method, params })).json()) as Record<string, any>;

beforeEach(() => {
  resetRateLimits();
  logs.length = 0;
  auth = { ok: true, key: KEY };
  modules = ["finance"];
});

describe("servidor MCP", () => {
  test("initialize negocia la versión y declara solo herramientas", async () => {
    const res = await call("initialize", { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "x", version: "1" } });
    expect(res.result.protocolVersion).toBe("2025-03-26");
    expect(res.result.capabilities).toEqual({ tools: { listChanged: false } });
    expect((await call("initialize", { protocolVersion: "1999-01-01" })).result.protocolVersion).toBe("2025-06-18");
  });

  test("tools/list es solo lectura y respeta módulos, permiso y alcances", async () => {
    const names = async () => (await call("tools/list")).result.tools.map((t: { name: string }) => t.name);
    expect(await names()).toEqual(["customers_search", "finance_get_summary"]); // jamás la que escribe
    modules = []; // módulo finanzas apagado
    expect(await names()).toEqual(["customers_search"]);
    modules = ["finance"];
    auth = { ok: true, key: { ...KEY, createdByRole: "ADVISOR" } }; // asesor: sin dinero
    expect(await names()).toEqual(["customers_search"]);
    auth = { ok: true, key: { ...KEY, scopes: ["finance.*"] } };
    expect(await names()).toEqual(["finance_get_summary"]);
  });

  test("cada herramienta trae esquema y se anuncia como solo lectura", async () => {
    const tool = (await call("tools/list")).result.tools[0];
    expect(tool.inputSchema.type).toBe("object");
    expect(tool.annotations).toMatchObject({ readOnlyHint: true, destructiveHint: false });
  });

  test("tools/call ejecuta la operación con el negocio de la llave y deja registro", async () => {
    const res = await call("tools/call", { name: "customers_search", arguments: { q: "ma" } });
    expect(res.result.isError).toBe(false);
    expect(res.result.structuredContent).toEqual({ data: { echo: "t1:ma" } });
    expect(JSON.parse(res.result.content[0].text)).toEqual({ data: { echo: "t1:ma" } });
    expect(logs[0]).toMatchObject({ tenantId: "t1", apiKeyId: "k1", operationId: "customers.search", path: "/mcp", status: 200 });
  });

  test("una herramienta de escritura o fuera de alcance responde como si no existiera", async () => {
    expect((await call("tools/call", { name: "customers_create", arguments: {} })).error.code).toBe(-32602);
    auth = { ok: true, key: { ...KEY, createdByRole: "ADVISOR" } };
    expect((await call("tools/call", { name: "finance_get_summary", arguments: {} })).error.code).toBe(-32602);
  });

  test("argumentos inválidos → isError con el motivo, no una falla del protocolo", async () => {
    const res = await call("tools/call", { name: "customers_search", arguments: { q: "a" } });
    expect(res.result.isError).toBe(true);
    expect(res.result.content[0].text).toContain("q");
  });

  test("llave inválida → 401 problem+json (igual que la API)", async () => {
    auth = { ok: false, reason: "unknown" };
    const res = await rpc({ jsonrpc: "2.0", id: 1, method: "tools/list" });
    expect(res.status).toBe(401);
    expect(res.headers.get("content-type")).toContain("problem+json");
  });

  test("ping, notificación (202 sin cuerpo), método desconocido, JSON roto, lote y GET", async () => {
    expect((await call("ping")).result).toEqual({});
    const note = await rpc({ jsonrpc: "2.0", method: "notifications/initialized" });
    expect(note.status).toBe(202);
    expect(await note.text()).toBe("");
    expect((await call("resources/list")).error.code).toBe(-32601);
    const broken = await rpc("{no");
    expect(broken.status).toBe(400);
    expect((await broken.json()).error.code).toBe(-32700);
    expect((await rpc([{ jsonrpc: "2.0", id: 1, method: "ping" }])).status).toBe(400);
    const get = await handleMcp(new Request("http://localhost/api/mcp"), deps);
    expect(get.status).toBe(405);
  });

  test("el nombre de herramienta es válido para clientes MCP", () => {
    expect(toolName("finance.get_summary")).toMatch(/^[a-zA-Z0-9_-]{1,64}$/);
  });
});
