"use client";

import { useActionState, useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { NLoader } from "@/components/brand/n-loader";
import type {
  PaymentMethodValue,
  VerticalValue,
} from "@/lib/admin-catalogs";
import {
  completeOnboardingStepAction,
  type OnboardingFormState,
} from "../actions";
import type { OnboardingStep } from "../validators";
import OnboardingProgress from "./onboarding-progress";
import StepBusiness, { type StepDefaults } from "./step-business";
import StepVertical from "./step-vertical";
import StepEcosystem, { type EcosystemDefaults } from "./step-ecosystem";
import StepPayments from "./step-payments";
import StepStart from "./step-start";

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
    <div className="min-h-screen bg-background font-sans text-foreground">
      <main className="mx-auto flex w-full max-w-2xl flex-col px-4 py-10 sm:px-6">
        <header className="mb-8 text-center">
          <span className="inline-flex items-center rounded-full bg-accent-subtle px-3 py-1 text-xs font-semibold uppercase tracking-wide text-accent-text">
            NEXUS
          </span>
          <h1 className="mt-3 text-2xl font-bold text-foreground">
            Configura tu negocio
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cinco pasos y NEXUS queda listo para operar.
          </p>
        </header>

        <OnboardingProgress current={viewing} />

        {/* Un solo formulario: el paso visible envía sus inputs + el oculto `step` */}
        <form action={formAction} className="mt-8">
          <input type="hidden" name="tenantSlug" value={tenantSlug} />
          <input type="hidden" name="step" value={viewing} />

          <section
            aria-live="polite"
            className="rounded-lg border border-border bg-card p-5 shadow-xs sm:p-6"
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
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-medium text-muted-foreground transition hover:border-foreground/20 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Atrás
            </button>

            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-xs transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending && <NLoader size={16} className="text-current" />}
              {submitLabel}
            </button>
          </div>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Guardamos cada paso: puedes cerrar y continuar en cualquier momento.
        </p>
      </main>
    </div>
  );
}