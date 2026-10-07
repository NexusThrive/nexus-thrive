"use client";

import SearchInput from "@/app/components/tenant/search-input";
import FilterSelect from "@/app/components/tenant/filter-select";
import {
  VERTICAL_LABELS,
  VERTICALS,
  type VerticalValue,
} from "@/lib/admin-catalogs";

/**
 * Filtros del panel: la URL es la única fuente de verdad
 * (`q`, `vertical`, `status`; paginación en `page`).
 */
export default function TenantFilters({
  q,
  vertical,
  status,
}: {
  q: string;
  vertical?: VerticalValue;
  status?: "active" | "inactive";
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
      <SearchInput
        paramKey="q"
        pageParam="page"
        ariaLabel="Buscar negocios"
        placeholder="Buscar por nombre, slug o dominio…"
        defaultValue={q}
      />
      <FilterSelect
        paramKey="vertical"
        pageParam="page"
        allLabel="Todas las verticales"
        options={VERTICALS.map((value) => ({
          value,
          label: VERTICAL_LABELS[value],
        }))}
        value={vertical ?? ""}
      />
      <FilterSelect
        paramKey="status"
        pageParam="page"
        allLabel="Todos los estados"
        options={[
          { value: "active", label: "Activos" },
          { value: "inactive", label: "Suspendidos" },
        ]}
        value={status ?? ""}
      />
    </div>
  );
}
