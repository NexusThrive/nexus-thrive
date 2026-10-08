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
                    "bg-amber-500 text-white ring-4 ring-amber-500/20",
                  isActive &&
                    "bg-amber-500 text-white ring-4 ring-amber-500/20",
                  !isDone &&
                    !isActive &&
                    "border border-slate-300 bg-white text-slate-500",
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
                  isActive || isDone ? "text-slate-900" : "text-slate-500",
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
                  isDone ? "bg-amber-400" : "bg-slate-200",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}