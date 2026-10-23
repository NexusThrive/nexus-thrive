"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ExternalLink,
  Eye,
  Link2,
  MoreHorizontal,
  Users,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/molecules/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/molecules/dropdown-menu";
import { EmptyState } from "@/components/molecules/empty-state";
import { getVerticalIcon } from "@/lib/admin/vertical-icons";
import {
  MODULE_LABELS,
  VERTICAL_LABELS,
  type ModuleValue,
} from "@/lib/admin/catalogs";
import type { TenantListRow, TenantSortKey } from "@/lib/admin/db";
import { cn } from "@/lib/utils";
import TenantStatusBadge from "./tenant-status-badge";
import TenantDrawer from "./tenant-drawer";
import PaginationLinks from "@/components/molecules/pagination-links";

type SortableColumn = "name" | "created" | "activity";

const SORT_ASC: Record<SortableColumn, TenantSortKey> = {
  name: "name_asc",
  created: "created_asc",
  activity: "activity_asc",
};
const SORT_DESC: Record<SortableColumn, TenantSortKey> = {
  name: "name_desc",
  created: "created_desc",
  activity: "activity_desc",
};

/**
 * Tabla principal de negocios. Toda la fila abre el drawer de detalle;
 * los encabezados ordenan (server-side vía `sort` en la URL).
 */
