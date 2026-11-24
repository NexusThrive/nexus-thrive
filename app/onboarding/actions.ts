"use server";

import type { AdaptiveOnboardingInput, OnboardingActionResult } from "@/lib/core/tenancy/onboarding/types";
import type { PlanKey } from "@/lib/core/entitlements/catalog";
import type { BenefitKind } from "@/lib/platform/benefits/benefits";

const PRIVATE_ACCESS = "Los negocios se preparan por invitación. Contacta al equipo de NexusThrive.";
export type AccessCodeResult = { ok: true; code: string; plan: PlanKey; kind: BenefitKind; durationDays: number } | { ok: false; message: string };
export type SlugAvailability = { available: boolean; suggestion?: string };

/** Retired server entry points reject direct calls, including old browser bundles. */
export async function completeAdaptiveOnboardingAction(_input: AdaptiveOnboardingInput): Promise<OnboardingActionResult> {
  return { status: "error", message: PRIVATE_ACCESS };
}
export async function claimAccessCodeAction(_raw: string): Promise<AccessCodeResult> {
  return { ok: false, message: PRIVATE_ACCESS };
}
export async function clearAccessCodeAction(): Promise<void> {}
export async function checkSlugAvailabilityAction(_rawSlug: string, _tenantId?: string): Promise<SlugAvailability> {
  return { available: false };
}
