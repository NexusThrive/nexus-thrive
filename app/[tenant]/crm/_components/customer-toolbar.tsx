"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import CustomerSearch from "./customer-search";
import CustomerFilters, { type CustomerSort, type CustomerStatus } from "./customer-filters";
import CustomerForm from "./customer-form";

/**
 * Barra superior del CRM: búsqueda + filtros + contador + botón de alta.
 * El modal de formulario vive aquí (se monta/desmonta sobre la tabla).
 */
export default function CustomerToolbar({
  tenantSlug,
  status,
  sort,
  total,
}: {
  tenantSlug: string;
  status: CustomerStatus;
  sort: CustomerSort;
  total: number;
}) {
  const [isFormOpen, setIsFormOpen] = useState(false);

  return (
    <>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <CustomerSearch />
          <CustomerFilters status={status} sort={sort} />
          <p
            aria-live="polite"
            className="text-xs font-medium text-slate-500 sm:ml-1"
          >
            {total} {total === 1 ? "cliente" : "clientes"}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsFormOpen(true)}
          className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 lg:self-auto"
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          Nuevo cliente
        </button>
      </div>

      {isFormOpen ? (
        <CustomerForm
          tenantSlug={tenantSlug}
          mode="create"
          onClose={() => setIsFormOpen(false)}
        />
      ) : null}
    </>
  );
}
