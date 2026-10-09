import { Check } from "lucide-react";
import type { OnboardingStep } from "../validators";

const STEPS: { step: OnboardingStep; label: string }[] = [
  { step: 1, label: "Identidad" },
  { step: 2, label: "Vertical" },
  { step: 3, label: "Ecosistema" },
  { step: 4, label: "Pagos" },
  { step: 5, label: "Clientes" },
];

/** Barra de progreso del wizard (20% a 100%, una quinta parte por paso). */
export default function OnboardingProgress({
  current,
}: {
  current: OnboardingStep;
}) {
  const percent = current * 20;

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        {STEPS.map(({ step, label }) => {
          const done = step < current;
          const active = step === current;
          return (
            <div
              key={step}
              className="flex min-w-0 flex-1 flex-col items-center gap-1.5"
            >
              <span
                aria-hidden="true"
                className={`grid h-6 w-6 place-items-center rounded-full text-xs font-semibold transition ${
                  done
                    ? "bg-primary text-primary-foreground"
                    : active
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : step}
              </span>
              <span
                className={`truncate text-[11px] font-medium ${
                  active ? "text-accent-text" : "text-muted-foreground"
                }`}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
      <div
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progreso del onboarding"
        className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}