"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

/**
 * Paginación genérica de Finanzas. Conserva el resto de los filtros de la
 * URL y solo cambia el parámetro de página de su sección (`ppage`/`gpage`).
 */
export default function PaginationLinks({
  paramKey,
  page,
  totalPages,
  totalLabel,
}: {
  paramKey: string;
  page: number;
  totalPages: number;
  totalLabel: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const navigateToPage = (nextPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(paramKey, String(nextPage));
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  };

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
      <p className="text-xs text-slate-500">
        Página {page} de {totalPages} · {totalLabel}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1 || isPending}
          onClick={() => navigateToPage(page - 1)}
          className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ChevronLeft aria-hidden="true" className="h-4 w-4" />
          Anterior
        </button>
        <button
          type="button"
          disabled={page >= totalPages || isPending}
          onClick={() => navigateToPage(page + 1)}
          className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
          ) : null}
          Siguiente
          <ChevronRight aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}