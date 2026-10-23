"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Download, TriangleAlert } from "lucide-react";
import { NLoader } from "@/components/atoms/n-loader";
import SearchInput from "@/components/molecules/search-input";
import FilterSelect from "@/components/molecules/filter-select";
import {
  VERTICAL_LABELS,
  VERTICALS,
  type VerticalValue,
} from "@/lib/admin/catalogs";
import type { TenantSortKey } from "@/lib/admin/db";
import { buttonVariants } from "@/components/atoms/button-variants";
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

  // Acciones a la derecha del buscador.
  const actions = (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggleAttention}
          disabled={isPending}
          aria-pressed={attentionOnly}
          className={buttonVariants({ variant: attentionOnly ? "primary" : "outline" })}
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
          className={buttonVariants({ variant: "outline" })}
        >
          <Download aria-hidden="true" className="size-4" />
          Exportar CSV
        </a>
      </div>
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2 [&>div:first-child]:max-w-none">
        <SearchInput
          paramKey="q"
          pageParam="page"
          ariaLabel="Buscar negocios"
          placeholder="Buscar por nombre, slug o dominio…"
          defaultValue={q}
        />
        {actions}
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <FilterSelect
          fullWidth
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
          fullWidth
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
          fullWidth
          paramKey="sort"
          pageParam="page"
          allLabel="Orden: más recientes"
          options={SORT_OPTIONS}
          value={sort}
        />
      </div>
    </div>
  );
}
