"use client";

import { useState } from "react";
import { ArrowDownRight, ArrowUpRight, Plus } from "lucide-react";
import { buttonVariants } from "@/components/atoms/button-variants";
import { useQuickCreate } from "@/components/organisms/quick-create-host";
import { EmptyState } from "@/components/molecules/empty-state";
import PaginationLinks from "@/components/molecules/pagination-links";
import { receiptCode } from "@/lib/business/sales/invoice";
import { paymentMethodLabel } from "@/lib/foundation/kernel/payment-vocabulary";
import { formatCurrency, formatDateTime } from "@/lib/foundation/format";
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
  emptyAction,
}: {
  slug: string;
  items: MoneyItem[];
  business: { name: string; subtitle?: string };
  page: number;
  totalPages: number;
  pageParam: string;
  totalLabel: string;
  empty: { title: string; description: string };
  /** Botón para crear el primero (solo cuando no hay búsqueda activa): abre el mini-modal de creación. */
  emptyAction?: { label: string; quick: "payment" | "expense" };
}) {
  const quick = useQuickCreate();
  const [open, setOpen] = useState<MoneyItem | null>(null);
  if (!items.length) return <EmptyState mark="center" remember={false} className="rounded-(--radius-widget) border border-border/60 bg-card" title={empty.title} description={empty.description} action={emptyAction ? <button type="button" onClick={() => quick.open(emptyAction.quick)} className={cn(buttonVariants({ variant: "accent" }), "h-11 rounded-full px-6 text-sm font-semibold")}><Plus aria-hidden="true" className="size-4" /> {emptyAction.label}</button> : undefined} />;
  return (
    <div className="grid gap-3">
      <ul className="grid gap-2 rounded-(--radius-widget) border border-border/60 bg-card p-4">
        {items.map((it) => {
          const voided = it.kind === "PAYMENT" ? it.status === "VOIDED" : it.voided;
          const Icon = it.kind === "PAYMENT" ? ArrowDownRight : ArrowUpRight;
          return (
            <li key={it.id}>
              <button type="button" onClick={() => setOpen(it)} className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3.5 rounded-2xl bg-surface-muted/60 px-4 py-3.5 text-left outline-none transition-colors hover:bg-accent-subtle focus-visible:outline-2 focus-visible:outline-ring">
                <span className={cn("grid size-10 place-items-center rounded-full", it.kind === "PAYMENT" ? "bg-success-subtle text-success" : "bg-danger-subtle text-danger", voided && "bg-surface-muted text-muted-foreground")}>
                  <Icon aria-hidden="true" className="size-4" />
                </span>
                <span className="grid min-w-0">
                  <b className={cn("truncate text-ui font-medium", voided && "text-muted-foreground line-through")}>{it.title}</b>
                  <small className="truncate text-xs text-muted-foreground">
                    {it.kind === "PAYMENT"
                      ? [it.receiptNumber ? receiptCode(it.receiptNumber) : null, it.concept, paymentMethodLabel(it.method)].filter(Boolean).join(" · ")
                      : [it.category, it.supplier, it.paidFrom === "CASH" ? "Caja menor" : null].filter(Boolean).join(" · ")}
                    {voided ? " · Anulado" : ""}
                  </small>
                </span>
                <span className="grid justify-items-end">
                  <b className={cn("font-mono text-ui tabular-nums", voided && "text-muted-foreground line-through")}>
                    {it.kind === "PAYMENT" ? "+" : "−"}
                    {formatCurrency(it.amount)}
                  </b>
                  <small className="flex items-center gap-1 text-2xs text-muted-foreground">{formatDateTime(it.date)}</small>
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

