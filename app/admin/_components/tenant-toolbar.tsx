"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Download, TriangleAlert } from "lucide-react";
import { NLoader } from "@/components/brand/n-loader";
import SearchInput from "@/app/components/tenant/search-input";
import FilterSelect from "@/app/components/tenant/filter-select";
import {
  VERTICAL_LABELS,
  VERTICALS,
  type VerticalValue,
} from "@/lib/admin-catalogs";
import type { TenantSortKey } from "@/lib/admin-db";
import { cn } from "@/lib/utils";

const SORT_OPTIONS: { value: TenantSortKey; label: string }[] = [
  { value: "created_desc", label: "Más recientes" },
  { value: "created_asc", label: "Más antiguos" },
  { value: "name_asc", label: "Nombre A–Z" },
  { value: "name_desc", label: "Nombre Z–A" },
  { value: "activity_desc", label: "Última actividad" },
];

/**
 * Barra de filtros del listado. La URL es la única fuente de verdad
 * (`q`, `vertical`, `status`, `attention`, `sort` y `page`).
 */
export default function TenantToolbar({
  q,
  vertical,
  status,
  sort,
  attentionOnly,
  attentionCount,
}: {
  q: string;
  vertical?: VerticalValue;
  status?: "active" | "inactive";
  sort: TenantSortKey;
  attentionOnly: boolean;
  /** Negocios que requieren atención (para el contador del botón). */
  attentionCount?: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const exportParams = new URLSearchParams(searchParams.toString());
  exportParams.delete("page");
  const exportHref = `/admin/export?${exportParams.toString()}`;

  const toggleAttention = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (attentionOnly) {
      params.delete("attention");
    } else {
      params.set("attention", "1");
    }
    params.delete("page");
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  };

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
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
        <FilterSelect
          paramKey="sort"
          pageParam="page"
          allLabel="Orden: más recientes"
          options={SORT_OPTIONS}
          value={sort}
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggleAttention}
          disabled={isPending}
          aria-pressed={attentionOnly}
          className={cn(
            "inline-flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded border px-3 text-[13px] font-semibold transition disabled:opacity-60",
            attentionOnly
              ? "border-transparent bg-primary text-primary-foreground"
              : "border-border-strong bg-transparent text-foreground hover:bg-surface-muted",
          )}
        >
          {isPending ? (
            <NLoader size={16} className="text-current" />
          ) : (
            <TriangleAlert aria-hidden="true" className="size-4" />
          )}
          Requieren atención
          {typeof attentionCount === "number" && attentionCount > 0 ? (
            <span
              className={cn(
                "ml-0.5 inline-flex min-w-[18px] items-center justify-center rounded-sm px-1 text-[11px] font-semibold tabular-nums",
                attentionOnly
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-gold-100 text-gold-700",
              )}
            >
              {attentionCount}
            </span>
          ) : null}
        </button>

        <a
          href={exportHref}
          className="inline-flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded border border-border-strong px-3 text-[13px] font-semibold text-foreground transition hover:bg-surface-muted"
        >
          <Download aria-hidden="true" className="size-4" />
          Exportar CSV
        </a>
      </div>
    </div>
  );
}
