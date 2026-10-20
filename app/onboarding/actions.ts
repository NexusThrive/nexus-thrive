"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/prisma/db";
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
import type {
  AdaptiveOnboardingInput,
  ModuleValue,
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

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Reemplaza el set de módulos activos del tenant (selección exacta). */
async function syncModules(
  tx: DbTransaction,
  tenantId: string,
  selected: ModuleValue[],
): Promise<void> {
  const selectedSet = new Set<string>(selected);
  const existing = await tx.orm.public.TenantModule.where({ tenantId }).all();

  // Los que ya no están en la selección se desactivan (nunca se borran:
  // el historial de activación queda en la fila).
  for (const row of existing) {
    if (!selectedSet.has(row.moduleName)) {
      await tx.orm.public.TenantModule.where({ id: row.id }).update({
        active: false,
      });
    }
  }

  // Los seleccionados se aseguran activos (idempotente por unique).
  for (const moduleName of selected) {
    await tx.orm.public.TenantModule.upsert({
      create: { tenantId, moduleName },
      update: { active: true },
      conflictOn: { tenantId, moduleName },
    });
  }
}

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

  // 3) Modo resume: el tenant debe pertenecer al usuario ---------------
  if (values.tenantId) {
    const tenantId = values.tenantId;
    const tenant = await db.orm.public.Tenant.where({
      id: tenantId,
    }).first();
    if (!tenant) {
      return { status: "error", message: "El negocio ya no existe." };
    }

    const membership = await db.orm.public.User.where({
      clerkUserId: userId,
      tenantId,
    }).first();
    if (!membership) {
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
      const taken = await db.orm.public.Tenant.where({
        slug: values.slug,
      }).first();
      if (taken) {
        return {
          status: "error",
          message: "Revisa los campos marcados e inténtalo de nuevo.",
          errors: { slug: "Ese enlace ya está en uso." },
        };
      }
    }

    try {
      await db.transaction(async (tx) => {
        await tx.orm.public.Tenant.where({ id: tenantId }).update({
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
          ...planFields,
        });
        await syncModules(tx, tenantId, selectedModules);
      });
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
  // En el piloto, una cuenta de Clerk es un negocio: si ya tiene uno, no
  // puede crear otro (ni canjear el mismo código dos veces).
  const existingMembership = await db.orm.public.User.where({ clerkUserId: userId }).first();
  if (existingMembership?.tenantId) {
    const owned = await db.orm.public.Tenant.where({ id: existingMembership.tenantId }).first();
    if (owned?.onboardingCompleted) {
      return {
        status: "error",
        message: `Ya tienes un negocio en NEXUS (${owned.name}). Escríbenos si necesitas otro.`,
      };
    }
  }

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
  const taken = await db.orm.public.Tenant.where({
    slug: values.slug,
  }).first();
  if (taken) {
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
    await db.transaction(async (tx) => {
      const tenant = await tx.orm.public.Tenant.create({
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
        ...planFields,
      });

      await tx.orm.public.User.create({
        clerkUserId: userId,
        email: primaryEmail,
        name: displayName,
        role: "OWNER",
        tenantId: tenant.id,
      });

      await syncModules(tx, tenant.id, selectedModules);

      createdTenantId = tenant.id;
    });
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