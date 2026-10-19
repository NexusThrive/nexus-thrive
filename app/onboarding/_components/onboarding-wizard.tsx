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
  type OnboardingBenefit,
  type OnboardingDraft,
  type OnboardingPrefill,
} from "@/lib/onboarding/types";
import { SHOW_PRICING } from "@/lib/onboarding/flags";
import { MODULE_LABELS } from "@/lib/admin-catalogs";
import { modulePriceCents, planOf, quote as quotePlan, signupVerticals, type PricingConfig } from "@/lib/plans/pricing";
import type { PlanKey } from "@/lib/plans/catalog";
import { formatUsdCents } from "@/lib/plans/quote";
import ProfileSelection from "./profile-selection";
import AdaptiveBusinessForm from "./adaptive-business-form";
import { buttonVariants } from "@/components/atoms/button-variants";
import { Odometer } from "@/components/atoms/odometer";
import { Alert } from "@/components/molecules/alert";
import { IntroDots, IntroStory, INTRO_SLIDES } from "@/components/organisms/onboarding/intro-story";
import { OnboardingScene } from "@/components/organisms/onboarding/onboarding-scene";
import { PlanPicker } from "@/components/organisms/onboarding/plan-picker";
import { AccessStep } from "@/components/organisms/onboarding/access-step";
import { BenefitCard } from "@/components/organisms/onboarding/benefit-card";
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
export default function OnboardingWizard({
  prefill,
  firstName,
  config,
  pendingBenefit,
}: {
  prefill: OnboardingPrefill;
  firstName?: string;
  config: PricingConfig;
  pendingBenefit?: OnboardingBenefit | null;
}) {
  const firstStep: FlowStep = prefill.mode === "resume" ? "profile" : "intro";
  const [step, setStep] = useState<FlowStep>(firstStep);
  const [slide, setSlide] = useState(0);
  const [draft, setDraft] = useState<OnboardingDraft>(() => {
    const base = loadDraft(prefill);
    // Con un beneficio pendiente el plan lo define la tarjeta (mes gratis):
    // se fija de una vez para que el resto del flujo (review y servidor) lo refleje.
    return pendingBenefit ? { ...base, plan: pendingBenefit.plan, billing: "MONTHLY" } : base;
  });
  const [showErrors, setShowErrors] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cinematic, setCinematic] = useState<CinematicStatus | null>(null);
  const [slug, setSlug] = useState<string | null>(null);
  const [benefit, setBenefit] = useState<OnboardingBenefit | null>(pendingBenefit ?? null);
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
        latitude: draft.latitude,
        longitude: draft.longitude,
        placeId: draft.placeId,
        city: draft.city,
        selectedModules: draft.selectedModules,
        plan: draft.plan,
        billing: draft.billing,
        customerTierId: draft.customerTierId,
      }, config),
    [draft, prefill.tenantId, config],
  );

  const quote = draft.vertical
    ? quotePlan(config, { plan: draft.plan, vertical: draft.vertical, billing: draft.billing, selected: draft.selectedModules, tierId: draft.customerTierId })
    : null;
  const planName = planOf(config, draft.plan)?.name ?? draft.plan;
  const freePlanName = planOf(config, "ESSENTIAL")?.name ?? "Essential";
  /** Planes que se pueden contratar (sin precio: se coordina el pago). */
  const accessPlans = useMemo(
    () =>
      (["ELITE", "SIGNATURE"] as PlanKey[])
        .map((key) => {
          const plan = planOf(config, key);
          return plan ? { key, name: plan.name, tagline: plan.tagline } : null;
        })
        .filter((plan): plan is { key: PlanKey; name: string; tagline: string } => Boolean(plan)),
    [config],
  );

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

  /**
   * El código de acceso tecleado (o el de la tarjeta) fija el plan y el módulos
   * que verá en el resto del flujo. Al quitarlo se vuelve al plan gratis.
   */
  const applyBenefit = (next: OnboardingBenefit | null) => {
    setBenefit(next);
    patch({ plan: next ? next.plan : "ESSENTIAL", billing: "MONTHLY" });
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
        planName: step === "plan" || step === "confirm" ? planName : undefined,
        price: SHOW_PRICING
          ? pendingBenefit
            ? "0"
            : quote
              ? (quote.monthlyCents / 100).toFixed(quote.monthlyCents % 100 ? 2 : 0)
              : undefined
          : "0",
        modules:
          quote && (step === "plan" || step === "confirm")
            ? quote.modules.map((module) => {
                const cents =
                  SHOW_PRICING && draft.vertical
                    ? modulePriceCents(config, module, draft.vertical, draft.plan)
                    : 0;
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
        : step === "plan" && benefit
          ? benefit.kind === "PAID"
            ? "Activar mi cuenta"
            : "Activar mi mes gratis"
          : step === "plan" && draft.plan === "ESSENTIAL"
            ? "Continuar gratis"
            : "Continuar";

  const actions = (
    <>
      {step === "intro" ? (
        <IntroDots slide={slide} />
      ) : step === "plan" && SHOW_PRICING && quote && !benefit ? (
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
        description={
          step === "intro"
            ? introMeta.description
            : step === "plan" && benefit
              ? benefit.kind === "PAID"
                ? "Tu pago está confirmado. Activa tu cuenta al crear el negocio."
                : "Tu beneficio ya está listo. Actívalo al crear tu negocio: nada de tarjeta ni cobro."
              : meta.description
        }
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
            verticals={signupVerticals(config).map((v) => ({ value: v.vertical, label: v.label }))}
            draft={draft}
            onPatch={patch}
            errors={validation.ok ? {} : validation.errors}
            showErrors={showErrors}
          />
        ) : null}

        {step === "plan" && draft.vertical ? (
          SHOW_PRICING ? (
            pendingBenefit ? (
              <BenefitCard planName={planName} durationDays={pendingBenefit.durationDays} code={pendingBenefit.code} />
            ) : (
              <PlanPicker
                config={config}
                vertical={draft.vertical}
                value={{ plan: draft.plan, billing: draft.billing, selected: draft.selectedModules, tierId: draft.customerTierId }}
                onChange={({ plan, billing, selected, tierId }) => patch({ plan, billing, selectedModules: selected, customerTierId: tierId })}
              />
            )
          ) : (
            <AccessStep
              planName={planName}
              freePlanName={freePlanName}
              plans={accessPlans}
              businessName={draft.name.trim() || undefined}
              city={draft.city || undefined}
              benefit={benefit}
              onBenefit={applyBenefit}
            />
          )
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
                planName,
                billing: draft.billing,
                tierLabel: config.tiers.find((t) => t.id === quote.tierId)?.label,
                quote,
              }}
              teamSizeLabel={draft.tenantType === "COMPANY" && draft.teamSize ? TEAM_SIZE_LABELS[draft.teamSize] : undefined}
              benefit={benefit ? { planName, durationDays: benefit.durationDays, kind: benefit.kind } : undefined}
              showPricing={SHOW_PRICING}
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
          planName={planName}
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
