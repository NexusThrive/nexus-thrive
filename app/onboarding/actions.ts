"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { db } from "@/prisma/db";
import { validateAdaptiveOnboarding } from "@/lib/onboarding/validation";
import { suggestSlug } from "@/lib/onboarding/slug";
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
 * - En éxito: revalidate + devuelve el slug; el cliente muestra la pantalla
 *   final y el CTA "Entrar a mi espacio NEXUS" navega a `/[slug]`.
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

export async function completeAdaptiveOnboardingAction(
  input: AdaptiveOnboardingInput,
): Promise<OnboardingActionResult> {
  // 1) Sesión (Clerk) ------------------------------------------------
  const { userId } = await auth();
  if (!userId) {
    return {
      status: "error",
      message: "Tu sesión expiró. Vuelve a entrar y continúa donde quedaste.",
    };
  }

  // 2) Validación estricta y normalización ---------------------------
  const result = validateAdaptiveOnboarding(input);
  if (!result.ok) {
    return {
      status: "error",
      message: "Revisa los campos marcados e inténtalo de nuevo.",
      errors: result.errors,
    };
  }
  const values = result.values;

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
      revalidatePath(`/${tenant.slug}`);
      return { status: "ok", slug: tenant.slug };
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
          onboardingCompleted: true,
        });
        await syncModules(tx, tenantId, values.selectedModules);
      });
    } catch {
      return {
        status: "error",
        message: "No se pudo guardar. Inténtalo de nuevo en un momento.",
      };
    }

    revalidatePath(`/${values.slug}`);
    revalidatePath("/");
    return { status: "ok", slug: values.slug };
  }

  // 4) Modo create: dispersión de identidad desde Clerk -----------------
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
        onboardingCompleted: true,
      });

      await tx.orm.public.User.create({
        clerkUserId: userId,
        email: primaryEmail,
        name: displayName,
        role: "OWNER",
        tenantId: tenant.id,
      });

      await syncModules(tx, tenant.id, values.selectedModules);
    });
  } catch {
    return {
      status: "error",
      message: "No se pudo crear tu espacio. Inténtalo de nuevo en un momento.",
    };
  }

  revalidatePath(`/${values.slug}`);
  revalidatePath("/");
  return { status: "ok", slug: values.slug };
}