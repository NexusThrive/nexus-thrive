import { describe, expect, it } from "vitest";
import {
  CODE_ALPHABET,
  benefitCopy,
  benefitEndMs,
  benefitStatus,
  benefitStatusMessage,
  generateBenefitCode,
  normalizeBenefitCode,
  normalizeBenefitKind,
} from "@/lib/benefits/benefits";

describe("normalizeBenefitCode", () => {
  it("pasa a mayúsculas y quita espacios", () => {
    expect(normalizeBenefitCode("  elite-2026  ")).toBe("ELITE-2026");
  });

  it("quita acentos y símbolos no válidos", () => {
    expect(normalizeBenefitCode("Promó/1 año!")).toBe("PROMO1ANO");
  });

  it("recorta a 32 caracteres", () => {
    expect(normalizeBenefitCode("A".repeat(50))).toHaveLength(32);
  });

  it("tolera vacío / undefined", () => {
    expect(normalizeBenefitCode("")).toBe("");
    expect(normalizeBenefitCode(undefined as unknown as string)).toBe("");
  });
});

describe("generateBenefitCode", () => {
  it("respeta la longitud y el alfabeto sin ambiguos", () => {
    const code = generateBenefitCode(8);
    expect(code).toHaveLength(8);
    for (const char of code) expect(CODE_ALPHABET).toContain(char);
    expect(code).not.toMatch(/[0O1IL]/);
  });

  it("no repite siempre el mismo valor", () => {
    const codes = new Set(Array.from({ length: 20 }, () => generateBenefitCode(8)));
    expect(codes.size).toBeGreaterThan(1);
  });
});

describe("benefitStatus", () => {
  const now = Date.parse("2026-10-19T12:00:00.000Z");

  it("activo por defecto", () => {
    expect(
      benefitStatus({ active: true, expiresAt: null, usedCount: 0, maxUses: null }, now),
    ).toBe("active");
  });

  it("inactivo cuando active=false (tiene prioridad)", () => {
    expect(
      benefitStatus(
        { active: false, expiresAt: null, usedCount: 0, maxUses: 5 },
        now,
      ),
    ).toBe("inactive");
  });

  it("vencido si expiresAt ya pasó", () => {
    expect(
      benefitStatus(
        { active: true, expiresAt: "2026-10-18T00:00:00.000Z", usedCount: 0, maxUses: null },
        now,
      ),
    ).toBe("expired");
  });

  it("agotado cuando alcanzó maxUses", () => {
    expect(
      benefitStatus({ active: true, expiresAt: null, usedCount: 5, maxUses: 5 }, now),
    ).toBe("exhausted");
  });

  it("ilimitado con maxUses=null", () => {
    expect(
      benefitStatus({ active: true, expiresAt: null, usedCount: 999, maxUses: null }, now),
    ).toBe("active");
  });
});

describe("benefitEndMs", () => {
  it("suma los días en milisegundos", () => {
    const start = Date.parse("2026-10-19T00:00:00.000Z");
    expect(benefitEndMs(start, 30) - start).toBe(30 * 86_400_000);
  });

  it("mínimo un día", () => {
    const start = 0;
    expect(benefitEndMs(start, 0) - start).toBe(86_400_000);
  });
});

describe("benefitStatusMessage", () => {
  it("es vacío para activo", () => {
    expect(benefitStatusMessage("active")).toBe("");
  });

  it("explica los demás estados", () => {
    expect(benefitStatusMessage("inactive")).toMatch(/disponible/);
    expect(benefitStatusMessage("expired")).toMatch(/venció/);
    expect(benefitStatusMessage("exhausted")).toMatch(/límite/);
  });
});

describe("normalizeBenefitKind", () => {
  it("solo admite PROMO y PAID", () => {
    expect(normalizeBenefitKind("PAID")).toBe("PAID");
    expect(normalizeBenefitKind("PROMO")).toBe("PROMO");
    expect(normalizeBenefitKind("otro")).toBe("PROMO");
    expect(normalizeBenefitKind(undefined)).toBe("PROMO");
  });
});

describe("benefitCopy", () => {
  it("un promo se anuncia como gratis", () => {
    const copy = benefitCopy("PROMO", { planName: "Elite", durationDays: 30 });
    expect(copy.title).toBe("30 días gratis de Thrive Elite");
    expect(copy.review).toMatch(/Gratis durante 30 días/);
  });

  it("un acceso pagado NO dice gratis: dice cuenta activada", () => {
    const copy = benefitCopy("PAID", { planName: "Elite", durationDays: 90 });
    expect(copy.title).toBe("Cuenta NEXUS activada");
    expect(copy.title).not.toMatch(/gratis/i);
    expect(copy.review).not.toMatch(/gratis/i);
    expect(copy.review).toMatch(/pago confirmado/);
    expect(copy.badge).toBe("Acceso pagado");
  });

  it("redondea los días a un mínimo de uno", () => {
    expect(benefitCopy("PROMO", { planName: "Elite", durationDays: 0 }).title).toMatch(/^1 días/);
  });
});
