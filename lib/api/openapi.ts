import { z } from "zod";
import type { OperationDefinition } from "@/lib/operations/types";

/**
 * Documento OpenAPI 3.1 de la API, GENERADO del registro de operaciones: la ruta
 * REST, los parámetros, los esquemas y el permiso salen de la misma definición
 * que usan la API y el MCP, así que no puede desfasarse.
 */
const RISK_NOTE: Record<string, string> = {
  read: "Solo lectura.",
  draft: "Crea un borrador; no sale nada al exterior.",
  write: "Escribe datos; requiere `Idempotency-Key`.",
  money: "Mueve dinero; propone y una persona aprueba.",
  destructive: "Destructiva; siempre con aprobación humana.",
};

const PROBLEM_REF = { $ref: "#/components/schemas/Problem" };
const problemResponse = (description: string) => ({ description, content: { "application/problem+json": { schema: PROBLEM_REF } } });

type Json = Record<string, unknown>;

export function buildOpenApi(operations: readonly OperationDefinition[], serverUrl = "/api/v1"): Json {
  const paths: Record<string, Record<string, unknown>> = {};
  for (const op of operations) {
    if (!op.rest) continue;
    const input = z.toJSONSchema(op.input, { io: "input" }) as { properties?: Record<string, Json>; required?: string[] };
    const properties = input.properties ?? {};
    const pathParams = [...op.rest.path.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
    const parameters = [
      ...pathParams.map((name) => ({ name, in: "path", required: true, schema: properties[name] ?? { type: "string" } })),
      ...(op.rest.method === "GET"
        ? Object.entries(properties)
            .filter(([name]) => !pathParams.includes(name))
            .map(([name, schema]) => ({ name, in: "query", required: input.required?.includes(name) ?? false, schema }))
        : []),
    ];
    const body =
      op.rest.method === "POST"
        ? { requestBody: { required: true, content: { "application/json": { schema: z.toJSONSchema(op.input, { io: "input" }) } } } }
        : {};
    const path = (paths[op.rest.path] ??= {});
    path[op.rest.method.toLowerCase()] = {
      operationId: op.id,
      summary: op.title,
      description: `${op.description}\n\n${RISK_NOTE[op.risk] ?? ""}`.trim(),
      tags: [op.id.split(".")[0]],
      security: [{ bearer: [] }],
      parameters,
      ...body,
      responses: {
        "200": {
          description: "Resultado.",
          content: { "application/json": { schema: { type: "object", required: ["data"], properties: { data: z.toJSONSchema(op.output) } } } },
        },
        "401": problemResponse("Falta la llave, es inválida, venció o fue revocada."),
        "403": problemResponse("La llave no tiene el alcance, el rol no tiene el permiso o el módulo no está activo."),
        "404": problemResponse("No existe la ruta o el recurso en este negocio."),
        "422": problemResponse("Datos inválidos (`errors` dice cuáles)."),
        "429": problemResponse("Se superó el límite de peticiones (`Retry-After`)."),
      },
      "x-nexus-risk": op.risk,
      "x-nexus-permission": op.permission,
      "x-nexus-module": op.module,
      "x-nexus-scope": [op.id, `${op.id.split(".")[0]}.*`, ...(op.risk === "read" ? ["read"] : []), "*"],
    };
  }
  return {
    openapi: "3.1.0",
    info: {
      title: "API de NEXUS THRIVE",
      version: "1.0.0",
      description:
        "API por negocio. Se autentica con una llave (`Authorization: Bearer nx_live_…`) creada en Ajustes → Integraciones. El negocio sale de la llave, nunca de la ruta. Errores en `application/problem+json` (RFC 9457). Límite de 120 peticiones por minuto por llave (`RateLimit-*`).",
    },
    servers: [{ url: serverUrl }],
    security: [{ bearer: [] }],
    paths: { ...paths },
    components: {
      securitySchemes: { bearer: { type: "http", scheme: "bearer", description: "Llave de API del negocio." } },
      schemas: {
        Problem: {
          type: "object",
          required: ["type", "title", "status", "detail", "code", "request_id"],
          properties: {
            type: { type: "string", format: "uri" },
            title: { type: "string" },
            status: { type: "integer" },
            detail: { type: "string" },
            code: { type: "string", description: "Código estable para programar contra él." },
            request_id: { type: "string", description: "Identificador para soporte (también en `X-Request-Id`)." },
            errors: { type: "array", items: { type: "object", properties: { path: { type: "string" }, message: { type: "string" } } } },
          },
        },
      },
    },
  };
}
