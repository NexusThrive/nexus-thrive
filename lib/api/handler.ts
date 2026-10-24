import { randomUUID } from "node:crypto";
import { z } from "zod";
import { runOperation } from "@/lib/operations/engine";
import { OperationError, type OperationContext, type OperationDefinition } from "@/lib/operations/types";
import type { AuthenticatedKey, AuthResult } from "./keys";
import { buildOpenApi } from "./openapi";
import { problem, type ProblemCode } from "./problem";
import { consume } from "./rate-limit";
import { scopeAllows } from "./scopes";

/**
 * Núcleo de `/api/v1`. Recibe una `Request` y devuelve una `Response`; todo lo
 * que toca la base (autenticar, cargar el negocio, registrar la llamada) entra
 * por `ApiDeps`, así se prueba sin servidor y la ruta de Next es solo un adaptador.
 *
 * Orden: ruta pública → llave → IP → límite → negocio → ruta del registro →
 * alcances → entrada → operación (módulo, permiso, validación) → respuesta.
 */
export type ApiLogEntry = {
  tenantId: string;
  apiKeyId: string | null;
  requestId: string;
  method: string;
  path: string;
  operationId: string | null;
  status: number;
  durationMs: number;
  ip: string | null;
};

export type ApiDeps = {
  operations: readonly OperationDefinition[];
  authenticate: (authorization: string | null) => Promise<AuthResult>;
  loadTenant: (tenantId: string) => Promise<{ active: boolean; modules: string[] } | null>;
  log: (entry: ApiLogEntry) => Promise<void> | void;
  /** Cupo mensual (medidor `api.requests`). Opcional: sin él no hay cupo. */
  usage?: (tenantId: string) => Promise<{ allowed: boolean; used: number; limit: number; resetSeconds: number }>;
  /** Deja en la bitácora quién ejecutó una operación que no es de lectura. */
  audit?: (ctx: OperationContext, op: OperationDefinition, input: unknown) => Promise<void> | void;
};

const BASE = "/api/v1";

type Match = { op: OperationDefinition; params: Record<string, string> };

function compile(path: string) {
  const names: string[] = [];
  const pattern = path.replace(/\{(\w+)\}/g, (_m, name: string) => {
    names.push(name);
    return "([^/]+)";
  });
  return { regex: new RegExp(`^${pattern}/?$`), names };
}

function matchRoute(ops: readonly OperationDefinition[], method: string, path: string): { match: Match | null; allow: string[] } {
  const allow = new Set<string>();
  for (const op of ops) {
    if (!op.rest) continue;
    const { regex, names } = compile(op.rest.path);
    const m = regex.exec(path);
    if (!m) continue;
    allow.add(op.rest.method);
    if (op.rest.method === method) {
      return { match: { op, params: Object.fromEntries(names.map((n, i) => [n, decodeURIComponent(m[i + 1])])) }, allow: [...allow] };
    }
  }
  return { match: null, allow: [...allow] };
}

type PropSchema = { type?: string | string[]; enum?: unknown[]; anyOf?: PropSchema[]; const?: unknown };
const numeric = (s: PropSchema): boolean =>
  s.type === "number" || s.type === "integer" || typeof s.const === "number" || (s.enum?.every((v) => typeof v === "number") ?? false) || (s.anyOf?.some(numeric) ?? false);
const boolish = (s: PropSchema) => s.type === "boolean";

/** Las query llegan como texto: se convierten según el tipo que declara el esquema de entrada. */
function coerceQuery(op: OperationDefinition, query: URLSearchParams): Record<string, unknown> {
  const props = ((z.toJSONSchema(op.input, { io: "input" }) as { properties?: Record<string, PropSchema> }).properties ?? {}) as Record<string, PropSchema>;
  const out: Record<string, unknown> = {};
  for (const [name, schema] of Object.entries(props)) {
    const raw = query.get(name);
    if (raw === null) continue;
    if (numeric(schema)) out[name] = raw.trim() === "" ? raw : Number(raw);
    else if (boolish(schema)) out[name] = raw === "true" || raw === "1";
    else out[name] = raw;
  }
  return out;
}

const STATUS_CODE: Record<number, ProblemCode> = { 404: "not_found" };

export type Guarded = {
  key: AuthenticatedKey;
  ctx: OperationContext;
  rateHeaders: Record<string, string>;
  /** Registra la llamada (sin romper la respuesta si el registro falla) y devuelve la respuesta. */
  record: (res: Response, operationId: string | null) => Promise<Response>;
};

/**
 * Lo común a la API REST y al MCP: llave → IP permitida → límite → negocio
 * activo → contexto (el rol de la llave es el de quien la creó, nunca más).
 */
