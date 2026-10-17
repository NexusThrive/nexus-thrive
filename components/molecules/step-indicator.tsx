import { cn } from "@/lib/utils";

/**
 * Progreso por pasos: una barra con el corte de la N por paso (oro hasta el
 * actual) y su nombre debajo. El paso actual se anuncia con `aria-current`.
 */
export function StepIndicator({
  steps,
  current,
  className,
}: {
  /** Nombres de los pasos, en orden. */
  steps: string[];
  /** Paso actual (1 = el primero). */
  current: number;
  className?: string;
}) {
  return (
    <ol aria-label="Progreso" className={cn("grid gap-2", className)} style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
      {steps.map((label, i) => {
        const step = i + 1;
        const done = step < current;
        const active = step === current;
        return (
          <li key={label} aria-current={active ? "step" : undefined} className="grid gap-1.5">
            <span
              aria-hidden="true"
              className={cn(
                "h-1 transition-colors duration-500 [clip-path:polygon(2px_0,100%_0,calc(100%-2px)_100%,0_100%)]",
                done || active ? "bg-accent" : "bg-border",
              )}
            />
            <span
              className={cn(
                "flex items-center gap-1.5 text-xs font-medium",
                active ? "text-foreground" : done ? "text-muted-foreground" : "text-muted-foreground/70",
              )}
            >
              <b className="font-mono text-[11px] font-semibold text-accent-text">{String(step).padStart(2, "0")}</b>
              <span className="truncate max-sm:hidden">{label}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
