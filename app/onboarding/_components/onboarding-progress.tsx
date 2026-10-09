import { Check } from "lucide-react";
import type { OnboardingStep } from "@/lib/onboarding/types";
import { cn } from "@/lib/utils";

export const ONBOARDING_STEP_LABELS: Record<OnboardingStep, string> = {
  1: "Perfil",
  2: "Información",
  3: "Módulos",
  4: "Finalización",
};

export const ONBOARDING_STEP_TITLES: Record<OnboardingStep, string> = {
  1: "¿Cómo trabajas hoy?",
  2: "Cuéntanos de tu negocio",
  3: "Elige tus módulos",
  4: "Revisa y finaliza",
};

/** Indicador de progreso (Perfil → Información → Módulos → Finalización). */
export default function OnboardingProgress({
  current,
}: {
  current: OnboardingStep;
}) {
  return (
    <ol
      aria-label="Progreso del onboarding"
      className="flex items-center gap-2 sm:gap-3"
    >
      {([1, 2, 3, 4] as const).map((step) => {
        const isActive = step === current;
        const isDone = step < current;
        return (
          <li key={step} className="flex flex-1 items-center gap-2 sm:gap-3">
            <div className="flex flex-1 flex-col items-center gap-1.5 sm:flex-row sm:gap-2.5">
              <span
                aria-current={isActive ? "step" : undefined}
                className={cn(
                  "grid size-8 shrink-0 place-items-center rounded-full text-xs font-semibold transition",
                  isDone &&
                    "bg-gold-500 text-ink ring-4 ring-gold-500/20",
                  isActive &&
                    "bg-gold-500 text-ink ring-4 ring-gold-500/20",
                  !isDone &&
                    !isActive &&
                    "border border-border bg-card text-muted-foreground",
                )}
              >
                {isDone ? (
                  <Check className="size-4" aria-hidden="true" />
                ) : (
                  step
                )}
              </span>
              <span
                className={cn(
                  "hidden text-xs font-medium sm:block",
                  isActive || isDone ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {ONBOARDING_STEP_LABELS[step]}
              </span>
            </div>
            {step < 4 && (
              <span
                aria-hidden="true"
                className={cn(
                  "h-px flex-1 rounded-full",
                  isDone ? "bg-gold-500" : "bg-border",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}