export async function guardRequest(request: Request, deps: ApiDeps, meta: { requestId: string; started: number; method: string; path: string }): Promise<{ response: Response } | Guarded> {
  const { requestId, started, method, path } = meta;
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || null;
  const auth = await deps.authenticate(request.headers.get("authorization"));
  if (!auth.ok) {
    const code: ProblemCode = auth.reason === "revoked" ? "key_revoked" : auth.reason === "expired" ? "key_expired" : "unauthorized";
    const detail =
      auth.reason === "missing" ? "Falta la cabecera `Authorization: Bearer <llave>`." : auth.reason === "revoked" ? "Esta llave fue revocada." : auth.reason === "expired" ? "Esta llave venció." : "La llave no es válida.";
    return { response: problem(401, code, detail, requestId, { headers: { "www-authenticate": 'Bearer realm="nexus"' } }) };
  }
  const key = auth.key;
  const record = async (res: Response, operationId: string | null) => {
    try {
      await deps.log({ tenantId: key.tenantId, apiKeyId: key.id, requestId, method, path, operationId, status: res.status, durationMs: Date.now() - started, ip });
    } catch {
      /* el registro nunca rompe la respuesta */
    }
    return res;
  };

  if (key.ipAllowlist.length && (!ip || !key.ipAllowlist.includes(ip))) {
    return { response: await record(problem(403, "ip_not_allowed", "Esta llave solo funciona desde direcciones IP autorizadas.", requestId), null) };
  }

  const limit = consume(`key:${key.id}`);
  const rateHeaders = { "ratelimit-limit": String(limit.limit), "ratelimit-remaining": String(limit.remaining), "ratelimit-reset": String(limit.resetSeconds) };
  if (!limit.allowed) {
    return { response: await record(problem(429, "rate_limited", "Superaste el límite de peticiones por minuto.", requestId, { headers: { ...rateHeaders, "retry-after": String(limit.resetSeconds) } }), null) };
  }

  const tenant = await deps.loadTenant(key.tenantId);
  if (!tenant || !tenant.active) return { response: await record(problem(403, "tenant_inactive", "El negocio de esta llave no está activo.", requestId, { headers: rateHeaders }), null) };

  let quotaHeaders: Record<string, string> = {};
  if (deps.usage) {
    const quota = await deps.usage(key.tenantId);
    if (quota.limit > 0) quotaHeaders = { "x-quota-limit": String(quota.limit), "x-quota-remaining": String(Math.max(0, quota.limit - quota.used)) };
    if (!quota.allowed) {
      return { response: await record(problem(429, "quota_exceeded", "El negocio agotó su cupo mensual de peticiones.", requestId, { headers: { ...rateHeaders, ...quotaHeaders, "retry-after": String(quota.resetSeconds) } }), null) };
    }
  }

  const ctx: OperationContext = {
    tenantId: key.tenantId,
    // El rol de la llave es el de quien la creó: la llave nunca puede más que su creador.
    role: key.createdByRole ?? "ADVISOR",
    activeModules: tenant.modules,
    actor: { type: "API_KEY", id: key.id },
    requestId,
  };

  return { key, ctx, rateHeaders: { ...rateHeaders, ...quotaHeaders }, record };
}

export async function handleApi(request: Request, deps: ApiDeps): Promise<Response> {
  const started = Date.now();
  const requestId = `req_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
  const url = new URL(request.url);
  const path = url.pathname.startsWith(BASE) ? url.pathname.slice(BASE.length) || "/" : url.pathname;
  const method = request.method.toUpperCase();
  const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
    new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "x-request-id": requestId, "cache-control": "no-store", ...headers } });

  // Rutas públicas: documentación e índice.
  if (method === "GET" && path === "/openapi.json") return json(200, buildOpenApi(deps.operations), { "cache-control": "public, max-age=300" });
  if (method === "GET" && (path === "/" || path === "")) return json(200, { name: "NEXUS THRIVE API", version: "v1", docs: `${BASE}/openapi.json` });

  const guarded = await guardRequest(request, deps, { requestId, started, method, path });
  if ("response" in guarded) return guarded.response;
  const { key, ctx, rateHeaders } = guarded;
  let opId: string | null = null;
  const finish = (res: Response) => guarded.record(res, opId);

  // Quién soy y qué puedo hacer con esta llave.
  if (method === "GET" && path === "/me") {
    const usable = deps.operations.filter((op) => op.rest && scopeAllows(key.scopes, op));
    return finish(
      json(200, { data: { name: key.name, environment: key.environment, scopes: key.scopes, operations: usable.map((op) => ({ id: op.id, method: op.rest!.method, path: `${BASE}${op.rest!.path}`, risk: op.risk })) } }, rateHeaders),
    );
  }

  const { match, allow } = matchRoute(deps.operations, method, path);
  if (!match) {
    return finish(
      allow.length
        ? problem(405, "method_not_allowed", `Esta ruta acepta: ${allow.join(", ")}.`, requestId, { headers: { ...rateHeaders, allow: allow.join(", ") } })
        : problem(404, "not_found", "No existe esta ruta.", requestId, { headers: rateHeaders }),
    );
  }
  opId = match.op.id;

  if (!scopeAllows(key.scopes, match.op)) {
    return finish(problem(403, "scope_denied", `La llave no incluye el alcance para «${match.op.id}».`, requestId, { headers: rateHeaders }));
  }

  let input: Record<string, unknown>;
  if (method === "GET") input = { ...coerceQuery(match.op, url.searchParams), ...match.params };
  else {
    let body: unknown = {};
    const text = await request.text();
    if (text.trim()) {
      try {
        body = JSON.parse(text);
      } catch {
        return finish(problem(422, "invalid_input", "El cuerpo no es JSON válido.", requestId, { headers: rateHeaders }));
      }
    }
    input = { ...(typeof body === "object" && body ? (body as Record<string, unknown>) : {}), ...match.params };
  }

  try {
    const data = await runOperation(deps.operations, ctx, match.op.id, input);
    if (match.op.risk !== "read") await deps.audit?.(ctx, match.op, input);
    return finish(json(200, { data }, rateHeaders));
  } catch (error) {
    if (error instanceof OperationError) {
      const code: ProblemCode = STATUS_CODE[error.status] ?? (error.code === "unknown_operation" ? "not_found" : (error.code as ProblemCode));
      return finish(problem(error.status, code, error.message, requestId, { headers: rateHeaders, errors: error.issues }));
    }
    console.error(`[api] ${requestId} ${match.op.id}:`, error);
    return finish(problem(500, "internal", "Ocurrió un error inesperado. Si sigue, avisa con el request_id.", requestId, { headers: rateHeaders }));
  }
}
