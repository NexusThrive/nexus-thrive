import { describe, expect, test } from "vitest";
import { OPERATIONS } from "@/lib/operations/registry";
import { buildOpenApi } from "./openapi";

type Doc = { openapi: string; paths: Record<string, Record<string, Record<string, unknown>>>; components: { schemas: Record<string, unknown>; securitySchemes: Record<string, unknown> } };
const doc = buildOpenApi(OPERATIONS) as unknown as Doc;

describe("OpenAPI generado del registro", () => {
  test("es 3.1 con seguridad por llave y el esquema de error", () => {
    expect(doc.openapi).toBe("3.1.0");
    expect(doc.components.securitySchemes.bearer).toBeDefined();
    expect(doc.components.schemas.Problem).toBeDefined();
  });

  test("cada operación con ruta REST aparece con su operationId, permiso y módulo", () => {
    for (const op of OPERATIONS.filter((o) => o.rest)) {
      const item = doc.paths[op.rest!.path]?.[op.rest!.method.toLowerCase()];
      expect(item, op.id).toBeDefined();
      expect(item.operationId).toBe(op.id);
      expect(item["x-nexus-permission"]).toBe(op.permission);
      expect(item["x-nexus-module"]).toBe(op.module);
    }
  });

  test("los parámetros de ruta están declarados y los de consulta salen de la entrada", () => {
    const stock = doc.paths["/products/{productId}/stock"].get as { parameters: { name: string; in: string; required: boolean }[] };
    expect(stock.parameters).toContainEqual(expect.objectContaining({ name: "productId", in: "path", required: true }));
    const customers = doc.paths["/customers"].get as { parameters: { name: string; in: string; required: boolean }[] };
    expect(customers.parameters.find((p) => p.name === "q")).toMatchObject({ in: "query", required: true });
    expect(customers.parameters.find((p) => p.name === "limit")).toMatchObject({ in: "query", required: false });
  });

  test("toda respuesta de error usa application/problem+json", () => {
    const op = doc.paths["/customers"].get as { responses: Record<string, { content: Record<string, unknown> }> };
    for (const status of ["401", "403", "404", "422", "429"]) expect(Object.keys(op.responses[status].content)).toEqual(["application/problem+json"]);
  });
});
