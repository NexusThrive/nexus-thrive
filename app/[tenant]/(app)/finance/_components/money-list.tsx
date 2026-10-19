"use client";

import { useState } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { EmptyState } from "@/components/molecules/empty-state";
import PaginationLinks from "@/components/molecules/pagination-links";
import { receiptCode } from "@/lib/business/invoice";
import { paymentMethodLabel } from "@/lib/finance";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import MoneyDetailSheet, { type MoneyItem } from "./money-detail-sheet";

/** Lista de cobros o gastos; tocar una fila abre su ficha. Igual en computador y celular. */
export default function MoneyList({
  slug,
  items,
  business,
  page,
  totalPages,
  pageParam,
  totalLabel,
  empty,
}: {
  slug: string;
  items: MoneyItem[];
  business: { name: string; subtitle?: string };
  page: number;
  totalPages: number;
  pageParam: string;
  totalLabel: string;
  empty: { title: string; description: string };
}) {
  const [open, setOpen] = useState<MoneyItem | null>(null);
  if (!items.length) return <EmptyState className="rounded-lg border border-border bg-surface" title={empty.title} description={empty.description} />;
  return (
    <div className="grid gap-3">
      <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
        {items.map((it) => {
          const voided = it.kind === "PAYMENT" ? it.status === "VOIDED" : it.voided;
          const Icon = it.kind === "PAYMENT" ? ArrowDownRight : ArrowUpRight;
          return (
            <li key={it.id}>
              <button type="button" onClick={() => setOpen(it)} className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-muted">
                <span className={cn("grid size-9 place-items-center rounded-md", it.kind === "PAYMENT" ? "bg-success-subtle text-success" : "bg-danger-subtle text-danger", voided && "bg-surface-muted text-muted-foreground")}>
                  <Icon aria-hidden="true" className="size-4" />
                </span>
                <span className="grid min-w-0">
                  <b className={cn("truncate text-[13.5px] font-medium", voided && "text-muted-foreground line-through")}>{it.title}</b>
                  <small className="truncate text-xs text-muted-foreground">
                    {it.kind === "PAYMENT"
                      ? [it.receiptNumber ? receiptCode(it.receiptNumber) : null, it.concept, paymentMethodLabel(it.method)].filter(Boolean).join(" · ")
                      : [it.category, it.supplier, it.paidFrom === "CASH" ? "Caja menor" : null].filter(Boolean).join(" · ")}
                    {voided ? " · Anulado" : ""}
                  </small>
                </span>
                <span className="grid justify-items-end">
                  <b className={cn("font-mono text-[13.5px] tabular-nums", voided && "text-muted-foreground line-through")}>
                    {it.kind === "PAYMENT" ? "+" : "−"}
                    {formatCurrency(it.amount)}
                  </b>
                  <small className="flex items-center gap-1 text-[11px] text-muted-foreground">{formatDateTime(it.date)}</small>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <PaginationLinks paramKey={pageParam} page={page} totalPages={totalPages} totalLabel={totalLabel} />
      {open ? <MoneyDetailSheet slug={slug} item={open} business={business} onClose={() => setOpen(null)} /> : null}
    </div>
  );
}

