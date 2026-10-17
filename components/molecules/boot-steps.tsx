import { cn } from "@/lib/utils";
import { NMark } from "@/components/atoms/n-mark";

/* --- 8 · Pasos de arranque ------------------------------------------------ */
export function BootSteps({
  steps,
  activeIndex,
  className,
}: {
  steps: string[];
  /** Índice de la etapa activa; las anteriores se muestran hechas. */
  activeIndex: number;
  className?: string;
}) {
  return (
    <ol
      className={cn("flex w-full flex-col gap-2.5", className)}
      role="status"
      aria-live="polite"
    >
      {steps.map((step, i) => {
        const done = i < activeIndex;
        const active = i === activeIndex;
        return (
          <li
            key={step}
            className={cn(
              "flex items-center gap-3 text-sm",
              done || active ? "text-foreground" : "text-muted-foreground",
            )}
          >
            <span className="grid size-5 shrink-0 place-items-center">
              {done ? (
                <NMark size={20} state="done" />
              ) : active ? (
                <NMark size={20} state="loop" />
              ) : (
                <span className="block size-2 border-[1.5px] border-muted-foreground" />
              )}
            </span>
            <span className="truncate">{step}</span>
          </li>
        );
      })}
    </ol>
  );
}
