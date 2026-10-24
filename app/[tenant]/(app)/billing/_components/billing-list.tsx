"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Badge } from "@/components/atoms/badge";
import { buttonVariants } from "@/components/atoms/button-variants";
import { EmptyState } from "@/components/molecules/empty-state";
import { SegmentedControl } from "@/components/molecules/segmented-control";
import { DocumentViewer } from "@/components/organisms/document-viewer";
import { documentCode, type DocumentKind } from "@/lib/business/commercial-document";
import type { DocumentView } from "@/lib/business/documents-db";
import { viewDocumentAction } from "@/app/[tenant]/(app)/billing/actions";
import DocumentActions from "./document-actions";
import { formatCurrency } from "@/lib/format";
import InvoiceSheet from "./invoice-sheet";

type Row = { id: string; kind: DocumentKind; number: number; customerName: string; issueDate: string; dueDate: string | null; status: "ISSUED" | "PAID" | "VOID"; total: number };
const STATUS = { ISSUED: { label: "Por cobrar", tone: "warning" }, PAID: { label: "Pagada", tone: "success" }, VOID: { label: "Anulada", tone: "muted" } } as const;

export default function BillingList({ slug, rows, customers, products, today, canCreate, initialNew, initialDoc, canManage }: { slug: string; rows: Row[]; customers: { id: string; name: string }[]; products: { id: string; name: string; price: number }[]; today: string; canCreate: boolean; initialNew: boolean; initialDoc: string | null; canManage: boolean }) {
  const [filter, setFilter] = useState<"ISSUED" | "PAID" | "notes" | "all">("ISSUED");
  const [creating, setCreating] = useState(initialNew);
  const isNote = (r: Row) => r.kind === "CREDIT_NOTE" || r.kind === "DEBIT_NOTE";
  const list = rows.filter((r) => (filter === "all" ? true : filter === "notes" ? isNote(r) : !isNote(r) && r.status === filter));
  const pending = rows.filter((r) => r.status === "ISSUED" && !isNote(r));
  const router = useRouter();
  const [viewId, setViewId] = useState<string | null>(null);
  const [doc, setDoc] = useState<DocumentView | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const openDoc = (id: string) => {
    setViewId(id);
    setLoading(true);
    setError(null);
    void viewDocumentAction(slug, id).then((r) => {
      setLoading(false);
      if (r.ok) setDoc(r.doc);
      else setError(r.message);
    });
  };
  // Abrir con `?doc=` (enlaces desde otras pantallas): se carga una sola vez al montar.
  const [bootstrapped, setBootstrapped] = useState(false);
  if (!bootstrapped) {
    setBootstrapped(true);
    if (initialDoc) openDoc(initialDoc);
  }
  const close = () => {
    setViewId(null);
    setDoc(null);
  };
  const overdue = pending.filter((r) => r.dueDate && r.dueDate < today);
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <SegmentedControl ariaLabel="Estado" value={filter} onChange={setFilter} options={[{ value: "ISSUED", label: "Por cobrar", count: pending.length }, { value: "PAID", label: "Pagadas" }, { value: "notes", label: "Notas" }, { value: "all", label: "Todas" }]} />
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
              <button type="button" onClick={() => openDoc(r.id)} className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-left hover:bg-surface-muted">
                <span className="grid min-w-0">
                  <b className="truncate text-[13.5px] font-medium">{r.customerName}</b>
                  <small className="truncate text-xs text-muted-foreground">
                    <span className="font-mono">{documentCode(r.kind, r.number)}</span> · {r.issueDate}
                    {r.dueDate ? ` · vence ${r.dueDate}` : ""}
                  </small>
                </span>
                <span className="grid justify-items-end gap-1">
                  <b className="font-mono text-[13.5px] tabular-nums">{formatCurrency(r.total)}</b>
                  <Badge tone={r.status === "ISSUED" && r.dueDate && r.dueDate < today && !isNote(r) ? "danger" : STATUS[r.status].tone}>{isNote(r) ? (r.kind === "CREDIT_NOTE" ? "Nota crédito" : "Nota débito") : r.status === "ISSUED" && r.dueDate && r.dueDate < today ? "Vencida" : STATUS[r.status].label}</Badge>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-lg border border-border bg-surface">
          <EmptyState title="Nada por aquí" description="Crea cuentas de cobro y recibos numerados para tus clientes." />
        </div>
      )}
      <DocumentViewer
        open={viewId !== null}
        onClose={close}
        doc={doc}
        loading={loading}
        error={error}
        onOpenDocument={openDoc}
        actions={doc ? <DocumentActions slug={slug} doc={doc} canManage={canManage} canCharge={canCreate} onChanged={() => router.refresh()} onClosed={close} /> : null}
      />
      {creating ? <InvoiceSheet slug={slug} customers={customers} products={products} today={today} onClose={() => setCreating(false)} /> : null}
    </div>
  );
}
