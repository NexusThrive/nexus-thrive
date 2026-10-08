/** Skeleton del CRM mientras carga la página RSC (búsqueda/filtrado). */
export default function CrmLoading() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Cargando clientes">
      <header className="space-y-2">
        <div className="h-8 w-40 rounded-lg bg-slate-200/80" />
        <div className="h-4 w-72 max-w-full rounded bg-slate-100" />
      </header>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="h-10 w-full rounded-lg border border-slate-200 bg-slate-100 sm:max-w-xs" />
          <div className="h-9 w-40 rounded-lg border border-slate-200 bg-slate-100" />
          <div className="h-4 w-24 rounded bg-slate-100" />
        </div>
        <div className="h-10 w-36 rounded-lg bg-slate-200/80" />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
          <div className="h-4 w-2/3 max-w-md rounded bg-slate-200/80" />
        </div>
        <div className="divide-y divide-slate-100">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="flex items-center gap-3 px-4 py-4">
              <div className="h-9 w-9 shrink-0 rounded-full bg-slate-200/80" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-4 w-40 max-w-[60%] rounded bg-slate-200/80" />
                <div className="h-3 w-56 max-w-[80%] rounded bg-slate-100" />
              </div>
              <div className="hidden h-4 w-28 rounded bg-slate-100 sm:block" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
