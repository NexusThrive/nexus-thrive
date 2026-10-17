import { describe, expect, it } from "vitest";
import { csat, nps, validateAnswer } from "./satisfaction-rules";

describe("satisfacción", () => {
  it("CSAT y NPS", () => {
    expect(csat([5, 4, 3, 1])).toBe(50);
    expect(csat([])).toBeNull();
    expect(nps([10, 9, 8, 6])).toBe(25);
  });
  it("valida la respuesta", () => {
    expect(validateAnswer({ score: 6 }).ok).toBe(false);
    expect(validateAnswer({ score: 5, nps: 11 }).ok).toBe(false);
    expect(validateAnswer({ score: 4, nps: "", comment: " bien " })).toEqual({ ok: true, value: { score: 4, nps: null, comment: "bien" } });
  });
});
