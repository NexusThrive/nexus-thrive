"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { NLoader } from "@/components/brand/n-loader";
import { formatCurrency } from "@/lib/format";
import type { QuoteRow } from "@/lib/tenant-db";
import type { QuoteDetail } from "@/lib/tenant-db";
import { getQuoteDetailAction } from "../actions";
import { QuoteStatusBadge } from "./quote-badges";
import Modal from "./modal";

function formatDateTime(value: string): string {
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
 * Lista paginada de presupuestos. La URL maneja búsqueda (`bq`), estado
 * (`bs`) y página (`bpage`); el detalle se consulta por Server Action.
 */
export default function QuotesTable({
  tenantSlug,
  rows,
  total,
  page,
  quoteLabel,
}: {
  tenantSlug: string;
  rows: QuoteRow[];
  total: number;
  page: number;
  quoteLabel: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<QuoteDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

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

  const openDetail = async (quoteId: string) => {
    setDetailId(quoteId);
    setDetail(null);
    setLoadingDetail(true);
    try {
      const result = await getQuoteDetailAction(tenantSlug, quoteId);
      setDetail(result);
    } finally {
      setLoadingDetail(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Código</th>
              <th className="px-4 py-3 font-medium">Título</th>
              <th className="hidden px-4 py-3 font-medium sm:table-cell">
                Cliente
              </th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="hidden px-4 py-3 text-right font-medium md:table-cell">
                Total
              </th>
              <th className="hidden px-4 py-3 font-medium lg:table-cell">
                Creado
              </th>
              <th className="px-4 py-3 text-right font-medium">Detalle</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                  Sin {quoteLabel.toLowerCase()} por mostrar.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="transition hover:bg-muted/60">
                  <td className="px-4 py-3 font-mono text-xs font-medium text-accent-text">
                    <Link
                      href={`/${tenantSlug}/quotes/${row.id}`}
                      className="transition hover:underline"
                    >
                      {row.code}
                    </Link>
                  </td>
                  <td className="max-w-[14rem] truncate px-4 py-3 font-medium text-foreground">
                    <Link
                      href={`/${tenantSlug}/quotes/${row.id}`}
                      className="transition hover:text-accent-text"
                    >
                      {row.title}
                    </Link>
                  </td>
                  <td className="hidden truncate px-4 py-3 text-muted-foreground sm:table-cell">
                    {row.customerName ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <QuoteStatusBadge status={row.status} />
                  </td>
                  <td className="hidden px-4 py-3 text-right font-semibold text-foreground md:table-cell">
                    {formatCurrency(row.totalAmount)}
                  </td>
                  <td className="hidden px-4 py-3 text-xs text-muted-foreground lg:table-cell">
                    {formatDateTime(row.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => void openDetail(row.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground/80 transition hover:bg-muted"
                    >
                      <Eye aria-hidden="true" className="h-3.5 w-3.5" />
                      Ver
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {total > pageSize ? (
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            Página {page} de {totalPages} · {total} {quoteLabel.toLowerCase()}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || isPending}
              onClick={() => navigate("bpage", String(page - 1))}
              className="inline-flex h-9 items-center gap-1 rounded-lg border border-border bg-card px-3 text-sm font-medium text-foreground/80 transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft aria-hidden="true" className="h-4 w-4" />
              Anterior
            </button>
            <button
              type="button"
              disabled={page >= totalPages || isPending}
              onClick={() => navigate("bpage", String(page + 1))}
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

      <Modal
        open={detailId !== null}
        onClose={() => setDetailId(null)}
        title={detail ? `${detail.code} · ${detail.title}` : "Presupuesto"}
        wide
      >
        {loadingDetail || !detail ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <NLoader size={16} className="text-current" />
            Cargando detalle…
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <QuoteStatusBadge status={detail.status} />
              <p className="text-sm text-muted-foreground">
                Cliente:{" "}
                <span className="font-medium text-foreground/80">
                  {detail.customerName ?? "Sin cliente"}
                </span>
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead className="bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Actividad</th>
                    <th className="px-3 py-2 text-right font-medium">Cant.</th>
                    <th className="px-3 py-2 text-right font-medium">
                      Vr. Unitario
                    </th>
                    <th className="px-3 py-2 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {detail.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-3 py-2 font-medium text-foreground">
                        {item.name}
                      </td>
                      <td className="px-3 py-2 text-right text-muted-foreground">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="px-3 py-2 text-right text-muted-foreground">
                        {formatCurrency(item.unitCost)}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-foreground">
                        {formatCurrency(item.totalCost)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end">
              <dl className="w-full max-w-xs space-y-1.5 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <dt>Costo directo</dt>
                  <dd className="font-medium text-foreground">
                    {formatCurrency(detail.directCost)}
                  </dd>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <dt>Administración ({detail.adminPercent}%)</dt>
                  <dd>{formatCurrency(detail.administration)}</dd>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <dt>Imprevistos ({detail.imprevPercent}%)</dt>
                  <dd>{formatCurrency(detail.contingency)}</dd>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <dt>Utilidad ({detail.utilPercent}%)</dt>
                  <dd>{formatCurrency(detail.utility)}</dd>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <dt>Subtotal</dt>
                  <dd className="font-medium text-foreground">
                    {formatCurrency(detail.subtotal)}
                  </dd>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <dt>IVA sobre utilidad ({detail.taxPercent}%)</dt>
                  <dd>{formatCurrency(detail.tax)}</dd>
                </div>
                <div className="flex justify-between border-t border-border pt-2 text-base font-semibold text-foreground">
                  <dt>Total</dt>
                  <dd>{formatCurrency(detail.totalAmount)}</dd>
                </div>
              </dl>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}