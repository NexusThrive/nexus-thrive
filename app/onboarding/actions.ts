"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { completeExistingTenant, createTenantWithOwner, onboardingMembership, onboardingTenant, slugInUse } from "@/lib/onboarding/onboarding-db";
import { validateAdaptiveOnboarding } from "@/lib/onboarding/validation";
import { suggestSlug } from "@/lib/onboarding/slug";
import { quote as quotePlan } from "@/lib/plans/pricing";
import { loadPricingConfig } from "@/lib/plans/settings";
import {
  applyBenefitCookie,
  clearBenefitCookie,
  setBenefitCookie,
} from "@/lib/benefits/benefit-cookie";
import { getBenefitByCode } from "@/lib/benefits/benefits-db";
import { normalizeBenefitCode, type BenefitKind } from "@/lib/benefits/benefits";
import { SHOW_PRICING } from "@/lib/onboarding/flags";
import { allowAttempt, recordAttempt } from "@/lib/rate-limit";
import type { PlanKey, Billing } from "@/lib/plans/catalog";
import { resolveModules } from "@/lib/plans/pricing";
import { can } from "@/lib/business/permissions";
import type {
  AdaptiveOnboardingInput,
  OnboardingActionResult,
} from "@/lib/onboarding/types";

/**
 * Acción ÚNICA de finalización del onboarding adaptativo.
 *
 * Modo `create` (sin `tenantId`): crea Tenant + User OWNER + módulos en UNA
 * transacción. Modo `resume` (con `tenantId`): actualiza el tenant al que el
 * usuario ya pertenece, sincroniza módulos y marca onboarding completado.
 *
 * Garantías:
 * - Validación SIEMPRE en el servidor (nunca se confía en el navegador).
 * - Idempotente: reintentos/doble click no crean duplicados (módulos via
 *   upsert sobre [tenantId, moduleName]; tenant via @unique en slug).
 * - Mensajes legibles; los errores de Prisma/DB JAMÁS llegan al usuario.
 * - En éxito devuelve el slug SIN revalidar: revalidar re-renderizaría
 *   /onboarding, que ya ve el negocio completo y redirige, cortando la
 *   cinemática. El cliente entra con una recarga completa (las rutas del
 *   negocio son dinámicas, no hay caché que invalidar).
 */

/**
 * Si hay un código pendiente en la cookie (tarjeta NFC/QR o tecleado en el
 * onboarding), lo canjea para el negocio dado y limpia la cookie. Nunca
 * lanza: el acceso es un extra, jamás debe romper la creación del negocio.
 * Si el canje falla (código agotado, carrera), el negocio se queda en el plan
 * gratuito: nunca se queda con un plan que nadie pagó.
 */
async function benefitPatch(params: {
  tenantId: string;
  tenantName: string;
  clerkUserId?: string | null;
  email?: string | null;
}): Promise<{ benefit?: { plan: string; kind: BenefitKind; endsAt: string } }> {
  const result = await applyBenefitCookie(params);
  if (result?.ok) {
    return { benefit: { plan: result.plan, kind: result.kind, endsAt: result.endsAt } };
  }
  return {};
}

/**
 * Valida un código de acceso tecleado en el onboarding (mismo sistema que las
 * tarjetas: `BenefitCode`). Si está vigente, deja la cookie `nx_benefit` para
 * que se canjee al crear el negocio y devuelve el plan/duración/tipo a la UI.
 * No canjea todavía: el plan definitivo lo fija el servidor en la creación.
 */
export type AccessCodeResult =
  | { ok: true; code: string; plan: PlanKey; kind: BenefitKind; durationDays: number }
  | { ok: false; message: string };

export async function claimAccessCodeAction(
  raw: string,
): Promise<AccessCodeResult> {
  const { userId } = await auth();
  if (!userId) {
    return { ok: false, message: "Tu sesión expiró. Vuelve a entrar." };
  }

  // Freno a la fuerza bruta de códigos: pocos intentos por usuario.
  if (!allowAttempt(`access-code:${userId}`)) {
    return {
      ok: false,
      message: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.",
    };
  }
  recordAttempt(`access-code:${userId}`);

  const code = normalizeBenefitCode(raw);
  if (!code) {
    return { ok: false, message: "Escribe el código de tu tarjeta." };
  }

  const benefit = await getBenefitByCode(code);
  if (!benefit) {
    return { ok: false, message: "No encontramos ese código." };
  }
  if (benefit.status !== "active") {
    return { ok: false, message: benefit.message };
  }

  await setBenefitCookie(code);
  return {
    ok: true,
    code,
    plan: benefit.plan as PlanKey,
    kind: benefit.kind,
    durationDays: benefit.durationDays,
  };
}

/** Descarta el código pendiente (p. ej. si el usuario prefiere probar gratis). */
export async function clearAccessCodeAction(): Promise<void> {
  const { userId } = await auth();
  if (!userId) return;
  await clearBenefitCookie();
}

