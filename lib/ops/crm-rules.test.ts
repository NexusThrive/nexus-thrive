import { describe, expect, it } from "vitest";
import { followUpState, pipelineSummary, validateLead } from "./crm-rules";

const base = { company: "Gym Andes", phone: "3001234567", source: "Referido", stage: "NEW" as const, ownerId: "s1", nextStep: "Llamar", nextStepDate: "2026-10-20" };

describe("CRM comercial", () => {
  it("un lead activo exige responsable y próximo paso con fecha", () => {
    const r = validateLead({ ...base, ownerId: null, nextStep: "", nextStepDate: null });
    expect(r.ok).toBe(false);
    expect(!r.ok && Object.keys(r.errors).sort()).toEqual(["nextStep", "nextStepDate", "ownerId"]);
  });
  it("perdido exige motivo y limpia el próximo paso", () => {
    expect(validateLead({ ...base, stage: "LOST" }).ok).toBe(false);
    const r = validateLead({ ...base, stage: "LOST", lostReason: "Precio" });
    expect(r.ok && r.value).toMatchObject({ nextStep: null, nextStepDate: null, lostReason: "Precio" });
  });
  it("pide al menos un medio de contacto", () => {
    expect(validateLead({ ...base, phone: "" }).ok).toBe(false);
    expect(validateLead({ ...base, phone: "", email: "a@b.co" }).ok).toBe(true);
  });
  it("estado del seguimiento", () => {
    expect(followUpState("QUALIFIED", "2026-10-16", "2026-10-17")).toBe("overdue");
    expect(followUpState("QUALIFIED", "2026-10-17", "2026-10-17")).toBe("today");
    expect(followUpState("WON", "2026-10-01", "2026-10-17")).toBe("none");
  });
  it("valor ponderado y tasa de cierre", () => {
    const s = pipelineSummary([
      { stage: "PROPOSAL", valueUsdCents: 10000 },
      { stage: "DEMO", valueUsdCents: 5000 },
      { stage: "WON", valueUsdCents: 3000 },
      { stage: "LOST", valueUsdCents: 3000 },
    ]);
    expect(s.weightedCents).toBe(6000 + 2000);
    expect(s.winRatePct).toBe(50);
    expect(s.activeCount).toBe(2);
  });
});
