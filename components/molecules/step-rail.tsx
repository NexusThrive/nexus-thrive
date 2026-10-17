import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Progreso vertical para fondos oscuros (panel de marca del onboarding): cada
 * paso con su número, el actual resaltado en oro y los hechos con check. La
 * línea que los une se llena en oro hasta el paso actual.
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
    <ol aria-label="Progreso" className={cn("relative grid gap-5", className)}>
      <span aria-hidden="true" className="absolute bottom-3 left-[13px] top-3 w-px bg-white/12" />
      <span
        aria-hidden="true"
        className="absolute left-[13px] top-3 w-px origin-top bg-accent transition-[height] duration-700 ease-[var(--nx-ease-out)]"
        style={{ height: `calc((100% - 24px) * ${fill})` }}
      />
      {steps.map((label, i) => {
        const step = i + 1;
        const done = step < current;
        const active = step === current;
        return (
          <li key={label} aria-current={active ? "step" : undefined} className="relative flex items-center gap-3.5">
            <span
              className={cn(
                "grid size-[27px] shrink-0 place-items-center rounded-full border font-mono text-[11px] font-semibold transition-all duration-500",
                done && "border-accent bg-accent text-ink",
                active && "scale-110 border-accent bg-ink text-accent shadow-[0_0_0_4px_rgba(212,175,55,.16)]",
                !done && !active && "border-white/15 bg-ink text-white/40",
              )}
            >
              {done ? <Check aria-hidden="true" className="size-3.5" strokeWidth={3} /> : String(step).padStart(2, "0")}
            </span>
            <span
              className={cn(
                "text-[13.5px] font-medium transition-colors duration-500",
                active ? "text-white" : done ? "text-white/70" : "text-white/40",
              )}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
