import { describe, expect, it } from "vitest";
import { nextStep, previousStep, progressIndex } from "./flow";

describe("flujo del onboarding", () => {
  it("avanza y retrocede sin salirse", () => {
    expect(nextStep("intro")).toBe("profile");
    expect(nextStep("confirm")).toBe("confirm");
    expect(previousStep("profile")).toBe("intro");
    expect(previousStep("profile", "profile")).toBe("profile");
  });
  it("la presentación no cuenta en el progreso", () => {
    expect(progressIndex("intro")).toBe(0);
    expect(progressIndex("confirm")).toBe(4);
  });
});
