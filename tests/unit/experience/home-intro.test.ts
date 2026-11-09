import { describe, expect, it } from "vitest";
import { homeIntroSteps, introSeen, isHomePath, markIntroSeen } from "@/lib/experience/assistant/home-intro";

const memory = () => {
  const data = new Map<string, string>();
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
};

describe("recorrido de AURI en el Inicio", () => {
  it("saluda por el nombre y explica el panel en pasos cortos", () => {
    const steps = homeIntroSteps("Santiago");
    expect(steps[0]!.text).toBe("Hola Santiago! Este es tu panel de inicio.");
    expect(homeIntroSteps(null)[0]!.text).toBe("Hola! Este es tu panel de inicio.");
    expect(steps.length).toBeGreaterThanOrEqual(4);
    expect(steps.every((s) => s.text.length <= 140)).toBe(true);
    expect(steps[0]!.joy && steps.at(-1)!.joy).toBe(true);
  });
  it("se muestra una sola vez por negocio y navegador", () => {
    const s = memory();
    expect(introSeen(s, "acme")).toBe(false);
    markIntroSeen(s, "acme");
    expect(introSeen(s, "acme")).toBe(true);
    expect(introSeen(s, "otro")).toBe(false);
  });
  it("sin almacenamiento no insiste", () => {
    expect(introSeen(null, "acme")).toBe(true);
  });
  it("reconoce el Inicio", () => {
    expect(isHomePath("/acme", "acme")).toBe(true);
    expect(isHomePath("/acme/", "acme")).toBe(true);
    expect(isHomePath("/", "acme")).toBe(true);
    expect(isHomePath("/acme/contactos", "acme")).toBe(false);
  });
});
