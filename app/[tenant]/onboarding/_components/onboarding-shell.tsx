"use client";

import { useActionState, useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { NLoader } from "@/components/atoms/n-loader";
import type {
  PaymentMethodValue,
  VerticalValue,
} from "@/lib/admin-catalogs";
import {
  completeOnboardingStepAction,
  type OnboardingFormState,
} from "../actions";
import type { OnboardingStep } from "../validators";
import StepBusiness, { type StepDefaults } from "./step-business";
import StepVertical from "./step-vertical";
import StepEcosystem, { type EcosystemDefaults } from "./step-ecosystem";
import StepPayments from "./step-payments";
import StepStart from "./step-start";
import { buttonVariants } from "@/components/atoms/button-variants";
import { StepIndicator } from "@/components/molecules/step-indicator";
import { OnboardingLayout } from "@/components/templates/onboarding-layout";

const STEP_LABELS = ["Identidad", "Vertical", "Ecosistema", "Pagos", "Clientes"];

export type OnboardingInitial = StepDefaults &
  EcosystemDefaults & {
    vertical: VerticalValue;
    paymentMethods: PaymentMethodValue[];
  };

const initialState: OnboardingFormState = { status: "idle" };

/**
 * Orquestador del wizard (pantalla completa, sin el shell del negocio).
 *
 * - Un ÚNICO formulario: los inputs del paso visible llevan nombres fijos y
 *   el oculto `step` indica qué validar/persistir en el servidor.
 * - La acción devuelve `nextStep` tras guardar; este componente avanza
 *   SOLO cuando el servidor confirma un paso mayor al actual. con
 *   `useActionState` el estado NO vuelve a pasar por "pending" al
 *   re-enviar: se queda en el último valor hasta que la acción resuelve,
 *   por eso se compara `nextStep > paso actual` y no se detecta una
 *   "transición" de estado.
 * - Botón Atrás: 100% local (el dato ya guardado no se pierde; al
 *   re-enviar se sobrescribe).
 */
export default function OnboardingShell({
  tenantSlug,
  initial,
}: {
  tenantSlug: string;
  initial: OnboardingInitial;
}) {
  const [viewing, setViewing] = useState<OnboardingStep>(1);
  const [state, formAction, isPending] = useActionState(
    completeOnboardingStepAction,
    initialState,
  );

  useEffect(() => {
    if (state.status === "ok" && state.nextStep) {
      const id = window.setTimeout(() => {
        setViewing((current) =>
          state.nextStep && state.nextStep > current
            ? state.nextStep
            : current,
        );
      }, 0);
      return () => window.clearTimeout(id);
    }
  }, [state]);

  const isLastStep = viewing === 5;
  const submitLabel = isPending
    ? "Guardando…"
    : isLastStep
      ? "Completar Configuración y Entrar a NEXUS"
      : "Continuar";

  return (
    <OnboardingLayout
      width="max-w-2xl"
      eyebrow={`Paso ${viewing} de 5`}
      title="Configura tu negocio"
      description="Cinco pasos y NEXUS queda listo para operar."
      progress={<StepIndicator steps={STEP_LABELS} current={viewing} />}
      footer="Guardamos cada paso: puedes cerrar y continuar en cualquier momento."
    >

        {/* Un solo formulario: el paso visible envía sus inputs + el oculto `step` */}
        <form action={formAction} className="mt-6">
          <input type="hidden" name="tenantSlug" value={tenantSlug} />
          <input type="hidden" name="step" value={viewing} />

          <section
            aria-live="polite"
            className="rounded-lg border border-border bg-card p-5 sm:p-6"
          >
            {viewing === 1 && (
              <StepBusiness
                tenantSlug={tenantSlug}
                defaults={{
                  name: initial.name,
                  city: initial.city,
                  whatsappNumber: initial.whatsappNumber,
                }}
                state={state}
              />
            )}
            {viewing === 2 && (
              <StepVertical current={initial.vertical} state={state} />
            )}
            {viewing === 3 && (
              <StepEcosystem
                defaults={{
                  websiteUrl: initial.websiteUrl,
                  googleBusinessUrl: initial.googleBusinessUrl,
                  instagramHandle: initial.instagramHandle,
                }}
                state={state}
              />
            )}
            {viewing === 4 && (
              <StepPayments current={initial.paymentMethods} state={state} />
            )}
            {viewing === 5 && <StepStart state={state} />}
          </section>

          {state.status === "error" && state.message && (
            <p
              role="alert"
              className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {state.message}
            </p>
          )}

          <div className="mt-6 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() =>
                setViewing((value) =>
                  Math.max(1, value - 1) as OnboardingStep,
                )
              }
              disabled={viewing === 1 || isPending}
              className={buttonVariants({ variant: "outline" })}
            >
              <ArrowLeft className="h-4 w-4" />
              Atrás
            </button>

            <button
              type="submit"
              disabled={isPending}
              className={buttonVariants({ variant: isLastStep ? "accent" : "primary" })}
              data-mag={isLastStep ? "" : undefined}
            >
              {isPending && <NLoader size={16} className="text-current" />}
              {submitLabel}
            </button>
          </div>
        </form>

    </OnboardingLayout>
  );
}