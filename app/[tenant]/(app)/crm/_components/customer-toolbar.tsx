"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import CustomerSearch from "./customer-search";
import CustomerFilters, { type CustomerSort, type CustomerStatus } from "./customer-filters";
import CustomerSheet from "./customer-sheet";
import { useVerticalTerms } from "../../vertical-terms-context";
import { buttonVariants } from "@/components/atoms/button-variants";

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
  const terms = useVerticalTerms();

  return (
    <>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <CustomerSearch />
          <CustomerFilters status={status} sort={sort} />
          <p
            aria-live="polite"
            className="text-xs font-medium text-muted-foreground sm:ml-1"
          >
            {total} {total === 1 ? terms.customer.toLowerCase() : terms.customers.toLowerCase()}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsFormOpen(true)}
          className={`${buttonVariants()} self-start lg:self-auto`}
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          {`Nuevo ${terms.customer.toLowerCase()}`}
        </button>
      </div>

      {isFormOpen ? (
        <CustomerSheet tenantSlug={tenantSlug} onClose={() => setIsFormOpen(false)} />
      ) : null}
    </>
  );
}
