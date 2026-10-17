import { cn } from "@/lib/utils";

/* Barra indeterminada de 2 px (franja oro que recorre la pista). */
export function IndeterminateBar({ className }: { className?: string }) {
  return (
    <div
      className={cn("nx-strip", className)}
      role="progressbar"
      aria-label="Cargando"
    >
      <i className="nx-bar ind" />
    </div>
  );
}
