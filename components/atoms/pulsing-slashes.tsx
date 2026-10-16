import { cn } from "@/lib/utils";

/* --- 10 · Cortes pulsantes ------------------------------------------------ */
export function PulsingSlashes({ className }: { className?: string }) {
  return (
    <span className={cn("nx-sl", className)} aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  );
}
