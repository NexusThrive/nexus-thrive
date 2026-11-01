import { describe, expect, test } from "vitest";
import { escapeLike } from "@/lib/foundation/db/sql-like";

describe("escapeLike", () => {
  test("deja intacto el texto sin comodines", () => {
    expect(escapeLike("cemento gris")).toBe("cemento gris");
    expect(escapeLike("")).toBe("");
  });

  test("escapa porcentaje, guion bajo y barra invertida", () => {
    expect(escapeLike("50%")).toBe("50\\%");
    expect(escapeLike("a_b")).toBe("a\\_b");
    expect(escapeLike("a\\b")).toBe("a\\\\b");
  });

  test("escapa cada aparición, mezcladas", () => {
    expect(escapeLike("%_\\%_")).toBe("\\%\\_\\\\\\%\\_");
  });

  test("no toca otros caracteres especiales de SQL", () => {
    expect(escapeLike("o'brien \"x\" ;--")).toBe("o'brien \"x\" ;--");
  });
});
