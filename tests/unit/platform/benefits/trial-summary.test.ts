import { describe, expect, it } from "vitest";
import { SELF_SERVICE_TRIAL_DAYS, trialSummary } from "@/lib/platform/benefits/benefits";

const DAY = 86_400_000;
const NOW = Date.parse("2026-11-02T15:00:00Z");

describe("prueba de autoservicio", () => {
  it("dura 15 días", () => {
    expect(SELF_SERVICE_TRIAL_DAYS).toBe(15);
  });
  it("con margen: nivel ok y días completos", () => {
    expect(trialSummary(NOW + 15 * DAY, NOW)).toMatchObject({ daysLeft: 15, level: "ok" });
    expect(trialSummary(NOW + 10 * DAY - 1, NOW)).toMatchObject({ daysLeft: 10, level: "ok" });
  });
  it("faltando 3 días o menos avisa", () => {
    expect(trialSummary(NOW + 3 * DAY, NOW).level).toBe("soon");
    expect(trialSummary(NOW + 1, NOW)).toMatchObject({ daysLeft: 1, level: "soon" });
  });
  it("vencida: cero días y nunca negativos", () => {
    expect(trialSummary(NOW - 5 * DAY, NOW)).toMatchObject({ daysLeft: 0, level: "ended" });
  });
});
