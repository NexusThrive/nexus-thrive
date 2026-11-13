import { describe, expect, it } from "vitest";
import { FLOW_STEPS } from "@/lib/experience/onboarding/flow";
import { guideLine, stepCaption } from "@/lib/experience/onboarding/guide";

describe("guion de AURI en el onboarding", () => {
  it("todos los pasos tienen una frase corta con su cara", () => {
    for (const step of FLOW_STEPS) {
      for (const slide of [0, 1, 2]) {
        const line = guideLine(step, slide);
        expect(line.text.length).toBeGreaterThan(10);
        expect(line.text.length).toBeLessThan(140);
        expect(line.mood).toBeTruthy();
      }
    }
  });

  it("saluda por el nombre y no inventa uno si no lo hay", () => {
    expect(guideLine("intro", 0, { firstName: "Santiago" }).text).toContain("Santiago");
    expect(guideLine("intro", 0).text).not.toContain("undefined");
  });

  it("la presentación cambia de frase y de cara en cada diapositiva", () => {
    const lines = [0, 1, 2].map((slide) => guideLine("intro", slide));
    expect(new Set(lines.map((l) => l.text)).size).toBe(3);
    expect(new Set(lines.map((l) => l.mood)).size).toBeGreaterThan(1);
  });

  it("reacciona al perfil y al nombre del negocio", () => {
    expect(guideLine("profile", 0, { tenantType: "COMPANY" }).text).toMatch(/Empresa/);
    expect(guideLine("profile", 0, { tenantType: "INDIVIDUAL" }).text).toMatch(/Emprendedor/);
    expect(guideLine("business", 0, { businessName: "  Café Sol " }).text).toContain("Café Sol");
    expect(guideLine("business", 0).text).not.toContain("¡!");
  });

  it("el plan menciona el beneficio cuando lo hay", () => {
    expect(guideLine("plan", 0, { hasBenefit: true }).text).toMatch(/beneficio/);
    expect(guideLine("plan", 0).text).toMatch(/15 días/);
  });

  it("el pie de progreso", () => {
    expect(stepCaption(2, 5, "Tu negocio")).toBe("Paso 2 de 5 · Tu negocio");
    expect(stepCaption(1, 5, undefined)).toBe("Paso 1 de 5");
  });
});
