"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge } from "@/components/atoms/badge";
import { buttonVariants } from "@/components/atoms/button-variants";
import { EmptyState } from "@/components/molecules/empty-state";
import { SegmentedControl } from "@/components/molecules/segmented-control";
import { invoiceCode, type InvoiceKind } from "@/lib/business/invoice";
import { formatCurrency } from "@/lib/format";
import InvoiceSheet from "./invoice-sheet";

type Row = { id: string; kind: InvoiceKind; number: number; customerName: string; issueDate: string; dueDate: string | null; status: "ISSUED" | "PAID" | "VOID"; total: number };
const STATUS = { ISSUED: { label: "Por cobrar", tone: "warning" }, PAID: { label: "Pagada", tone: "success" }, VOID: { label: "Anulada", tone: "muted" } } as const;

export default function BillingList({ slug, rows, customers, products, today, canCreate, initialNew }: { slug: string; rows: Row[]; customers: { id: string; name: string }[]; products: { id: string; name: string; price: number }[]; today: string; canCreate: boolean; initialNew: boolean }) {
  const [filter, setFilter] = useState<"ISSUED" | "PAID" | "all">("ISSUED");
  const [creating, setCreating] = useState(initialNew);
  const list = rows.filter((r) => filter === "all" || r.status === filter);
  const pending = rows.filter((r) => r.status === "ISSUED");
  const overdue = pending.filter((r) => r.dueDate && r.dueDate < today);
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <SegmentedControl ariaLabel="Estado" value={filter} onChange={setFilter} options={[{ value: "ISSUED", label: "Por cobrar", count: pending.length }, { value: "PAID", label: "Pagadas" }, { value: "all", label: "Todas" }]} />
        <span className="text-[13px] text-muted-foreground">
          Por cobrar {formatCurrency(pending.reduce((s, r) => s + r.total, 0))}
          {overdue.length ? <span className="text-danger"> · {overdue.length} vencidas</span> : null}
        </span>
        {canCreate ? (
          <button type="button" onClick={() => setCreating(true)} className={buttonVariants({ className: "ml-auto" })}>
            <Plus aria-hidden="true" className="size-4" /> Nueva
          </button>
        ) : null}
      </div>
      {list.length ? (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
          {list.map((r) => (
            <li key={r.id}>
              <Link href={`/${slug}/billing/${r.id}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 hover:bg-surface-muted">
                <span className="grid min-w-0">
                  <b className="truncate text-[13.5px] font-medium">{r.customerName}</b>
                  <small className="truncate text-xs text-muted-foreground">
                    <span className="font-mono">{invoiceCode(r.kind, r.number)}</span> · {r.issueDate}
                    {r.dueDate ? ` · vence ${r.dueDate}` : ""}
                  </small>
                </span>
                <span className="grid justify-items-end gap-1">
                  <b className="font-mono text-[13.5px] tabular-nums">{formatCurrency(r.total)}</b>
                  <Badge tone={r.status === "ISSUED" && r.dueDate && r.dueDate < today ? "danger" : STATUS[r.status].tone}>{r.status === "ISSUED" && r.dueDate && r.dueDate < today ? "Vencida" : STATUS[r.status].label}</Badge>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-lg border border-border bg-surface">
          <EmptyState title="Nada por aquí" description="Crea cuentas de cobro y recibos numerados para tus clientes." />
        </div>
      )}
      {creating ? <InvoiceSheet slug={slug} customers={customers} products={products} today={today} onClose={() => setCreating(false)} /> : null}
    </div>
  );
}
