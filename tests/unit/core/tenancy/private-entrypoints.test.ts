import { readFileSync } from "node:fs";
import { describe, expect, test, vi } from "vitest";
import { completeAdaptiveOnboardingAction } from "@/app/onboarding/actions";
import { managedBusinessInput } from "@/lib/platform/admin/managed-validation";

const target = vi.hoisted(() => ({ staff: false, invited: [] as string[], home: null as null | { slug: string; access: string } }));
vi.mock("@clerk/nextjs/server", () => ({ auth: async () => ({ userId: "existing_account" }), currentUser: async () => ({ primaryEmailAddress: { emailAddress: "owner@example.com", verification: { status: "verified" } } }) }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`REDIRECT:${path}`); } }));
vi.mock("@/lib/core/tenancy/team-db", () => ({ acceptInvitesFor: async () => target.invited }));
vi.mock("@/lib/core/tenancy/membership", () => ({ homeTenantFor: async () => target.home, managedAccessForEmail: async () => null }));
vi.mock("@/lib/platform/team/access", () => ({ getStaffContext: async () => target.staff ? {} : null, findStaffByEmail: async () => null }));

describe("private provisioning entry points", () => {
  test("retired creation and resume actions reject direct calls", async () => {
    expect((await completeAdaptiveOnboardingAction({} as never)).status).toBe("error");
    expect((await completeAdaptiveOnboardingAction({ tenantId: "legacy" } as never)).status).toBe("error");
  });
  test("managed form normalizes email and rejects arbitrary technical fields", () => {
    const payload = { name: " Business ", slug: " BUSINESS ", ownerEmail: " OWNER@EXAMPLE.COM ", provisioningKey: "fd30fc02-85ab-4a5a-8eda-fdcba718d478" };
    expect(managedBusinessInput.parse(payload)).toMatchObject({ name: "Business", slug: "business", ownerEmail: "owner@example.com" });
    expect(managedBusinessInput.safeParse({ ...payload, active: true }).success).toBe(false);
    expect(managedBusinessInput.safeParse({ ...payload, slug: "onboarding" }).success).toBe(false);
  });
  test("staff, owners and accepted invitees redirect only to authorized destinations", async () => {
    const { default: callback } = await import("@/app/auth/callback/page");
    target.staff = true;
    await expect(callback()).rejects.toThrow("REDIRECT:/admin");
    target.staff = false;
    target.invited = ["invited-business"];
    await expect(callback()).rejects.toThrow("REDIRECT:/invited-business");
    target.invited = [];
    target.home = { slug: "existing-business", access: "ready" };
    await expect(callback()).rejects.toThrow("REDIRECT:/existing-business");
  });
  test("retired links and environment fallbacks cannot redirect to onboarding", () => {
    const files = ["app/auth/callback/page.tsx", "app/[tenant]/(app)/layout.tsx", "app/[tenant]/onboarding/page.tsx", "app/onboarding/page.tsx", "app/onboarding/layout.tsx", "app/c/[code]/actions.ts", "components/organisms/business-switcher.tsx", ".env.example", ".env.produccion"];
    for (const path of files) {
      const source = readFileSync(path, "utf8");
      expect(source, path).not.toMatch(/redirect\([^\n]*["'`]\/onboarding|href=["'`]\/onboarding|REDIRECT_URL=\/onboarding/);
    }
  });
});
