import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Progreso vertical para fondos oscuros (panel de marca del onboarding): cada
 * paso con su número en un círculo grande, el actual resaltado en oro con halo
 * y el nombre en grande, los hechos con check dorado y los pendientes legibles.
 * La línea que los une se llena en oro hasta el paso actual.
 */
export function StepRail({
  steps,
  current,
  className,
}: {
  steps: readonly string[];
  /** 1 = el primero; 0 = ninguno empezado. */
  current: number;
  className?: string;
}) {
  const fill = steps.length > 1 ? Math.max(0, Math.min(1, (current - 1) / (steps.length - 1))) : 0;
  return (
    <div className={cn("grid gap-4", className)}>
      <p className="font-mono text-2xs font-semibold uppercase tracking-[0.18em] text-white/60">
        Paso {Math.max(current, 1)} de {steps.length}
      </p>
      <ol aria-label="Progreso" className="relative grid gap-6">
        <span aria-hidden="true" className="absolute bottom-4 left-[17px] top-4 w-0.5 rounded-full bg-white/20" />
        <span
          aria-hidden="true"
          className="absolute left-[17px] top-4 w-0.5 origin-top rounded-full bg-accent transition-[height] duration-700 ease-[var(--nx-ease-out)]"
          style={{ height: `calc((100% - 32px) * ${fill})` }}
        />
        {steps.map((label, i) => {
          const step = i + 1;
          const done = step < current;
          const active = step === current;
          return (
            <li key={label} aria-current={active ? "step" : undefined} className="relative flex items-center gap-4">
              <span
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-full border-2 font-mono text-ui font-bold transition-all duration-500",
                  done && "border-accent bg-accent text-ink",
                  active && "border-accent bg-ink text-accent shadow-[0_0_0_5px_rgba(212,175,55,.22)]",
                  !done && !active && "border-white/35 bg-ink text-white/70",
                )}
              >
                {done ? <Check aria-hidden="true" className="size-4" strokeWidth={3.5} /> : String(step).padStart(2, "0")}
                {done ? <span className="sr-only">Completado</span> : null}
              </span>
              <span
                className={cn(
                  "transition-colors duration-500",
                  active ? "text-base font-bold text-white" : done ? "text-ui font-semibold text-white/85" : "text-ui font-medium text-white/60",
                )}
              >
                {label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
