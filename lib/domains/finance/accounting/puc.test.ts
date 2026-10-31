import { describe, expect, it } from "vitest";
import { DEFAULT_RULES, PUC_TEMPLATE, natureOf, periodLabel, periodOfDate, typeOf, validateAccount, validateRule } from "./puc";

describe("plan de cuentas", () => {
  it("la plantilla es coherente: códigos únicos, tipo por clase, naturaleza normal y padres presentes", () => {
    const codes = PUC_TEMPLATE.map((a) => a.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const a of PUC_TEMPLATE) {
      expect(a.type).toBe(typeOf(a.code));
      if (a.code.length > 1) expect(codes.some((c) => c.length < a.code.length && a.code.startsWith(c))).toBe(true);
    }
    expect(PUC_TEMPLATE.find((a) => a.code === "1105")).toMatchObject({ type: "ASSET", nature: "D", postable: true });
    expect(PUC_TEMPLATE.find((a) => a.code === "2408")).toMatchObject({ type: "LIABILITY", nature: "C" });
    expect(PUC_TEMPLATE.find((a) => a.code === "4175")).toMatchObject({ type: "INCOME", nature: "D" }); // contra-ingreso
    expect(natureOf("EXPENSE")).toBe("D");
  });
  it("valida cuentas nuevas", () => {
    const codes = PUC_TEMPLATE.map((a) => a.code);
    expect(validateAccount({ code: "110505", name: "Caja general" }, codes)).toBeNull();
    expect(validateAccount({ code: "1105", name: "Caja" }, codes)).toContain("Ya existe");
    expect(validateAccount({ code: "99", name: "Rara" }, codes)).toContain("dígitos");
    expect(validateAccount({ code: "1999", name: "Sin padre" }, codes)).toContain("colgar");
    expect(validateAccount({ code: "110505", name: "x" }, codes)).toContain("nombre");
  });
  it("las reglas de partida usan cuentas del plan y cada una tiene débito y crédito", () => {
    const codes = PUC_TEMPLATE.filter((a) => a.postable).map((a) => a.code);
    expect(new Set(DEFAULT_RULES.map((r) => r.event)).size).toBe(DEFAULT_RULES.length);
    for (const r of DEFAULT_RULES) expect(validateRule(r.lines, codes)).toBeNull();
    expect(validateRule([{ side: "D", account: "1105", amount: "total", label: "" }], codes)).toContain("débito y un crédito");
    expect(validateRule([{ side: "D", account: "9999", amount: "total", label: "" }, { side: "C", account: "1105", amount: "total", label: "" }], codes)).toContain("9999");
  });
  it("períodos", () => {
    expect(periodOfDate("2026-10-24")).toEqual({ year: 2026, month: 10 });
    expect(periodLabel(2026, 10)).toBe("octubre de 2026");
  });
});
