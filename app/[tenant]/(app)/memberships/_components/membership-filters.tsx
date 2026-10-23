"use client";

import SearchInput from "@/components/molecules/search-input";
import FilterSelect from "@/components/molecules/filter-select";
import {
  MEMBERSHIP_STATUSES,
  MEMBERSHIP_TYPES,
  type MembershipStatusValue,
  type MembershipTypeValue,
} from "@/lib/business/memberships";

/**
 * Filtros del módulo: la URL es la única fuente de verdad
 * (`q`, `status`, `type`; paginación en `page`).
 */
export default function MembershipFilters({
  q,
  status,
  type,
}: {
  q: string;
  status?: MembershipStatusValue;
  type?: MembershipTypeValue;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
      <SearchInput
        paramKey="q"
        pageParam="page"
        ariaLabel="Buscar membresías"
        placeholder="Buscar por nombre, teléfono o email…"
        defaultValue={q}
      />
      <FilterSelect
        paramKey="status"
        pageParam="page"
        allLabel="Todos los estados"
        options={MEMBERSHIP_STATUSES}
        value={status ?? ""}
      />
      <FilterSelect
        paramKey="type"
        pageParam="page"
        allLabel="Todos los planes"
        options={MEMBERSHIP_TYPES}
        value={type ?? ""}
      />
    </div>
  );
}
