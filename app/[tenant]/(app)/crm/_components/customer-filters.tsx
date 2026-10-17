"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useVerticalTerms } from "../../vertical-terms-context";
import { fieldClasses } from "@/components/atoms/input";
import { cn } from "@/lib/utils";
import { SegmentedControl } from "@/components/molecules/segmented-control";

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
      <SegmentedControl
        ariaLabel="Filtrar por estado"
        value={status}
        options={STATUS_OPTIONS}
        onChange={(next) => {
          if (next !== status) updateParams((params) => params.set("status", next));
        }}
      />

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
        className={cn(fieldClasses, "h-[var(--control-h)] w-auto cursor-pointer")}
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
