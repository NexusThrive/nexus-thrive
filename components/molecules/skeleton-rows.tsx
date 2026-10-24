import { Skeleton } from "@/components/atoms/skeleton";
import { cn } from "@/lib/utils";

/**
 * Esqueleto de contenido que está por llegar dentro de un panel, una ficha o
 * una lista (no de la página entera: para eso `PageSkeleton`). Conserva la
 * forma de lo que viene, así no hay saltos al llegar los datos. Se anuncia una
 * vez a lectores de pantalla con `label` (qué se carga, en concreto).
 *
 * - `variant="rows"`: filas de texto (listas, archivos, composiciones).
 * - `variant="form"`: etiqueta + campo repetidos (fichas que cargan sus datos).
 *
 * Usar en vez de un texto suelto «Cargando…». Para una espera corta de una
 * sección sin forma conocida, `LoadingState` (la N de marca).
 */
export function SkeletonRows({
  rows = 3,
  variant = "rows",
  label = "Cargando",
  className,
}: {
  rows?: number;
  variant?: "rows" | "form";
  /** Qué se carga: se anuncia a lectores de pantalla. */
  label?: string;
  className?: string;
}) {
  const widths = ["w-full", "w-11/12", "w-4/5", "w-10/12", "w-3/4"];
  return (
    <div role="status" aria-live="polite" aria-busy="true" className={cn("grid gap-3", className)}>
      <span className="sr-only">{label}…</span>
      {Array.from({ length: rows }, (_, i) =>
        variant === "form" ? (
          <div key={i} className="grid gap-2" aria-hidden="true">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-[var(--control-h)] w-full rounded-md" />
          </div>
        ) : (
          <Skeleton key={i} aria-hidden="true" className={cn("h-4 rounded-sm", widths[i % widths.length])} />
        ),
      )}
    </div>
  );
}
