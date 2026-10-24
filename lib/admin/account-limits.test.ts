import { describe, expect, it } from "vitest";
import { limitProblem, parseLimit, slugFromName } from "./account-limits";

describe("límite de negocios por persona", () => {
  it("sin límite nunca bloquea; con límite bloquea al alcanzarlo", () => {
    expect(limitProblem(50, null)).toBeNull();
    expect(limitProblem(2, 3)).toBeNull();
    expect(limitProblem(3, 3)).toContain("límite es 3");
    expect(limitProblem(1, 1)).toContain("1 negocio");
  });
  it("interpreta lo que se escribe", () => {
    expect(parseLimit("")).toEqual({ ok: true, value: null });
    expect(parseLimit(" 5 ")).toEqual({ ok: true, value: 5 });
    for (const bad of ["0", "-1", "2.5", "abc", "501"]) expect(parseLimit(bad).ok).toBe(false);
  });
  it("arma un slug libre", () => {
    expect(slugFromName("Gimnasio Ñandú & Co.", () => false)).toBe("gimnasio-nandu-co");
    expect(slugFromName("Mi Tienda", (s) => s === "mi-tienda" || s === "mi-tienda-2")).toBe("mi-tienda-3");
    expect(slugFromName("¡¡", () => false)).toBe("negocio");
  });
});
