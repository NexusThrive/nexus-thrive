/**
 * Skeleton de `/admin` mientras la page (auth + métricas + listado)
 * resuelve en el servidor.
 */
export default function AdminLoading() {
  return (
    <div className="min-h-screen animate-pulse bg-slate-50">
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        {/* Encabezado */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="h-8 w-40 rounded-lg bg-slate-200" />
            <div className="mt-2 h-4 w-72 max-w-full rounded bg-slate-200" />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-8 w-24 rounded-full bg-slate-200" />
            <div className="h-10 w-36 rounded-lg bg-slate-200" />
          </div>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className="h-32 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="h-4 w-24 rounded bg-slate-200" />
              <div className="mt-3 h-8 w-16 rounded bg-slate-200" />
              <div className="mt-5 h-3 w-full rounded bg-slate-100" />
            </div>
          ))}
        </div>
        <div className="h-44 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="h-4 w-48 rounded bg-slate-200" />
          <div className="mt-5 space-y-3">
            <div className="h-3 w-full rounded bg-slate-100" />
            <div className="h-3 w-5/6 rounded bg-slate-100" />
            <div className="h-3 w-2/3 rounded bg-slate-100" />
            <div className="h-3 w-3/4 rounded bg-slate-100" />
          </div>
        </div>

        {/* Listado */}
        <div className="space-y-4">
          <div className="h-5 w-56 rounded bg-slate-200" />
          <div className="h-10 w-full max-w-xs rounded-lg bg-slate-200" />
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="h-10 border-b border-slate-200 bg-slate-50" />
            {[0, 1, 2, 3, 4].map((index) => (
              <div
                key={index}
                className="flex items-center gap-4 border-b border-slate-100 px-4 py-4 last:border-b-0"
              >
                <div className="h-9 w-9 rounded-full bg-slate-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-40 rounded bg-slate-200" />
                  <div className="h-3 w-28 rounded bg-slate-100" />
                </div>
                <div className="hidden h-5 w-20 rounded-full bg-slate-100 sm:block" />
                <div className="hidden h-5 w-24 rounded-full bg-slate-100 sm:block" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
