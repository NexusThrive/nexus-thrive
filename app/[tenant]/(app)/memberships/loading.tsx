import { Loader2 } from "lucide-react";

/** Carga del segmento /memberships: skeleton consistente con Finanzas. */
export default function MembershipsLoading() {
  return (
    <div className="space-y-8" role="status" aria-live="polite">
      <div className="flex flex-col gap-1">
        <div className="h-8 w-56 animate-pulse rounded-lg bg-slate-200/70" />
        <div className="h-4 w-72 animate-pulse rounded bg-slate-200/70" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-32 animate-pulse rounded-xl border border-slate-200 bg-white shadow-sm"
          />
        ))}
      </div>

      <div className="h-48 animate-pulse rounded-xl border border-slate-200 bg-white shadow-sm" />

      <div className="flex items-center justify-center gap-2 py-6 text-sm text-slate-400">
        <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
        Cargando membresías…
      </div>
    </div>
  );
}
