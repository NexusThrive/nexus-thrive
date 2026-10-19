/**
 * Cookie de continuidad del beneficio (`nx_benefit`).
 *
 * Cuando alguien abre `/c/{code}` sin sesión (o sin negocio) guardamos el
 * código aquí y lo llevamos con él hasta el onboarding, donde se aplica.
 * Módulo de SERVIDOR (usa `next/headers` y `redeemBenefit`).
 */

import { cookies } from "next/headers";
import { normalizeBenefitCode } from "@/lib/benefits/benefits";
import {
  BENEFIT_COOKIE,
  getBenefitByCode,
  redeemBenefit,
  type RedeemResult,
} from "@/lib/benefits/benefits-db";
import type { OnboardingBenefit } from "@/lib/onboarding/types";

const MAX_AGE_SECONDS = 60 * 60 * 24 * 14;

export async function setBenefitCookie(code: string): Promise<void> {
  const store = await cookies();
  store.set(BENEFIT_COOKIE, normalizeBenefitCode(code), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function readBenefitCookie(): Promise<string> {
  const store = await cookies();
  return normalizeBenefitCode(store.get(BENEFIT_COOKIE)?.value ?? "");
}

export async function clearBenefitCookie(): Promise<void> {
  const store = await cookies();
  store.delete(BENEFIT_COOKIE);
}

/**
 * Acceso pendiente listo para mostrar en el onboarding (NO canjea). Devuelve
 * `null` si no hay cookie o si el código ya no está vigente (pausado, vencido,
 * agotado). Sirve para que el paso "Elige cómo empezar" muestre la tarjeta
 * del acceso ("N días gratis" si es promo, "cuenta activada" si es pagado).
 */
export async function getPendingBenefit(): Promise<OnboardingBenefit | null> {
  const code = await readBenefitCookie();
  if (!code) return null;
  const benefit = await getBenefitByCode(code);
  if (!benefit || benefit.status !== "active") return null;
  return {
    code,
    plan: benefit.plan as OnboardingBenefit["plan"],
    kind: benefit.kind,
    durationDays: benefit.durationDays,
  };
}

/**
 * Si hay un código pendiente en la cookie, lo canjea para el negocio dado y
 * limpia la cookie. Nunca lanza: el beneficio es un extra, jamás debe romper
 * la creación del negocio.
 */
export async function applyBenefitCookie(params: {
  tenantId: string;
  tenantName: string;
  clerkUserId?: string | null;
  email?: string | null;
}): Promise<RedeemResult | null> {
  const code = await readBenefitCookie();
  if (!code) return null;

  let result: RedeemResult;
  try {
    result = await redeemBenefit({ code, ...params });
  } catch {
    result = { ok: false, reason: "error", message: "No se pudo aplicar el beneficio." };
  }

  await clearBenefitCookie();
  return result;
}
