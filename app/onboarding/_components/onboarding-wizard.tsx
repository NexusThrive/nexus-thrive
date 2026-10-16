"use client";

import { useMemo, useState, useTransition } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { NLoader } from "@/components/atoms/n-loader";
import { completeAdaptiveOnboardingAction } from "../actions";
import { validateAdaptiveOnboarding } from "@/lib/onboarding/validation";
import {
  EMPTY_DRAFT,
  type AdaptiveOnboardingInput,
  type OnboardingActionResult,
  type OnboardingDraft,
  type OnboardingPrefill,
  type OnboardingStep,
} from "@/lib/onboarding/types";
import OnboardingProgress, {
  ONBOARDING_STEP_TITLES,
} from "./onboarding-progress";
import ProfileSelection from "./profile-selection";
import AdaptiveBusinessForm from "./adaptive-business-form";
import ModuleSelection from "./module-selection";
import OnboardingSummary from "./onboarding-summary";
import OnboardingComplete from "./onboarding-complete";
import { buttonVariants } from "@/components/atoms/button-variants";

function storageKey(prefill: OnboardingPrefill): string {
  return prefill.tenantId
    ? `nexus:onboarding:draft:${prefill.tenantId}`
    : "nexus:onboarding:draft:new";
}

function loadDraft(prefill: OnboardingPrefill): OnboardingDraft {
  if (prefill.mode === "resume") {
    return prefill.draft;
  }
  try {
    const raw = window.localStorage.getItem(storageKey(prefill));
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<OnboardingDraft>;
      return { ...EMPTY_DRAFT, ...parsed };
    }
  } catch {
    // almacenamiento corrupto/inaccesible: se empieza de cero
  }
  return { ...EMPTY_DRAFT };
}

/** Errores de validación visibles para el paso 2 (formulario adaptativo). */
const STEP2_FIELDS = new Set([
  "name",
  "legalName",
  "taxId",
  "slug",
  "vertical",
  "teamSize",
  "address",
  "city",
]);

/**
 * Orquestador del onboarding adaptativo (4 pasos + pantalla final).
 *
 * - El borrador vive en React state y se persiste en localStorage (modo
 *   `create`): recargar o cerrar no pierde lo escrito.
 * - La validación usa EXACTAMENTE la misma función que el servidor
 *   (lib/onboarding/validation.ts); la acción re-valida al finalizar.
 * - El paso final llama a la Server Action; en éxito se limpia el borrador
 *   y se muestra la pantalla "Tu espacio NEXUS está listo".
 */
