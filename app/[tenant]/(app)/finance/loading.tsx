import { Skeleton } from "@/components/atoms/skeleton";
import { NLoader } from "@/components/atoms/n-loader";

/** Carga del segmento /finance: skeleton de marca consistente con el CRM. */
export default function FinanceLoading() {
  return (
    <div className="space-y-8" role="status" aria-live="polite">
      <div className="flex flex-col gap-1">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="mt-2 h-4 w-72" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-32 rounded-lg" />
        ))}
      </div>

      <Skeleton className="h-48 rounded-lg" />

      <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
        <NLoader size={16} className="text-current" />
        Cargando finanzas…
      </div>
    </div>
  );
}