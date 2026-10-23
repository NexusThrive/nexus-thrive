"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { homeTenantFor } from "@/lib/tenant/membership";
import { normalizeBenefitCode } from "@/lib/benefits/benefits";
import { getBenefitByCode, redeemBenefit } from "@/lib/benefits/benefits-db";
import { setBenefitCookie } from "@/lib/benefits/benefit-cookie";

/**
 * Acciones públicas de la tarjeta NFC/QR (`/c/{code}`).
 *
 * - `claimBenefitAction`: sin sesión o sin negocio. Guarda el código en la
 *   cookie `nx_benefit` y lleva al usuario a crear cuenta/negocio; el
 *   onboarding lo aplica al terminar.
 * - `redeemBenefitAction`: usuario con negocio. Aplica el beneficio ya mismo.
 */

export async function claimBenefitAction(formData: FormData): Promise<void> {
  const code = normalizeBenefitCode(String(formData.get("code") ?? ""));
  if (!code) redirect("/");

  const benefit = await getBenefitByCode(code);
  if (!benefit || benefit.status !== "active") redirect(`/c/${code}`);

  await setBenefitCookie(code);

  const { userId } = await auth();
  redirect(userId ? "/onboarding" : "/sign-up");
}

export async function redeemBenefitAction(formData: FormData): Promise<void> {
  const code = normalizeBenefitCode(String(formData.get("code") ?? ""));
  if (!code) redirect("/");

  const { userId } = await auth();
  if (!userId) {
    await setBenefitCookie(code);
    redirect("/sign-up");
  }

  const home = await homeTenantFor(userId);
  const tenantId = home?.tenantId;
  if (!tenantId) {
    await setBenefitCookie(code);
    redirect("/onboarding");
  }

  const result = await redeemBenefit({
    code,
    tenantId,
    tenantName: home?.name ?? "Tu negocio",
    clerkUserId: userId,
  });

  redirect(`/c/${code}?estado=${result.ok ? "ok" : result.reason}`);
}
