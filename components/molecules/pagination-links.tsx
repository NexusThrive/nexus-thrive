"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { NLoader } from "@/components/atoms/n-loader";
import { buttonVariants } from "@/components/atoms/button-variants";

/**
 * Paginación genérica. `paramKey` es el parámetro de página de la sección
 * (`ppage`, `page`, …): al navegar conserva el resto de los filtros de la
 * URL y solo cambia esa página.
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
      <p className="text-xs text-muted-foreground">
        Página {page} de {totalPages} · {totalLabel}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1 || isPending}
          onClick={() => navigateToPage(page - 1)}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <ChevronLeft aria-hidden="true" className="h-4 w-4" />
          Anterior
        </button>
        <button
          type="button"
          disabled={page >= totalPages || isPending}
          onClick={() => navigateToPage(page + 1)}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          {isPending ? (
            <NLoader size={16} className="text-current" />
          ) : null}
          Siguiente
          <ChevronRight aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
