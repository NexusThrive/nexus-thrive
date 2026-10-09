import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton de `/admin` mientras la page (auth + métricas + listado +
 * actividad) resuelve en el servidor. Se renderiza dentro del `AdminShell`.
 */
export default function AdminLoading() {
  return (
    <div className="space-y-8">
      {/* Encabezado */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Skeleton className="h-8 w-52" />
          <Skeleton className="mt-2 h-4 w-72 max-w-full" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-36" />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-36 rounded-lg" />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Skeleton className="h-5 w-56" />
          <Skeleton className="h-10 w-full max-w-xl" />
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="h-10 border-b border-border bg-muted" />
            {[0, 1, 2, 3, 4].map((index) => (
              <div
                key={index}
                className="flex items-center gap-4 border-b border-border/70 px-4 py-4 last:border-b-0"
              >
                <Skeleton className="size-8 rounded-md" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-28" />
                </div>
                <Skeleton className="hidden h-5 w-20 rounded-sm sm:block" />
                <Skeleton className="hidden h-5 w-24 rounded-sm sm:block" />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-8">
          <Skeleton className="h-64 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
