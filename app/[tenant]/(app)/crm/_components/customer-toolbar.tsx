"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import CustomerSearch from "./customer-search";
import CustomerFilters, { type CustomerSort, type CustomerStatus } from "./customer-filters";
import CustomerSheet from "./customer-sheet";
import { useVerticalTerms } from "../../vertical-terms-context";
import { buttonVariants } from "@/components/atoms/button-variants";
import { cn } from "@/lib/utils";

/**
 * Barra superior del CRM: búsqueda + filtros + contador + botón de alta.
 * El modal de formulario vive aquí (se monta/desmonta sobre la tabla).
 *
 * En móvil el botón de alta va junto al orden ("Más recientes") y el contador
 * se muestra junto al título de la página; en escritorio se conserva el botón
 * a la derecha y el contador en la barra.
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

  const newButton = (className: string) => (
    <button
      type="button"
      onClick={() => setIsFormOpen(true)}
      className={cn(buttonVariants(), className)}
    >
      <Plus aria-hidden="true" className="h-4 w-4" />
      {`Nuevo ${terms.customer.toLowerCase()}`}
    </button>
  );

  return (
    <>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <CustomerSearch />
          <CustomerFilters
            status={status}
            sort={sort}
            trailing={newButton("flex-1 lg:hidden")}
          />
          <p
            aria-live="polite"
            className="hidden text-xs font-medium text-muted-foreground sm:ml-1 lg:block"
          >
            {total} {total === 1 ? terms.customer.toLowerCase() : terms.customers.toLowerCase()}
          </p>
        </div>

        <span className="hidden lg:block">{newButton("")}</span>
      </div>

      {isFormOpen ? (
        <CustomerSheet tenantSlug={tenantSlug} onClose={() => setIsFormOpen(false)} />
      ) : null}
    </>
  );
}

