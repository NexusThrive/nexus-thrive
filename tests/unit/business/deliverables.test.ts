import { describe, expect, it } from "vitest";
import { TOKEN_PATTERN, canSend, hashToken, newReviewToken, validateDecision, validateDeliverable } from "@/lib/business/customers/deliverables";

describe("entregables (HU-entregables-01)", () => {
  it("el enlace es aleatorio, de forma válida y solo se guarda su huella", () => {
    const a = newReviewToken();
    const b = newReviewToken();
    expect(a.token).not.toBe(b.token);
    expect(TOKEN_PATTERN.test(a.token)).toBe(true);
    expect(a.hash).toBe(hashToken(a.token));
    expect(a.hash).not.toContain(a.token);
    expect(TOKEN_PATTERN.test("corto")).toBe(false);
  });
  it("solo se envía lo preparado o devuelto con cambios", () => {
    expect(canSend("DRAFT")).toBe(true);
    expect(canSend("CHANGES_REQUESTED")).toBe(true);
    expect(canSend("IN_REVIEW")).toBe(false);
    expect(canSend("APPROVED")).toBe(false);
  });
  it("pedir cambios exige decir cuáles; aprobar exige el nombre", () => {
    expect(validateDecision({ decision: "CHANGES_REQUESTED", name: "Camila", comment: "" })?.field).toBe("comment");
    expect(validateDecision({ decision: "APPROVED", name: "", comment: "" })?.field).toBe("name");
    expect(validateDecision({ decision: "X", name: "Camila", comment: "" })?.field).toBe("decision");
    expect(validateDecision({ decision: "APPROVED", name: "Camila", comment: "" })).toBeNull();
  });
  it("valida el nombre del entregable", () => {
    expect(validateDeliverable({ title: "ab" })).toBeTruthy();
    expect(validateDeliverable({ title: "Logo final" })).toBeNull();
  });
});
