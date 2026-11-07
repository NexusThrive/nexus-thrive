"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarClock, ChevronLeft, ChevronRight, LayoutGrid, List, Map, MoreVertical, Plus, SlidersHorizontal, X } from "lucide-react";
import CustomerSearch from "./customer-search";
import CustomerQuickCreate from "./customer-quick-create";
import type { CustomerStatus } from "./customer-filters";
import { useVerticalTerms } from "../../vertical-terms-context";
import { buttonVariants } from "@/components/atoms/button-variants";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/molecules/dropdown-menu";
import { cn } from "@/lib/utils";

/**
 * Panel de control de la lista de contactos (base de Odoo, con diseño de Nexus), debajo de la barra del módulo.
 * Tres zonas: izquierda («Nuevo», título y «⋮»), centro (búsqueda con filtros) y derecha (paginación y vistas).
 * Los filtros y la página viven en la URL, como antes: la búsqueda, el estado y la página se conservan al volver de la ficha.
 */
export default function CustomerToolbar({
  tenantSlug,
  status,
  page,
  pageSize,
  totalPages,
  total,
}: {
  tenantSlug: string;
  status: CustomerStatus;
  page: number;
  pageSize: number;
  totalPages: number;
  total: number;
}) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const terms = useVerticalTerms();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const go = (mutate: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  };
  const setStatus = (next: CustomerStatus) => {
    if (next === status) return;
    go((params) => {
      params.set("status", next);
      params.delete("page");
    });
  };
  const goToPage = (next: number) => go((params) => params.set("page", String(next)));

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const archived = status === "archived";
  const label = total === 1 ? terms.customer.toLowerCase() : terms.customers.toLowerCase();

  return (
    <>
      <div className="grid items-center gap-x-4 gap-y-3 px-5 py-4 lg:grid-cols-[1fr_minmax(0,543px)_1fr]">
        {/* Izquierda: alta, título y ⋮ */}
        <div className="flex min-w-0 items-center gap-3">
          <button type="button" onClick={() => setIsFormOpen(true)} className={buttonVariants({ variant: "accent", size: "sm" })}>
            <Plus aria-hidden="true" className="size-4" />
            Nuevo
          </button>
          <h1 className="truncate text-lg font-medium text-foreground">{terms.customers}</h1>
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <button type="button" aria-label="Más acciones" className={buttonVariants({ variant: "ghost", size: "icon" })}>
                <MoreVertical aria-hidden="true" className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" sideOffset={8}>
              <DropdownMenuItem asChild>
                <Link href={`/${tenantSlug}/data`}>Importar y exportar</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Centro: búsqueda y filtros (estado) */}
        <div className="flex min-w-0 items-center gap-2">
          <div className="min-w-0 flex-1">
            <CustomerSearch />
          </div>
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <button type="button" aria-label="Filtros" className={buttonVariants({ variant: "outline", size: "icon" })}>
                <SlidersHorizontal aria-hidden="true" className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={8} className="w-48">
              <DropdownMenuLabel>Mostrar</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={status} onValueChange={(value) => setStatus(value as CustomerStatus)}>
                <DropdownMenuRadioItem value="active">Activos</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="archived">Archivados</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          {archived ? (
            <button
              type="button"
              onClick={() => setStatus("active")}
              className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border bg-surface-muted px-2 py-1 text-xs text-foreground"
            >
              Archivados
              <X aria-hidden="true" className="size-3" />
              <span className="sr-only">Quitar filtro</span>
            </button>
          ) : null}
        </div>

        {/* Derecha: paginación y vistas */}
        <div className="flex flex-wrap items-center justify-start gap-3 lg:justify-end">
          <p aria-live="polite" className="whitespace-nowrap text-sm text-foreground/80">
            {total === 0 ? "0" : `${from}-${to} / ${total}`}
            <span className="sr-only"> {label}</span>
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Página anterior"
              disabled={page <= 1 || isPending}
              onClick={() => goToPage(page - 1)}
              className="grid h-8 w-8 place-items-center rounded-lg border border-border text-foreground outline-none hover:bg-surface-muted disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-ring"
            >
              <ChevronLeft aria-hidden="true" className="size-4" />
            </button>
            <button
              type="button"
              aria-label="Página siguiente"
              disabled={page >= totalPages || isPending}
              onClick={() => goToPage(page + 1)}
              className="grid h-8 w-8 place-items-center rounded-lg border border-border text-foreground outline-none hover:bg-surface-muted disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-ring"
            >
              <ChevronRight aria-hidden="true" className="size-4" />
            </button>
          </div>
          {/* Vistas: solo la lista existe; las demás aparecen desactivadas hasta que se construyan. */}
          <div role="group" aria-label="Vista" className="flex items-center rounded-lg border border-border p-0.5">
            <span aria-pressed="true" aria-label="Vista de lista" className="grid h-7 w-8 place-items-center rounded-md bg-surface-muted text-accent-text">
              <List aria-hidden="true" className="size-4" />
            </span>
            {[
              { label: "Vista de tarjetas", Icon: LayoutGrid },
              { label: "Vista de mapa", Icon: Map },
              { label: "Vista de actividades", Icon: CalendarClock },
            ].map(({ label: viewLabel, Icon }) => (
              <button key={viewLabel} type="button" disabled aria-label={`${viewLabel} (próximamente)`} className={cn("grid h-7 w-8 place-items-center rounded-md text-muted-foreground/40")}>
                <Icon aria-hidden="true" className="size-4" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {isFormOpen ? <CustomerQuickCreate tenantSlug={tenantSlug} onClose={() => setIsFormOpen(false)} /> : null}
    </>
  );
}
