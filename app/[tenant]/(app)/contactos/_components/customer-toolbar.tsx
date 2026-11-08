"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Archive, ArchiveRestore, FolderMinus, FolderPlus, Users, CalendarClock, ChevronLeft, ChevronRight, Download, LayoutGrid, List, Map, MoreVertical, Plus, Settings, Trash2, X } from "lucide-react";
import CustomerSearchBar from "./customer-search-bar";
import { AssignGroupDialog, ManageGroupsSheet, type GroupOption } from "./customer-group-dialogs";
import type { FavoriteItem } from "@/components/organisms/advanced-search/advanced-search";
import type { SearchSchema } from "@/lib/foundation/list-search";
import { useCustomerSelection } from "./customer-selection";
import type { CustomerStatus } from "./customer-filters";
import { useVerticalTerms } from "../../vertical-terms-context";
import { buttonVariants } from "@/components/atoms/button-variants";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
  schema,
  favorites,
  groups,
  canDeleteGroups,
}: {
  tenantSlug: string;
  status: CustomerStatus;
  page: number;
  pageSize: number;
  totalPages: number;
  total: number;
  schema: SearchSchema;
  favorites: FavoriteItem[];
  /** Grupos propios del negocio (para agregar o quitar a la selección y administrarlos). */
  groups: GroupOption[];
  canDeleteGroups: boolean;
}) {
  const terms = useVerticalTerms();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const { selection, setSelection, run } = useCustomerSelection();
  const selectedCount = selection.status === status ? selection.ids.size : 0;
  const [groupDialog, setGroupDialog] = useState<null | "add" | "remove">(null);
  const [manageOpen, setManageOpen] = useState(false);

  const go = (mutate: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  };
  const goToPage = (next: number) => go((params) => params.set("page", String(next)));

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const archived = status === "archived";
  const label = total === 1 ? terms.customer.toLowerCase() : terms.customers.toLowerCase();

  return (
    <>
      {/* `suppressHydrationWarning`: Proton Pass marca con `data-protonpass-form` los contenedores con campos antes de que
          React hidrate; no es nuestro HTML (mismo criterio que la barra superior). */}
      <div suppressHydrationWarning className="grid items-center gap-x-4 gap-y-3 px-5 py-4 min-[1100px]:grid-cols-[1fr_minmax(0,543px)_1fr]">
        {/* Izquierda: alta, título y ⋮ */}
        <div className="flex min-w-0 items-center gap-3 justify-self-start">
          <Link href={`/${tenantSlug}/contactos/nuevo`} className={buttonVariants({ variant: "accent", size: "sm", className: "h-[34px]" })}>
            <Plus aria-hidden="true" className="size-4" />
            Nuevo
          </Link>
          <h1 className="truncate text-lg font-medium text-foreground">{terms.customers}</h1>
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <button type="button" aria-label="Más acciones" className={buttonVariants({ variant: "ghost", size: "icon", className: "size-[34px]" })}>
                <MoreVertical aria-hidden="true" className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" sideOffset={8}>
              <DropdownMenuItem asChild>
                <Link href={`/${tenantSlug}/data`}>Importar y exportar</Link>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setManageOpen(true)}>
                <Users aria-hidden="true" className="size-4" /> Mis grupos…
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {selectedCount > 0 ? (
          /* Con filas seleccionadas, el centro muestra la selección y sus acciones (como en Odoo). */
          <div className="flex h-[34px] w-full items-center gap-2 justify-self-center max-w-[543px]">
            <div className="flex h-full min-w-0 flex-1 items-center justify-between gap-2 rounded-lg border border-accent bg-card px-3 ring-2 ring-accent/25">
              <span className="truncate text-sm font-medium text-foreground" aria-live="polite">
                {selectedCount} {selectedCount === 1 ? "seleccionado" : "seleccionados"}
              </span>
              <button
                type="button"
                onClick={() => setSelection({ status, ids: new Set() })}
                aria-label="Quitar selección"
                className="grid size-6 place-items-center rounded-md text-muted-foreground outline-none hover:bg-surface-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            </div>
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <button type="button" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-[34px] border border-border bg-card")}>
                  <Settings aria-hidden="true" className="size-4" />
                  Acciones
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={8} className="w-52">
                <DropdownMenuItem asChild>
                  <Link href={`/${tenantSlug}/data`}>
                    <Download aria-hidden="true" className="size-4" /> Exportar
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setGroupDialog("add")}>
                  <FolderPlus aria-hidden="true" className="size-4" /> Agregar a un grupo…
                </DropdownMenuItem>
                {groups.length > 0 ? (
                  <DropdownMenuItem onSelect={() => setGroupDialog("remove")}>
                    <FolderMinus aria-hidden="true" className="size-4" /> Quitar de un grupo…
                  </DropdownMenuItem>
                ) : null}
                {archived ? (
                  <DropdownMenuItem onSelect={() => run("restore")}>
                    <ArchiveRestore aria-hidden="true" className="size-4" /> Desarchivar
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onSelect={() => run("archive")}>
                    <Archive aria-hidden="true" className="size-4" /> Archivar
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onSelect={() => run("remove")} className="text-danger">
                  <Trash2 aria-hidden="true" className="size-4" /> Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
        <CustomerSearchBar tenantSlug={tenantSlug} schema={schema} favorites={favorites} className="h-[34px] w-full max-w-[543px] justify-self-center" />
        )}

        {/* Derecha: paginación y vistas */}
        <div className="flex flex-wrap items-center justify-start gap-2 justify-self-start min-[1100px]:flex-nowrap min-[1100px]:justify-self-end">
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
              className="grid h-[34px] w-[34px] place-items-center rounded-lg border border-border text-foreground outline-none hover:bg-surface-muted disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-ring"
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
          <div role="group" aria-label="Vista" className="flex h-[34px] items-center rounded-lg border border-border p-0.5">
            <button type="button" aria-pressed="true" aria-label="Vista de lista" className="grid h-[28px] w-8 place-items-center rounded-md bg-surface-muted text-accent-text outline-none focus-visible:outline-2 focus-visible:outline-ring">
              <List aria-hidden="true" className="size-4" />
            </button>
            {[
              { label: "Vista de tarjetas", Icon: LayoutGrid },
              { label: "Vista de mapa", Icon: Map },
              { label: "Vista de actividades", Icon: CalendarClock },
            ].map(({ label: viewLabel, Icon }) => (
              <button key={viewLabel} type="button" disabled aria-label={`${viewLabel} (próximamente)`} className={cn("grid h-[28px] w-8 place-items-center rounded-md text-muted-foreground/40")}>
                <Icon aria-hidden="true" className="size-4" />
              </button>
            ))}
          </div>
        </div>
      </div>

      <AssignGroupDialog
        open={groupDialog !== null}
        onOpenChange={(next) => !next && setGroupDialog(null)}
        tenantSlug={tenantSlug}
        groups={groups}
        customerIds={selection.status === status ? [...selection.ids] : []}
        mode={groupDialog ?? "add"}
        onDone={() => setSelection({ status, ids: new Set() })}
      />
      <ManageGroupsSheet open={manageOpen} onOpenChange={setManageOpen} tenantSlug={tenantSlug} groups={groups} canDelete={canDeleteGroups} />
    </>
  );
}
