import { Skeleton } from "@/components/atoms/skeleton";

export type PageSkeletonVariant = "dashboard" | "table" | "detail" | "form" | "profile";

function HeaderSkeleton({ actions = true }: { actions?: boolean }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="grid w-full max-w-md gap-2.5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-64 max-w-[80%]" />
        <Skeleton className="h-3.5 w-80 max-w-full" />
      </div>
      {actions ? <Skeleton className="h-10 w-36" /> : null}
    </div>
  );
}

function KpiRowSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3.5 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="grid gap-3 rounded-lg border border-border bg-card p-4">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
  );
}

function TableSkeleton({ rows = 7 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex gap-6 border-b border-border px-4 py-3.5">
        {[28, 18, 14, 12].map((w, i) => (
          <Skeleton key={i} className="h-3" style={{ width: `${w}%` }} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0">
          <Skeleton className="size-[34px] shrink-0" />
          <div className="grid min-w-0 flex-1 gap-1.5">
            <Skeleton className="h-3.5" style={{ width: `${30 + ((i * 7) % 40)}%` }} />
            <Skeleton className="h-2.5 w-1/5" />
          </div>
          <Skeleton className="h-3.5 w-20" />
        </div>
      ))}
    </div>
  );
}

/**
 * Precarga de una pantalla mientras el servidor responde: la misma forma que
 * la vista real (encabezado, KPIs, filtros, tabla o detalle) con el brillo
 * que cruza en el ángulo de la N. Reemplaza la intro de la N al cambiar de
 * módulo: la intro grande queda solo para la entrada al negocio.
 */
export function PageSkeleton({
  variant = "table",
  label = "Cargando",
  kpis = true,
}: {
  variant?: PageSkeletonVariant;
  /** Texto para lectores de pantalla. */
  label?: string;
  /** Muestra la fila de KPIs (variante tabla). */
  kpis?: boolean;
}) {
  return (
    <div className="grid gap-5" role="status" aria-busy="true" aria-label={label}>
      {variant === "profile" ? (
        // Ficha 360°: cabecera con foto y acciones, resumen en tres columnas y pestañas.
        <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-card p-4 sm:p-5">
          <Skeleton className="size-16 shrink-0 rounded-full" />
          <div className="grid min-w-0 flex-1 gap-2.5">
            <Skeleton className="h-6 w-56 max-w-[70%]" />
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-28" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-28" />
            <Skeleton className="size-10" />
          </div>
        </div>
      ) : variant === "detail" ? (
        <div className="grid gap-2.5">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-8 w-72 max-w-[85%]" />
          <div className="flex gap-2">
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-7 w-24" />
          </div>
        </div>
      ) : (
        <HeaderSkeleton actions={variant !== "dashboard"} />
      )}

      {variant === "dashboard" ? (
        <>
          <KpiRowSkeleton />
          <div className="grid gap-3.5 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
            <div className="rounded-lg border border-border bg-card p-5">
              <Skeleton className="h-[220px] w-full" />
            </div>
            <div className="grid gap-3 rounded-lg border border-border bg-card p-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="size-9 shrink-0" />
                  <Skeleton className="h-3.5 flex-1" />
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}

      {variant === "table" ? (
        <>
          {kpis ? <KpiRowSkeleton /> : null}
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-10 w-full sm:w-80" />
            <Skeleton className="h-10 w-40" />
          </div>
          <TableSkeleton />
        </>
      ) : null}

      {variant === "detail" ? (
        <>
          <div className="flex gap-4 border-b border-border pb-2.5">
            {[90, 110, 90, 120, 100].map((w, i) => (
              <Skeleton key={i} className="h-3.5" style={{ width: w }} />
            ))}
          </div>
          <KpiRowSkeleton />
          <TableSkeleton rows={5} />
        </>
      ) : null}

      {variant === "profile" ? (
        <>
          <div className="grid gap-5 lg:grid-cols-3">
            <div className="grid gap-3 rounded-lg border border-border bg-card p-5 lg:col-span-2">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-2 w-full" />
              <Skeleton className="h-3 w-40" />
            </div>
            <div className="grid gap-3 rounded-lg border border-border bg-card p-5">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-7 w-36" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <div className="flex gap-4 border-b border-border pb-2.5">
            {[90, 110, 90, 120, 100].map((w, i) => (
              <Skeleton key={i} className="h-3.5" style={{ width: w }} />
            ))}
          </div>
          <TableSkeleton rows={5} />
        </>
      ) : null}

      {variant === "form" ? (
        <>
          <div className="flex gap-4 border-b border-border pb-2.5">
            {[110, 110, 70, 90].map((w, i) => (
              <Skeleton key={i} className="h-3.5" style={{ width: w }} />
            ))}
          </div>
          <div className="grid gap-4 rounded-lg border border-border bg-card p-5 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="grid gap-2">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
