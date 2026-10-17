"use client";

import { useMemo, useState, useTransition } from "react";
import { ArrowRight } from "lucide-react";
import { completeAdaptiveOnboardingAction } from "../actions";
import { validateAdaptiveOnboarding } from "@/lib/onboarding/validation";
import { FLOW_META, PROGRESS_STEPS, nextStep, previousStep, progressIndex, type FlowStep } from "@/lib/onboarding/flow";
import {
  EMPTY_DRAFT,
  TEAM_SIZE_LABELS,
  type AdaptiveOnboardingInput,
  type OnboardingDraft,
  type OnboardingPrefill,
} from "@/lib/onboarding/types";
import { MODULE_LABELS } from "@/lib/admin-catalogs";
import { PLANS } from "@/lib/plans/catalog";
import { formatUsdCents, moduleMonthlyCents, quotePlan } from "@/lib/plans/quote";
import ProfileSelection from "./profile-selection";
import AdaptiveBusinessForm from "./adaptive-business-form";
import { buttonVariants } from "@/components/atoms/button-variants";
import { Odometer } from "@/components/atoms/odometer";
import { Alert } from "@/components/molecules/alert";
import { IntroDots, IntroStory, INTRO_SLIDES } from "@/components/organisms/onboarding/intro-story";
import { OnboardingScene } from "@/components/organisms/onboarding/onboarding-scene";
import { PlanPicker } from "@/components/organisms/onboarding/plan-picker";
import { OnboardingReview } from "@/components/organisms/onboarding/onboarding-review";
import { CreationCinematic, type CinematicStatus } from "@/components/organisms/onboarding/creation-cinematic";
import { OnboardingSplit } from "@/components/templates/onboarding-split";
import { cn } from "@/lib/utils";

/** Duración mínima de "Creando negocio…" para que la cinemática se lea. */
const MIN_CINEMATIC_MS = 2600;

function storageKey(prefill: OnboardingPrefill): string {
  return prefill.tenantId ? `nexus:onboarding:draft:${prefill.tenantId}` : "nexus:onboarding:draft:new";
}

function loadDraft(prefill: OnboardingPrefill): OnboardingDraft {
  if (prefill.mode === "resume") return { ...EMPTY_DRAFT, ...prefill.draft };
  try {
    const raw = window.localStorage.getItem(storageKey(prefill));
    if (raw) return { ...EMPTY_DRAFT, ...(JSON.parse(raw) as Partial<OnboardingDraft>) };
  } catch {
    // almacenamiento corrupto/inaccesible: se empieza de cero
  }
  return { ...EMPTY_DRAFT };
}

/** Campos del paso "Tu negocio" (para volver a él si el servidor los rechaza). */
const BUSINESS_FIELDS = new Set(["name", "legalName", "taxId", "slug", "vertical", "teamSize", "address", "city"]);

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

/**
 * Orquestador del onboarding: presentación → perfil → negocio → plan y
 * módulos → confirmación → cinemática. El borrador se guarda en
 * localStorage (modo `create`); la validación es la misma del servidor y el
 * precio se recalcula en el servidor al crear.
 */
