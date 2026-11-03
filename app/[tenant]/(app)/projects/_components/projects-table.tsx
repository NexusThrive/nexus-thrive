"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { NLoader } from "@/components/atoms/n-loader";
import { EmptyState } from "@/components/molecules/empty-state";
import { AdaptiveTable } from "@/components/organisms/adaptive-table";
import type { ProjectRow } from "@/lib/industry/construction/shared";
import { ProjectStatusBadge } from "./project-status-badge";
import { buttonVariants } from "@/components/atoms/button-variants";

const PAGE_SIZE = 12;

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "America/Bogota",
  }).format(date);
}

/**
 * Lista paginada de proyectos de obra. La URL maneja búsqueda (`pq`), estado
 * (`ps`) y página (`ppage`).
 */
export default function ProjectsTable({
  tenantSlug,
  rows,
  total,
  page,
  emptyAction,
}: {
  tenantSlug: string;
  rows: ProjectRow[];
  total: number;
  page: number;
  /** Botón para crear el primer proyecto cuando no hay ninguno (el mismo de la cabecera). */
  emptyAction?: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const navigate = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  };

  return (
    <div className="space-y-4">
      <AdaptiveTable
        caption="Proyectos de obra"
        rows={rows}
        getRowId={(r) => r.id}
        getRowHref={(r) => `/${tenantSlug}/projects/${r.id}`}
        rowLabel={(r) => `Abrir ${r.code} · ${r.name}`}
        empty={<EmptyState title="Aún no hay proyectos de obra" description="Crea el primero para armar su presupuesto, su plan y su bitácora." action={emptyAction} />}
        columns={[
          { key: "name", header: "Proyecto", role: "primary", cell: (r) => <span className="font-medium">{r.name}</span> },
          { key: "code", header: "Código", role: "secondary", cell: (r) => <span className="font-mono text-xs text-accent-text">{r.code}</span> },
          { key: "customer", header: "Cliente", role: "detail", cell: (r) => r.customerName },
          { key: "status", header: "Estado", role: "status", cell: (r) => <ProjectStatusBadge status={r.status} /> },
          { key: "created", header: "Creado", role: "detail", cell: (r) => <span className="text-xs text-muted-foreground">{formatDate(r.createdAt)}</span> },
        ]}
      />

      {total > PAGE_SIZE ? (
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            Página {page} de {totalPages} · {total} proyectos
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || isPending}
              onClick={() => navigate("ppage", String(page - 1))}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <ChevronLeft aria-hidden="true" className="h-4 w-4" />
              Anterior
            </button>
            <button
              type="button"
              disabled={page >= totalPages || isPending}
              onClick={() => navigate("ppage", String(page + 1))}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              {isPending ? (
                <NLoader size={16} className="text-current" />
              ) : null}
              Siguiente
              <ChevronRight aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}