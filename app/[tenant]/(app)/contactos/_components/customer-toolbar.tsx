"use client";

import Link from "next/link";
import { useState } from "react";
import { MoreHorizontal, Plus } from "lucide-react";
import CustomerSearch from "./customer-search";
import CustomerFilters, { type CustomerSort, type CustomerStatus } from "./customer-filters";
import CustomerQuickCreate from "./customer-quick-create";
import { useVerticalTerms } from "../../vertical-terms-context";
import { buttonVariants } from "@/components/atoms/button-variants";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/molecules/dropdown-menu";

/**
 * Panel de control de la lista de contactos (base de Odoo, con diseño de Nexus), debajo de la barra del módulo:
 *  - Izquierda: «Nuevo», el título de la sección y el menú «⋮» (importar y exportar).
 *  - Centro: la búsqueda.
 *  - Derecha: filtros, orden y el contador.
 * El modal de alta vive aquí (se monta sobre la tabla). La paginación está al pie de la tabla.
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
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4">
        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            onClick={() => setIsFormOpen(true)}
            className={buttonVariants({ variant: "accent", size: "sm" })}
          >
            <Plus aria-hidden="true" className="size-4" />
            Nuevo
          </button>
          <h1 className="text-lg font-medium text-foreground">{terms.customers}</h1>
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Más acciones"
                className={buttonVariants({ variant: "ghost", size: "icon" })}
              >
                <MoreHorizontal aria-hidden="true" className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" sideOffset={8}>
              <DropdownMenuItem asChild>
                <Link href={`/${tenantSlug}/data`}>Importar y exportar</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mx-auto min-w-0 flex-1 basis-60 max-w-[543px]">
          <CustomerSearch />
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <CustomerFilters status={status} sort={sort} />
          <p aria-live="polite" className="whitespace-nowrap text-xs font-medium text-muted-foreground">
            {total} {total === 1 ? terms.customer.toLowerCase() : terms.customers.toLowerCase()}
          </p>
        </div>
      </div>

      {isFormOpen ? (
        <CustomerQuickCreate tenantSlug={tenantSlug} onClose={() => setIsFormOpen(false)} />
      ) : null}
    </>
  );
}
