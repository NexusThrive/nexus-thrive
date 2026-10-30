import { Skeleton } from "@/components/atoms/skeleton";

/** Precarga del recibo público: la forma del recibo (marca, cifra y detalle), no la intro de la N. */
export default function ReceiptLoading() {
  return (
    <main className="mx-auto grid min-h-screen w-full max-w-md content-start gap-5 px-4 py-10" role="status" aria-busy="true" aria-label="Cargando recibo">
      <Skeleton className="mx-auto h-6 w-32" />
      <div className="grid gap-4 rounded-lg border border-border bg-card p-6">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-9 w-48" />
        <div className="grid gap-3 border-t border-border pt-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex justify-between gap-4">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3.5 w-32" />
            </div>
          ))}
        </div>
        <Skeleton className="mx-auto size-32" />
      </div>
    </main>
  );
}
