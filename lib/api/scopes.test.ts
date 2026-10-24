import { describe, expect, test } from "vitest";
import { OPERATIONS } from "@/lib/operations/registry";
import { invalidScope, scopeAllows } from "./scopes";

const customers = { id: "customers.search", risk: "read" as const };
const finance = { id: "finance.get_summary", risk: "read" as const };
const writer = { id: "customers.create", risk: "write" as const };

describe("alcances de una llave", () => {
  test("`*` permite todo", () => {
    expect(scopeAllows(["*"], customers)).toBe(true);
    expect(scopeAllows(["*"], writer)).toBe(true);
  });
  test("`read` solo permite las de riesgo read", () => {
    expect(scopeAllows(["read"], finance)).toBe(true);
    expect(scopeAllows(["read"], writer)).toBe(false);
  });
  test("`recurso.*` permite un recurso y nada más", () => {
    expect(scopeAllows(["customers.*"], customers)).toBe(true);
    expect(scopeAllows(["customers.*"], writer)).toBe(true);
    expect(scopeAllows(["customers.*"], finance)).toBe(false);
  });
  test("un id exacto permite solo esa operación", () => {
    expect(scopeAllows(["customers.search"], customers)).toBe(true);
    expect(scopeAllows(["customers.search"], writer)).toBe(false);
  });
  test("sin alcances no permite nada", () => {
    expect(scopeAllows([], customers)).toBe(false);
  });
  test("invalidScope devuelve el primer alcance que no existe", () => {
    expect(invalidScope(["read", "customers.*", "finance.get_summary", "*"], OPERATIONS)).toBeNull();
    expect(invalidScope(["read", "clientes.*"], OPERATIONS)).toBe("clientes.*");
    expect(invalidScope(["customers.borrar"], OPERATIONS)).toBe("customers.borrar");
  });
});
