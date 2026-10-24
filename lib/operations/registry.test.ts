import { describe, expect, test } from "vitest";
import { BUSINESS_PERMISSIONS } from "@/lib/business/permissions";
import { isModule } from "@/lib/admin/catalogs";
import { describeOperation, OPERATIONS, getOperation, operationsFor } from "./registry";

/** Contrato del registro (.docs/integracion-api-mcp-webhooks.md §1): lo que toda operación debe tener. */
describe("registro de operaciones", () => {
  test("ids únicos, con la forma recurso.accion", () => {
    const ids = OPERATIONS.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id, id).toMatch(/^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/);
  });

  test("cada operación declara módulo válido, permiso válido, riesgo y descripción útil", () => {
    for (const op of OPERATIONS) {
      if (op.module) expect(isModule(op.module), `${op.id}: módulo`).toBe(true);
      if (op.permission) expect(Object.keys(BUSINESS_PERMISSIONS), `${op.id}: permiso`).toContain(op.permission);
      expect(["read", "draft", "write", "money", "destructive"], `${op.id}: riesgo`).toContain(op.risk);
      expect(op.description.length, `${op.id}: descripción`).toBeGreaterThan(20);
      expect(op.title.length).toBeGreaterThan(3);
    }
  });

  test("las operaciones que escriben o mueven dinero exigen idempotencia y declaran eventos", () => {
    for (const op of OPERATIONS.filter((o) => o.risk !== "read")) {
      expect(op.idempotent, `${op.id}: idempotencia`).toBe(true);
      expect(op.emits?.length ?? 0, `${op.id}: eventos`).toBeGreaterThan(0);
      for (const ev of op.emits ?? []) expect(ev).toMatch(/^[a-z_]+\.[a-z_]+\.v\d+$/);
    }
  });

  test("todas generan JSON Schema (base de OpenAPI y de las herramientas MCP)", () => {
    for (const op of OPERATIONS) {
      const d = describeOperation(op);
      expect(d.inputSchema, op.id).toMatchObject({ type: "object" });
      expect(d.outputSchema, op.id).toMatchObject({ type: "object" });
    }
  });

  test("operationsFor: un rol sin dinero y sin módulo no ve las operaciones de finanzas", () => {
    const ids = (role: string, modules: string[]) => operationsFor({ role, activeModules: modules }).map((o) => o.id);
    expect(ids("OWNER", ["finance", "crm", "inventory"])).toEqual(expect.arrayContaining(["finance.get_summary", "sales.list_recent", "customers.search", "products.search"]));
    expect(ids("OWNER", ["crm"])).not.toContain("finance.get_summary");
    expect(ids("NO_EXISTE", ["finance", "crm"])).not.toContain("finance.get_summary");
    expect(ids("NO_EXISTE", [])).toContain("business.get_summary");
  });

  test("getOperation encuentra por id", () => {
    expect(getOperation("customers.search")?.module).toBe("crm");
    expect(getOperation("no.existe")).toBeUndefined();
  });
});
