import { Skeleton } from "@/components/ui/skeleton";

/** Skeleton del CRM mientras carga la página RSC (búsqueda/filtrado). */
export default function CrmLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Cargando clientes">
      <header className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="mt-2 h-4 w-72 max-w-full" />
      </header>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <Skeleton className="h-10 w-full sm:max-w-xs" />
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-xs">
        <div className="border-b border-border bg-muted px-4 py-3">
          <Skeleton className="h-4 w-2/3 max-w-md" />
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="flex items-center gap-3 px-4 py-4">
              <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-40 max-w-[60%]" />
                <Skeleton className="h-3 w-56 max-w-[80%]" />
              </div>
              <Skeleton className="hidden h-4 w-28 sm:block" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}