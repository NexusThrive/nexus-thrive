import { clamp01, cn } from "@/lib/utils";
import { NMark } from "@/components/atoms/n-mark";
import { FocusText } from "@/components/atoms/focus-text";

/* --- 11 · Notificación de carga ------------------------------------------ */
export function LoadingToast({
  open,
  progress,
  label,
  doneLabel = "Exportado",
  className,
}: {
  open: boolean;
  progress: number;
  label: string;
  doneLabel?: string;
  className?: string;
}) {
  if (!open) return null;
  const pct = clamp01(progress);
  const done = pct >= 1;

  return (
    <div
      className={cn(
        "nx-toast fixed bottom-6 right-6 z-(--z-toast) flex min-w-[250px] items-center gap-3 overflow-hidden rounded-lg border border-border bg-surface px-4 py-3",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <NMark size={28} state={done ? "done" : "prog"} progress={pct} />
      <FocusText text={done ? doneLabel : label} className="text-sm text-foreground" />
      <span className="absolute inset-x-0 bottom-0 h-[3px] bg-border">
        <i
          className="block h-full bg-gold-600 transition-[width] duration-200"
          style={{
            width: `${pct * 100}%`,
            clipPath: "polygon(0 0,100% 0,calc(100% - 8px) 100%,0 100%)",
          }}
        />
      </span>
    </div>
  );
}