export default function TenantTable({
  rows,
  sort,
  page,
  totalPages,
  total,
}: {
  rows: TenantListRow[];
  sort: TenantSortKey;
  page: number;
  totalPages: number;
  total: number;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const sortHref = useMemo(() => {
    return (column: SortableColumn, direction: TenantSortKey) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("sort", direction);
      params.delete("page");
      return `${pathname}?${params.toString()}`;
    };
  }, [pathname, searchParams]);

  const sortState = (column: SortableColumn): "asc" | "desc" | null => {
    if (sort === SORT_ASC[column]) return "asc";
    if (sort === SORT_DESC[column]) return "desc";
    return null;
  };

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card">
        <EmptyState
          title="No hay negocios que coincidan"
          description="Ajusta la búsqueda o los filtros para ver resultados."
        />
      </div>
    );
  }

  return (
    <>
      {/* Celular: tarjetas que llevan a la ficha 360°. */}
      <ul className="grid gap-2.5 md:hidden">
        {rows.map((row) => {
          const { icon: Icon } = getVerticalIcon(row.vertical);
          return (
            <li key={row.id}>
              <Link href={`/admin/negocios/${row.id}`} className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3.5 transition-colors active:bg-surface-muted">
                <span className="grid size-10 shrink-0 place-items-center rounded-md bg-surface-muted">
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <b className="block truncate font-medium">{row.name}</b>
                  <small className="block truncate text-xs text-muted-foreground">
                    {VERTICAL_LABELS[row.vertical]} · {row.lastActivityLabel}
                  </small>
                </span>
                <TenantStatusBadge active={row.active} />
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="hidden overflow-hidden rounded-lg border bg-card md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-sm [&_td]:align-middle [&_td:first-child]:sticky [&_td:first-child]:left-0 [&_td:first-child]:z-10 [&_td:first-child]:bg-card [&_tbody_tr]:h-14 [&_th:first-child]:sticky [&_th:first-child]:left-0 [&_th:first-child]:z-10 [&_th:first-child]:bg-card">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <SortHeader
                  label="Negocio"
                  column="name"
                  state={sortState("name")}
                  hrefAsc={sortHref("name", SORT_ASC.name)}
                  hrefDesc={sortHref("name", SORT_DESC.name)}
                />
                <th className="px-3 py-2.5 font-medium">Vertical</th>
                <th className="px-3 py-2.5 font-medium">Estado</th>
                <th className="px-3 py-2.5 font-medium">Onboarding</th>
                <th className="px-3 py-2.5 font-medium">Módulos</th>
                <th className="px-3 py-2.5 font-medium">Usuarios</th>
                <SortHeader
                  label="Última actividad"
                  column="activity"
                  state={sortState("activity")}
                  hrefAsc={sortHref("activity", SORT_ASC.activity)}
                  hrefDesc={sortHref("activity", SORT_DESC.activity)}
                />
                <SortHeader
                  label="Creado"
                  column="created"
                  state={sortState("created")}
                  hrefAsc={sortHref("created", SORT_ASC.created)}
                  hrefDesc={sortHref("created", SORT_DESC.created)}
                />
                <th className="w-10 px-3 py-2.5" aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const visual = getVerticalIcon(row.vertical);
                const VerticalIcon = visual.icon;
                return (
                  <tr
                    key={row.id}
                    onClick={() => setSelectedId(row.id)}
                    className="cursor-pointer border-b border-border last:border-0 transition hover:bg-surface-muted"
                  >
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={cn(
                            "inline-flex size-8 shrink-0 items-center justify-center rounded-md",
                            visual.chipClass,
                          )}
                        >
                          <VerticalIcon
                            aria-hidden="true"
                            className="h-4 w-4"
                          />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-medium">
                            {row.name}
                          </span>
                          <span className="block truncate font-mono text-xs text-muted-foreground">
                            {row.customDomain ?? `${row.slug}`}
                          </span>
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {VERTICAL_LABELS[row.vertical]}
                    </td>
                    <td className="px-3 py-3">
                      <TenantStatusBadge active={row.active} />
                    </td>
                    <td className="px-3 py-3">
                      <OnboardingProgress row={row} />
                    </td>
                    <td className="px-3 py-3">
                      <ModuleChips modules={row.modules} />
                    </td>
                    <td className="px-3 py-3">
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <Users aria-hidden="true" className="h-3.5 w-3.5" />
                        {row.usersCount}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {row.lastActivityLabel}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {row.createdAt}
                    </td>
                    <td
                      className="px-3 py-3"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <RowActions row={row} onOpen={() => setSelectedId(row.id)} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <PaginationLinks
        paramKey="page"
        page={page}
        totalPages={totalPages}
        totalLabel={`${total} ${total === 1 ? "negocio" : "negocios"}`}
      />

      <TenantDrawer
        key={selectedId ?? "none"}
        tenantId={selectedId}
        onClose={() => setSelectedId(null)}
      />
    </>
  );
}

function SortHeader({
  label,
  state,
  hrefAsc,
  hrefDesc,
}: {
  label: string;
  column: SortableColumn;
  state: "asc" | "desc" | null;
  hrefAsc: string;
  hrefDesc: string;
}) {
  const Icon = state === "asc" ? ArrowUp : state === "desc" ? ArrowDown : ArrowUpDown;
  return (
    <th className="px-3 py-2.5 font-medium">
      <Link
        href={(state === "asc" ? hrefDesc : hrefAsc)}
        className="inline-flex items-center gap-1 transition hover:text-foreground"
        scroll={false}
      >
        {label}
        <Icon aria-hidden="true" className="h-3 w-3" />
      </Link>
    </th>
  );
}

function OnboardingProgress({ row }: { row: TenantListRow }) {
  const done = row.onboardingCompleted;
  return (
    <span className="inline-flex items-center gap-2">
      <span className="h-1 w-16 bg-border">
        <span
          className={cn("block h-full", done ? "bg-foreground" : "bg-gold-500")}
          style={{
            width: `${row.onboardingProgress}%`,
            clipPath: "polygon(0 0,100% 0,calc(100% - 6px) 100%,0 100%)",
          }}
        />
      </span>
      <span className="text-xs tabular-nums text-muted-foreground">
        {done ? "Completo" : `${row.onboardingProgress}%`}
      </span>
    </span>
  );
}

function ModuleChips({ modules }: { modules: ModuleValue[] }) {
  if (modules.length === 0) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  const visible = modules.slice(0, 2);
  const rest = modules.slice(2);
  return (
    <span className="flex flex-wrap items-center gap-1">
      {visible.map((module) => (
        <span
          key={module}
          className="rounded-sm bg-surface-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground"
        >
          {MODULE_LABELS[module]}
        </span>
      ))}
      {rest.length > 0 ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="rounded-sm bg-surface-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground transition hover:bg-border"
            >
              +{rest.length}
            </button>
          </TooltipTrigger>
          <TooltipContent>
            {rest.map((module) => MODULE_LABELS[module]).join(" · ")}
          </TooltipContent>
        </Tooltip>
      ) : null}
    </span>
  );
}

function RowActions({
  row,
  onOpen,
}: {
  row: TenantListRow;
  onOpen: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Acciones de ${row.name}`}
          className="inline-flex size-8 items-center justify-center rounded text-muted-foreground transition hover:bg-surface-muted hover:text-foreground"
        >
          <MoreHorizontal aria-hidden="true" className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onSelect={onOpen}>
          <Eye aria-hidden="true" />
          Ver detalle
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            void navigator.clipboard?.writeText(row.url);
          }}
        >
          <Link2 aria-hidden="true" />
          Copiar enlace
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href={row.url} target="_blank" rel="noopener noreferrer">
            <ExternalLink aria-hidden="true" />
            Abrir sitio
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
