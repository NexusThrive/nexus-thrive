import { randomUUID } from "node:crypto";
import { guardRequest, type ApiDeps } from "@/lib/api/handler";
import { scopeAllows } from "@/lib/api/scopes";
import { describeOperation, isAvailable, runOperation } from "@/lib/operations/engine";
import { OperationError, type OperationContext, type OperationDefinition } from "@/lib/operations/types";

/**
 * Servidor MCP (Model Context Protocol) de NEXUS: una capa delgada sobre el
 * MISMO registro de operaciones y la MISMA autenticación que `/api/v1` — sin
 * reglas propias. Transporte «Streamable HTTP» sin sesión: un POST de JSON-RPC
 * por mensaje. En esta versión es **solo lectura**: únicamente se listan y se
 * pueden llamar las operaciones de riesgo `read`; las que escriben llegarán
 * con aprobación humana (PR posterior).
 *
 * Qué ve el cliente depende de la llave: alcances ∩ rol de quien la creó ∩
 * módulos activos. Lo que no puede usar ni aparece en la lista.
 */
export const MCP_PROTOCOLS = ["2025-06-18", "2025-03-26", "2024-11-05"] as const;
const LATEST = MCP_PROTOCOLS[0];

type RpcId = string | number | null;
type RpcRequest = { jsonrpc: "2.0"; id?: RpcId; method: string; params?: Record<string, unknown> };

const ok = (id: RpcId, result: unknown) => ({ jsonrpc: "2.0" as const, id, result });
const fail = (id: RpcId, code: number, message: string, data?: unknown) => ({ jsonrpc: "2.0" as const, id, error: { code, message, ...(data ? { data } : {}) } });

/** Nombre de herramienta válido para clientes MCP: `customers.search` → `customers_search`. */
export const toolName = (opId: string) => opId.replace(/\./g, "_");

function tools(operations: readonly OperationDefinition[], ctx: OperationContext, scopes: readonly string[]) {
  return operations.filter((op) => op.risk === "read" && scopeAllows(scopes, op) && isAvailable(op, ctx));
}

function toolDescriptor(op: OperationDefinition) {
  const d = describeOperation(op);
  return {
    name: toolName(op.id),
    title: op.title,
    description: op.description,
    inputSchema: d.inputSchema,
    outputSchema: { type: "object", properties: { data: d.outputSchema }, required: ["data"] },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  };
}

const json = (status: number, body: unknown, requestId: string, headers: Record<string, string> = {}) =>
  new Response(body === null ? null : JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "x-request-id": requestId, "cache-control": "no-store", ...headers } });

export async function handleMcp(request: Request, deps: ApiDeps): Promise<Response> {
  const started = Date.now();
  const requestId = `req_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
  const method = request.method.toUpperCase();
  // Sin sesión ni flujo de servidor→cliente: GET/DELETE no aplican.
  if (method !== "POST") return json(405, fail(null, -32000, "Este servidor MCP solo acepta POST."), requestId, { allow: "POST" });

  const guarded = await guardRequest(request, deps, { requestId, started, method, path: "/mcp" });
  if ("response" in guarded) return guarded.response;
  const { key, ctx, rateHeaders, record } = guarded;
  const reply = (status: number, body: unknown, operationId: string | null = null) => record(json(status, body, requestId, rateHeaders), operationId);

  let message: RpcRequest;
  try {
    message = JSON.parse(await request.text());
  } catch {
    return reply(400, fail(null, -32700, "JSON inválido."));
  }
  if (Array.isArray(message) || !message || message.jsonrpc !== "2.0" || typeof message.method !== "string") {
    return reply(400, fail(null, -32600, "Solicitud JSON-RPC 2.0 inválida (un mensaje por petición)."));
  }
  const id = message.id ?? null;
  const isNotification = message.id === undefined;

  switch (message.method) {
    case "initialize": {
      const asked = String(message.params?.protocolVersion ?? "");
      return reply(200, ok(id, {
        protocolVersion: (MCP_PROTOCOLS as readonly string[]).includes(asked) ? asked : LATEST,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "nexus-thrive", title: "NEXUS THRIVE", version: "1.0.0" },
        instructions: "Consulta los datos del negocio de esta llave. Solo lectura. Las cifras vienen en pesos colombianos.",
      }));
    }
    case "ping":
      return reply(200, ok(id, {}));
    case "tools/list":
      return reply(200, ok(id, { tools: tools(deps.operations, ctx, key.scopes).map(toolDescriptor) }));
    case "tools/call": {
      const name = String(message.params?.name ?? "");
      const op = tools(deps.operations, ctx, key.scopes).find((candidate) => toolName(candidate.id) === name);
      // Una herramienta que la llave no puede usar se comporta como si no existiera.
      if (!op) return reply(200, fail(id, -32602, `La herramienta «${name}» no existe o esta llave no puede usarla.`));
      try {
        const data = await runOperation(deps.operations, ctx, op.id, message.params?.arguments ?? {});
        return reply(200, ok(id, { content: [{ type: "text", text: JSON.stringify({ data }) }], structuredContent: { data }, isError: false }), op.id);
      } catch (error) {
        if (error instanceof OperationError) {
          const text = error.issues?.length ? `${error.message} ${JSON.stringify(error.issues)}` : error.message;
          return reply(200, ok(id, { content: [{ type: "text", text }], isError: true }), op.id);
        }
        console.error(`[mcp] ${requestId} ${op.id}:`, error);
        return reply(200, ok(id, { content: [{ type: "text", text: `Error inesperado (request_id ${requestId}).` }], isError: true }), op.id);
      }
    }
    default:
      // Las notificaciones (initialized, cancelled…) no llevan respuesta.
      if (isNotification) return record(new Response(null, { status: 202, headers: { "x-request-id": requestId } }), null);
      return reply(200, fail(id, -32601, `Método «${message.method}» no soportado.`));
  }
}