export async function completeAdaptiveOnboardingAction(
  input: AdaptiveOnboardingInput,
): Promise<OnboardingActionResult> {  // 1) Sesión (Clerk) ------------------------------------------------
  const { userId } = await auth();
  if (!userId) {
    return {
      status: "error",
      message: "Tu sesión expiró. Vuelve a entrar y continúa donde quedaste.",
    };
  }

  // 2) Validación estricta y normalización ---------------------------
  // Catálogo vigente (Operations Center): rubros, módulos, planes y tramos.
  const pricing = await loadPricingConfig();
  const result = validateAdaptiveOnboarding(input, pricing);
  if (!result.ok) {
    return {
      status: "error",
      message: "Revisa los campos marcados e inténtalo de nuevo.",
      errors: result.errors,
    };
  }
  const values = result.values;

  // Plan y módulos: en el piloto los decide el SERVIDOR, nunca el navegador.
  // Sin precios visibles, el plan solo puede venir de un acceso válido
  // (código promo o de pago); si no hay, el negocio nace en Essential. El
  // canje del código (si lo hay) es lo que sube el plan después.
  const pilot = !SHOW_PRICING;
  const plan: PlanKey = pilot ? "ESSENTIAL" : (values.plan ?? "ESSENTIAL");
  const billing: Billing = pilot ? "MONTHLY" : (values.billing ?? "MONTHLY");
  const selectedModules = pilot
    ? resolveModules(pricing, plan, values.vertical, values.selectedModules)
    : values.selectedModules;
  const quote = quotePlan(pricing, {
    plan,
    vertical: values.vertical,
    billing,
    selected: selectedModules,
    tierId: values.customerTierId ?? null,
  });
  const planFields = {
    plan,
    customerTierId: quote.tierId,
    contractedModules: quote.modules,
    billingCycle: billing,
    planMonthlyUsdCents: pilot ? 0 : quote.monthlyCents,
    planSelectedAt: Temporal.Instant.fromEpochMilliseconds(Date.now()),
  };
  const profile = {
    name: values.name,
    slug: values.slug,
    vertical: values.vertical,
    city: values.city,
    tenantType: values.tenantType,
    legalName: values.legalName,
    taxId: values.taxId,
    teamSize: values.teamSize,
    address: values.address,
    latitude: values.latitude,
    longitude: values.longitude,
    placeId: values.placeId,
    onboardingCompleted: true,
  };

  // 3) Modo resume: el tenant debe pertenecer al usuario ---------------
  if (values.tenantId) {
    const tenantId = values.tenantId;
    const tenant = await onboardingTenant(tenantId);
    if (!tenant) {
      return { status: "error", message: "El negocio ya no existe." };
    }

    const membership = await onboardingMembership(userId, tenantId);
    // Configurar plan, módulos y enlace es del dueño activo (SEC-05).
    if (!membership || !membership.active || !can(membership.role, "business.setup")) {
      return {
        status: "error",
        message: "No tienes acceso a este negocio.",
      };
    }

    // Si ya estaba completo: idempotente, simplemente entra.
    if (tenant.onboardingCompleted) {
      return {
        status: "ok",
        slug: tenant.slug,
        plan: tenant.plan,
        ...(await benefitPatch({
          tenantId,
          tenantName: tenant.name,
          clerkUserId: userId,
        })),
      };
    }

    // Disponibilidad del slug si va a cambiar (sin contar el propio tenant).
    if (values.slug !== tenant.slug) {
      if (await slugInUse(values.slug)) {
        return {
          status: "error",
          message: "Revisa los campos marcados e inténtalo de nuevo.",
          errors: { slug: "Ese enlace ya está en uso." },
        };
      }
    }

    try {
      await completeExistingTenant(tenantId, { ...profile, ...planFields }, selectedModules);
    } catch {
      return {
        status: "error",
        message: "No se pudo guardar. Inténtalo de nuevo en un momento.",
      };
    }

    const benefit = await benefitPatch({
      tenantId,
      tenantName: values.name,
      clerkUserId: userId,
    });
    return {
      status: "ok",
      slug: values.slug,
      // Si hubo canje, el plan real es el del código (el Essential de partida
      // se sube en el canje); si no, el plan con el que se creó.
      plan: (benefit.benefit?.plan as PlanKey | undefined) ?? plan,
      ...benefit,
    };
  }

  // 4) Modo create: dispersión de identidad desde Clerk -----------------
  // Una cuenta puede tener varias organizaciones (membresías independientes):
  // crear otra no toca las que ya tiene. Cada una nace con su dueño, equipo y plan.

  const clerkUser = await currentUser();
  const primaryEmail =
    clerkUser?.primaryEmailAddress?.emailAddress ??
    clerkUser?.emailAddresses?.[0]?.emailAddress ??
    "";
  const displayName =
    `${clerkUser?.firstName ?? ""} ${clerkUser?.lastName ?? ""}`.trim() ||
    "Usuario";

  // Disponibilidad del slug (carrera posible: el @unique del contract
  // es la última barrera; el catch convierte la colisión en mensaje).
  if (await slugInUse(values.slug)) {
    const suggestion = suggestSlug(values.name);
    return {
      status: "error",
      message: "Revisa los campos marcados e inténtalo de nuevo.",
      errors: {
        slug: suggestion
          ? `Ese enlace ya está en uso. Prueba con "${suggestion}".`
          : "Ese enlace ya está en uso. Prueba con otro.",
      },
    };
  }

  let createdTenantId = "";
  try {
    createdTenantId = await createTenantWithOwner(
      { ...profile, ...planFields },
      { clerkUserId: userId, email: primaryEmail, name: displayName },
      selectedModules,
    );
  } catch {
    return {
      status: "error",
      message: "No se pudo crear tu espacio. Inténtalo de nuevo en un momento.",
    };
  }

  const benefit = await benefitPatch({
    tenantId: createdTenantId,
    tenantName: values.name,
    clerkUserId: userId,
    email: primaryEmail,
  });
  return {
    status: "ok",
    slug: values.slug,
    plan: (benefit.benefit?.plan as PlanKey | undefined) ?? plan,
    ...benefit,
  };
}