export default function OnboardingWizard({ prefill, firstName }: { prefill: OnboardingPrefill; firstName?: string }) {
  const firstStep: FlowStep = prefill.mode === "resume" ? "profile" : "intro";
  const [step, setStep] = useState<FlowStep>(firstStep);
  const [slide, setSlide] = useState(0);
  const [draft, setDraft] = useState<OnboardingDraft>(() => loadDraft(prefill));
  const [showErrors, setShowErrors] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cinematic, setCinematic] = useState<CinematicStatus | null>(null);
  const [slug, setSlug] = useState<string | null>(null);
  const [, startTransition] = useTransition();

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
        plan: draft.plan,
        billing: draft.billing,
      }),
    [draft, prefill.tenantId],
  );

  const quote = draft.vertical
    ? quotePlan({ plan: draft.plan, vertical: draft.vertical, billing: draft.billing, selected: draft.selectedModules })
    : null;

  // Siempre sobre el borrador más reciente: varios cambios en el mismo
  // instante (autocompletado del navegador) no se pisan entre sí.
  const patch = (partial: Partial<OnboardingDraft>) => {
    setDraft((prev) => {
      const next = { ...prev, ...partial };
      try {
        window.localStorage.setItem(storageKey(prefill), JSON.stringify(next));
      } catch {
        // sin almacenamiento: el flujo sigue en memoria
      }
      return next;
    });
  };

  const go = (to: FlowStep) => {
    setStep(to);
    setError(null);
    window.scrollTo({ top: 0 });
  };

  const goNext = () => {
    if (step === "intro") {
      if (slide < INTRO_SLIDES.length - 1) setSlide(slide + 1);
      else go("profile");
      return;
    }
    if (step === "profile" && !draft.tenantType) {
      setShowErrors(true);
      return;
    }
    if (step === "business") {
      setShowErrors(true);
      if (!validation.ok) return;
      setShowErrors(false);
    }
    go(nextStep(step));
  };

  const goBack = () => {
    if (step === "intro") {
      setSlide(Math.max(0, slide - 1));
      return;
    }
    if (step === "profile" && firstStep === "intro") {
      setSlide(INTRO_SLIDES.length - 1);
    }
    go(previousStep(step, firstStep));
  };

  const submit = () => {
    if (!validation.ok) {
      setShowErrors(true);
      go("business");
      return;
    }
    const v = validation.values;
    const input: AdaptiveOnboardingInput = { ...v, tenantId: prefill.tenantId };
    setError(null);
    setCinematic("creating");
    startTransition(async () => {
      const [result] = await Promise.all([completeAdaptiveOnboardingAction(input), sleep(MIN_CINEMATIC_MS)]);
      if (result.status === "ok") {
        try {
          window.localStorage.removeItem(storageKey(prefill));
        } catch {
          // nada que limpiar
        }
        setSlug(result.slug);
        setCinematic("ready");
        return;
      }
      setError(result.message);
      setCinematic("error");
      const field = result.errors ? Object.keys(result.errors)[0] : undefined;
      if (field && BUSINESS_FIELDS.has(field)) {
        setShowErrors(true);
        setStep("business");
      }
    });
  };

  const meta = FLOW_META[step];
  const introMeta = INTRO_SLIDES[slide];
  const greeting = firstName ? `Hola, ${firstName}` : undefined;

  const title =
    step === "intro"
      ? introMeta.title
      : step === "business" && draft.tenantType === "COMPANY"
        ? "Cuéntanos de tu empresa"
        : meta.title;

  const scene = (
    <OnboardingScene
      mode={step === "intro" ? "intro" : "preview"}
      introSlide={slide}
      preview={{
        name: draft.name,
        slug: validation.ok ? validation.values.slug : draft.slugRaw,
        vertical: draft.vertical,
        city: draft.city,
        tenantType: draft.tenantType,
        planName: step === "plan" || step === "confirm" ? PLANS[draft.plan].name : undefined,
        price: quote ? (quote.monthlyCents / 100).toFixed(quote.monthlyCents % 100 ? 2 : 0) : undefined,
        modules:
          quote && (step === "plan" || step === "confirm")
            ? quote.modules.map((module) => {
                const cents = draft.vertical ? moduleMonthlyCents(module, draft.vertical, draft.plan) : 0;
                return { module, price: cents ? formatUsdCents(cents) : "Incluido" };
              })
            : [],
      }}
    />
  );

  const primaryLabel =
    step === "intro"
      ? slide === INTRO_SLIDES.length - 1
        ? "Comenzar"
        : "Continuar"
      : step === "confirm"
        ? "Crear mi negocio"
        : step === "plan" && draft.plan === "ESSENTIAL"
          ? "Continuar gratis"
          : "Continuar";

  const actions = (
    <>
      {step === "intro" ? (
        <IntroDots slide={slide} />
      ) : step === "plan" && quote ? (
        <p className="flex items-baseline gap-1 lg:hidden">
          <Odometer value={(quote.monthlyCents / 100).toFixed(quote.monthlyCents % 100 ? 2 : 0)} prefix="$" className="font-display text-[22px] font-bold" />
          <span className="text-[12px] text-muted-foreground">/mes</span>
        </p>
      ) : null}
      <span className="flex-1" />
      <button
        type="button"
        onClick={step === "confirm" ? submit : goNext}
        data-mag=""
        disabled={cinematic === "creating"}
        className={cn(buttonVariants({ variant: step === "confirm" ? "accent" : "primary", size: "lg" }), "min-w-40 max-sm:flex-1")}
      >
        {primaryLabel}
        <ArrowRight aria-hidden="true" className="size-4" />
      </button>
    </>
  );

  return (
    <>
      <OnboardingSplit
        scene={scene}
        steps={PROGRESS_STEPS.map((s) => FLOW_META[s].label)}
        current={progressIndex(step)}
        stepKey={step === "intro" ? `intro-${slide}` : step}
        eyebrow={step === "intro" ? (slide === 0 && greeting ? greeting : introMeta.eyebrow) : step === "profile" ? greeting : undefined}
        title={title}
        description={step === "intro" ? introMeta.description : meta.description}
        onBack={step === firstStep && slide === 0 ? undefined : goBack}
        actions={actions}
      >
        {step === "intro" ? <IntroStory slide={slide} /> : null}

        {step === "profile" ? (
          <>
            <ProfileSelection value={draft.tenantType} onChange={(tenantType) => patch({ tenantType })} />
            {showErrors && !draft.tenantType ? (
              <p role="alert" className="mt-3 text-sm text-danger">
                Elige un perfil para continuar.
              </p>
            ) : null}
          </>
        ) : null}

        {step === "business" ? (
          <AdaptiveBusinessForm
            draft={draft}
            onPatch={patch}
            errors={validation.ok ? {} : validation.errors}
            showErrors={showErrors}
          />
        ) : null}

        {step === "plan" && draft.vertical ? (
          <PlanPicker
            vertical={draft.vertical}
            value={{ plan: draft.plan, billing: draft.billing, selected: draft.selectedModules }}
            onChange={({ plan, billing, selected }) => patch({ plan, billing, selectedModules: selected })}
          />
        ) : null}

        {step === "confirm" && quote ? (
          <>
            {error && cinematic !== "error" ? (
              <Alert tone="danger" className="mb-4">
                {error}
              </Alert>
            ) : null}
            <OnboardingReview
              data={{
                tenantType: draft.tenantType,
                name: draft.name,
                legalName: draft.tenantType === "COMPANY" ? draft.legalName : undefined,
                taxId: draft.taxId,
                slug: validation.ok ? validation.values.slug : draft.slugRaw,
                vertical: draft.vertical,
                address: draft.tenantType === "COMPANY" ? draft.address : undefined,
                city: draft.city,
                plan: draft.plan,
                billing: draft.billing,
                quote,
              }}
              teamSizeLabel={draft.tenantType === "COMPANY" && draft.teamSize ? TEAM_SIZE_LABELS[draft.teamSize] : undefined}
              onEdit={go}
            />
            <p className="mt-4 text-[12.5px] text-muted-foreground">
              Al crear tu negocio aceptas los términos de NEXUS THRIVE. {MODULE_LABELS.dashboard}, clientes y finanzas
              quedan activos desde el primer día.
            </p>
          </>
        ) : null}
      </OnboardingSplit>

      {cinematic ? (
        <CreationCinematic
          status={cinematic}
          planName={PLANS[draft.plan].name}
          businessName={draft.name.trim()}
          error={error ?? undefined}
          onBack={() => setCinematic(null)}
          onEnter={() => {
            // Recarga completa a propósito: la app arranca con su intro de la N.
            // eslint-disable-next-line @next/next/no-location-assign-relative-destination
            if (slug) window.location.assign(`/${slug}`);
          }}
        />
      ) : null}
    </>
  );
}