export default function OnboardingWizard({
  prefill,
}: {
  prefill: OnboardingPrefill;
}) {
  const [viewing, setViewing] = useState<OnboardingStep>(1);
  const [draft, setDraft] = useState<OnboardingDraft>(() =>
    loadDraft(prefill),
  );
  const [showErrors, setShowErrors] = useState(false);
  const [actionResult, setActionResult] =
    useState<OnboardingActionResult | null>(null);
  const [completedSlug, setCompletedSlug] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // La misma validación del servidor, en vivo (sin disponibilidad de slug).
  const validation = useMemo(
    () =>
      validateAdaptiveOnboarding({
        tenantId: prefill.tenantId,
        tenantType: draft.tenantType,
        name: draft.name,
        legalName: draft.legalName,
        taxId: draft.taxId,
        slug: draft.slugRaw,
        vertical: draft.vertical,
        teamSize: draft.teamSize,
        address: draft.address,
        city: draft.city,
        selectedModules: draft.selectedModules,
      }),
    [draft, prefill.tenantId],
  );

  const persist = (next: OnboardingDraft) => {
    setDraft(next);
    try {
      window.localStorage.setItem(storageKey(prefill), JSON.stringify(next));
    } catch {
      // sin almacenamiento: el wizard sigue funcionando en memoria
    }
  };

  const step2Valid = validation.ok;
  const step3Valid = (draft.selectedModules?.length ?? 0) > 0;

  const goNext = () => {
    if (viewing === 1 && !draft.tenantType) {
      setShowErrors(true);
      return;
    }
    if (viewing === 2) {
      setShowErrors(true);
      if (!step2Valid) return;
      setShowErrors(false);
    }
    if (viewing === 3 && !step3Valid) {
      return;
    }
    setViewing((value) => Math.min(4, value + 1) as OnboardingStep);
    setActionResult(null);
  };

  const goBack = () => {
    setViewing((value) => Math.max(1, value - 1) as OnboardingStep);
    setActionResult(null);
  };

  const submit = () => {
    if (!validation.ok) return;
    setActionResult(null);
    const input: AdaptiveOnboardingInput = {
      tenantId: prefill.tenantId,
      tenantType: validation.values.tenantType,
      name: validation.values.name,
      legalName: validation.values.legalName,
      taxId: validation.values.taxId,
      slug: validation.values.slug,
      vertical: validation.values.vertical,
      teamSize: validation.values.teamSize,
      address: validation.values.address,
      city: validation.values.city,
      selectedModules: validation.values.selectedModules,
    };

    startTransition(async () => {
      const result = await completeAdaptiveOnboardingAction(input);
      if (result.status === "ok") {
        try {
          window.localStorage.removeItem(storageKey(prefill));
        } catch {
          // sin almacenamiento: nada que limpiar
        }
        setCompletedSlug(result.slug);
        setViewing(4);
      } else {
        setActionResult(result);
        // Si el error es de un campo del formulario, vuelve a ese paso
        // con la validación visible (p. ej. "enlace ya en uso").
        if (result.errors) {
          const field = Object.keys(result.errors)[0];
          if (field && STEP2_FIELDS.has(field)) {
            setShowErrors(true);
            setViewing(2);
          } else if (field === "selectedModules") {
            setViewing(3);
          }
        }
      }
    });
  };

  const isSubmitting = isPending;

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <main className="mx-auto flex w-full max-w-3xl flex-col px-4 py-10 sm:px-6">
        <header className="mb-8 text-center">
          <span className="inline-flex items-center rounded-sm bg-gold-100 px-3 py-1 text-xs font-semibold tracking-wide text-gold-700 uppercase">
            NEXUS
          </span>
          <h1 className="mt-3 text-2xl font-bold text-foreground">
            {completedSlug
              ? "Listo"
              : prefill.mode === "resume"
                ? `Termina de configurar ${prefill.tenantName ?? "tu espacio"}`
                : "Crea tu espacio NEXUS"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {prefill.mode === "resume"
              ? "Cuatro pasos y tu negocio queda operando."
              : "Cuatro pasos: perfil, información, módulos y listo."}
          </p>
        </header>

        {!completedSlug && <OnboardingProgress current={viewing} />}

        <section
          aria-live="polite"
          className="mt-8 rounded-lg border border-border bg-card p-5 sm:p-6"
        >
          {completedSlug ? (
            <OnboardingComplete draft={draft} slug={completedSlug} />
          ) : (
            <>
              <h2 className="mb-5 text-base font-semibold text-foreground">
                {ONBOARDING_STEP_TITLES[viewing]}
              </h2>

              {viewing === 1 && (
                <>
                  <ProfileSelection
                    value={draft.tenantType}
                    onChange={(tenantType) =>
                      persist({ ...draft, tenantType })
                    }
                  />
                  {showErrors && !draft.tenantType && (
                    <p
                      role="alert"
                      className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
                    >
                      Elige un perfil para continuar.
                    </p>
                  )}
                </>
              )}

              {viewing === 2 && (
                <AdaptiveBusinessForm
                  draft={draft}
                  onChange={persist}
                  errors={validation.ok ? {} : validation.errors}
                  showErrors={showErrors}
                />
              )}

              {viewing === 3 && (
                <ModuleSelection draft={draft} onChange={persist} />
              )}

              {viewing === 4 && (
                <OnboardingSummary
                  prefill={prefill}
                  draft={draft}
                  actionResult={actionResult}
                  isPending={isSubmitting}
                  onSubmit={submit}
                />
              )}

              {viewing < 4 && (
                <div className="mt-6 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={goBack}
                    disabled={viewing === 1 || isSubmitting}
                    className={buttonVariants({ variant: "outline" })}
                  >
                    <ArrowLeft className="size-4" aria-hidden="true" />
                    Atrás
                  </button>

                  <button
                    type="button"
                    onClick={goNext}
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 rounded-lg bg-gold-500 px-4 py-2 text-sm font-semibold text-ink transition hover:bg-gold-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Continuar
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        {isSubmitting && (
          <p className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <NLoader size={14} className="text-current" />
            Guardando tu configuración…
          </p>
        )}
      </main>
    </div>
  );
}