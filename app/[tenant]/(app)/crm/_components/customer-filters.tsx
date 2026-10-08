"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useVerticalTerms } from "../../vertical-terms-context";

export type CustomerStatus = "active" | "archived";
export type CustomerSort = "recent" | "name_asc" | "name_desc";

const STATUS_OPTIONS: { value: CustomerStatus; label: string }[] = [
  { value: "active", label: "Activos" },
  { value: "archived", label: "Archivados" },
];

const SORT_OPTIONS: { value: CustomerSort; label: string }[] = [
  { value: "recent", label: "Más recientes" },
  { value: "name_asc", label: "Nombre (A–Z)" },
  { value: "name_desc", label: "Nombre (Z–A)" },
];

/**
 * Filtros de estado y orden — actualizan la URL de inmediato (sin debounce)
 * para que la página RSC reconsulte.
 */
export default function CustomerFilters({
  status,
  sort,
}: {
  status: CustomerStatus;
  sort: CustomerSort;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const terms = useVerticalTerms();

  const updateParams = (mutate: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    params.delete("page"); // los filtros reinician la paginación
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div
        role="group"
        aria-label="Filtrar por estado"
        className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5"
      >
        {STATUS_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={status === option.value}
            onClick={() =>
              status !== option.value &&
              updateParams((params) => params.set("status", option.value))
            }
            className={
              status === option.value
                ? "rounded-[6px] bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm"
                : "rounded-[6px] px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
            }
          >
            {option.label}
          </button>
        ))}
      </div>

      <label className="sr-only" htmlFor="customer-sort">
        {`Ordenar ${terms.customers.toLowerCase()}`}
      </label>
      <select
        id="customer-sort"
        value={sort}
        onChange={(event) => {
          const next = event.target.value as CustomerSort;
          if (next !== sort) {
            updateParams((params) => params.set("sort", next));
          }
        }}
        className="h-9 cursor-pointer rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition hover:border-slate-300 focus:border-indigo-400 focus:outline-2 focus:outline-indigo-500/30"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
