"use client";

import { useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, FolderOpen } from "lucide-react";
import { NLoader } from "@/components/brand/n-loader";
import type { ProjectRow } from "@/lib/tenant-db";
import { ProjectStatusBadge } from "./project-status-badge";

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
}: {
  tenantSlug: string;
  rows: ProjectRow[];
  total: number;
  page: number;
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
      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Código</th>
              <th className="px-4 py-3 font-medium">Proyecto</th>
              <th className="hidden px-4 py-3 font-medium sm:table-cell">
                Cliente
              </th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="hidden px-4 py-3 font-medium lg:table-cell">
                Creado
              </th>
              <th className="px-4 py-3 text-right font-medium">Abrir</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-12 text-center text-muted-foreground"
                >
                  Aún no hay proyectos de obra. Crea el primero con “Nuevo
                  proyecto”.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="transition hover:bg-muted/60">
                  <td className="px-4 py-3 font-mono text-xs font-medium text-accent-text">
                    <Link
                      href={`/${tenantSlug}/projects/${row.id}`}
                      className="transition hover:underline"
                    >
                      {row.code}
                    </Link>
                  </td>
                  <td className="max-w-[16rem] px-4 py-3 font-medium text-foreground">
                    <Link
                      href={`/${tenantSlug}/projects/${row.id}`}
                      className="transition hover:text-accent-text"
                    >
                      <span className="block truncate">{row.name}</span>
                    </Link>
                    {row.description ? (
                      <span className="mt-0.5 block truncate text-xs font-normal text-muted-foreground">
                        {row.description}
                      </span>
                    ) : null}
                  </td>
                  <td className="hidden truncate px-4 py-3 text-muted-foreground sm:table-cell">
                    {row.customerName}
                  </td>
                  <td className="px-4 py-3">
                    <ProjectStatusBadge status={row.status} />
                  </td>
                  <td className="hidden px-4 py-3 text-xs text-muted-foreground lg:table-cell">
                    {formatDate(row.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/${tenantSlug}/projects/${row.id}`}
                      className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground/80 transition hover:bg-muted"
                    >
                      <FolderOpen aria-hidden="true" className="h-3.5 w-3.5" />
                      Ver
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

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
              className="inline-flex h-9 items-center gap-1 rounded-lg border border-border bg-card px-3 text-sm font-medium text-foreground/80 transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft aria-hidden="true" className="h-4 w-4" />
              Anterior
            </button>
            <button
              type="button"
              disabled={page >= totalPages || isPending}
              onClick={() => navigate("ppage", String(page + 1))}
              className="inline-flex h-9 items-center gap-1 rounded-lg border border-border bg-card px-3 text-sm font-medium text-foreground/80 transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
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