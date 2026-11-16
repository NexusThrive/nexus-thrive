import { describe, expect, test } from "vitest";
import { canOperateTenant, tenantAccessReason } from "@/lib/core/tenancy/access-policy";

describe("managed tenant access", () => {
  const legacy = { active: true, managedProvisioning: false, onboardingCompleted: false, activatedAt: null };
  test("preserves authorized legacy access without forcing onboarding", () => {
    expect(canOperateTenant(legacy)).toBe(true);
  });
  test("requires readiness, activation and current enablement", () => {
    const managed = { ...legacy, managedProvisioning: true };
    expect(canOperateTenant(managed)).toBe(false);
    expect(tenantAccessReason(managed)).toBe("preparing");
    expect(canOperateTenant({ ...managed, onboardingCompleted: true })).toBe(false);
    const ready = { ...managed, onboardingCompleted: true, activatedAt: "2026-11-16" };
    expect(canOperateTenant(ready)).toBe(true);
    expect(canOperateTenant({ ...ready, active: false })).toBe(false);
    expect(tenantAccessReason({ ...ready, active: false })).toBe("suspended");
    expect(canOperateTenant({ ...ready, onboardingCompleted: false })).toBe(false);
  });
  test("suspension blocks legacy access too", () => {
    expect(canOperateTenant({ ...legacy, active: false })).toBe(false);
  });
});
