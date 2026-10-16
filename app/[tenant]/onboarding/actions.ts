"use server";

import { requireTenantContext as requireSharedTenantContext } from "@/lib/tenant-context";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/prisma/db";
import { createTenantDb } from "@/lib/tenant-db";
import {
  validateCustomers,
  validateStep1,
  validateStep2,
  validateStep3,
  validateStep4,
  type OnboardingFieldErrors,
  type OnboardingStep,
} from "./validators";

export type OnboardingFormState = {
  status: "idle" | "error" | "ok";
  message?: string;
  errors?: OnboardingFieldErrors;
  /** Paso persistido con éxito en el servidor (guía la transición local). */
  savedStep?: OnboardingStep;
  nextStep?: OnboardingStep;
};

type TenantDb = ReturnType<typeof createTenantDb>;

const ACCESS_DENIED: OnboardingFormState = {
  status: "error",
  message: "No tienes acceso a este negocio.",
};

/**
 * Resuelve el tenant activo y la membresía del usuario (igual que el layout
 * `[tenant]`): sesión Clerk + tenant activo + usuario local vinculado.
 * Devuelve `null` fuera de miembros para que la acción nunca escriba.
 */
async function requireTenantDb(
  tenantSlug: string,
): Promise<{ tenantDb: TenantDb; tenantId: string } | null> {
  const context = await requireSharedTenantContext(tenantSlug);
  if (!context) {
    return null;
  }
  return { tenantDb: context.tenantDb, tenantId: context.tenantId };
}

function parseStep(raw: FormDataEntryValue | null): OnboardingStep | null {
  const n = Number(raw);
  return n >= 1 && n <= 5 ? (n as OnboardingStep) : null;
}

/**
 * Action ÚNICA del wizard: persiste un paso y devuelve el siguiente.
 * El avance visual lo decide el cliente (la action nunca mueve de paso:
 * solo confirma y devuelve `nextStep`).
 */
export async function completeOnboardingStepAction(
  _prev: OnboardingFormState,
  formData: FormData,
): Promise<OnboardingFormState> {
  const tenantSlug = String(formData.get("tenantSlug") ?? "");
  const step = parseStep(formData.get("step"));

  const context = await requireTenantDb(tenantSlug);
  if (!context) {
    return ACCESS_DENIED;
  }

  if (!step) {
    return { status: "error", message: "Paso no válido." };
  }

  const { tenantDb } = context;

  switch (step) {
    case 1: {
      const result = validateStep1(formData);
      if (!result.ok) {
        return { status: "error", errors: result.errors };
      }
      await tenantDb.onboarding.saveIdentity(result.values);
      return { status: "ok", savedStep: 1, nextStep: 2 };
    }

    case 2: {
      const result = validateStep2(formData);
      if (!result.ok) {
        return { status: "error", errors: result.errors };
      }
      // Vertical + módulos por defecto (idempotente); el resumen del
      // siguiente paso se lee del catálogo, no del navegador.
      await tenantDb.onboarding.setVertical(result.values.vertical);
      await tenantDb.onboarding.activateModules(result.values.vertical);
      return { status: "ok", savedStep: 2, nextStep: 3 };
    }

    case 3: {
      const result = validateStep3(formData);
      if (!result.ok) {
        return { status: "error", errors: result.errors };
      }
      await tenantDb.onboarding.saveEcosystem(result.values);
      return { status: "ok", savedStep: 3, nextStep: 4 };
    }

    case 4: {
      const result = validateStep4(formData);
      if (!result.ok) {
        return { status: "error", errors: result.errors };
      }
      await tenantDb.onboarding.setPaymentMethods(result.values.paymentMethods);
      return { status: "ok", savedStep: 4, nextStep: 5 };
    }

    case 5: {
      const result = validateCustomers(formData);
      if (!result.ok) {
        return { status: "error", errors: result.errors };
      }

      // Invariante de finalización: sin métodos de pago configurados no se
      // puede completar (decidido en el servidor, nunca por el navegador).
      const tenantRecord = await db.orm.public.Tenant.where({
        id: context.tenantId,
      }).first();
      if (
        !tenantRecord ||
        !tenantRecord.paymentMethods ||
        tenantRecord.paymentMethods.length === 0
      ) {
        return {
          status: "error",
          message: "Completa el paso de métodos de pago antes de terminar.",
        };
      }

      const outcome = await tenantDb.onboarding.complete({
        customers: result.values.customers,
      });

      revalidatePath(`/${tenantSlug}/onboarding`);
      revalidatePath(`/${tenantSlug}`);
      revalidatePath(`/${tenantSlug}/crm`);

      // redirect() lanza internamente; el retorno posterior es inalcanzable
      // pero necesario para que el type-check del switch sea válido.
      redirect(`/${tenantSlug}`);
      return {
        status: "ok",
        message: `Listo (${outcome.createdCustomers} clientes iniciales).`,
        savedStep: 5,
        nextStep: 5,
      };
    }

    default:
      return { status: "error", message: "Paso no soportado." };
  }
}