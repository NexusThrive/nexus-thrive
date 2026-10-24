"use client";

import type { ReactNode } from "react";
import { Printer } from "lucide-react";
import { Badge } from "@/components/atoms/badge";
import { buttonVariants } from "@/components/atoms/button-variants";
import { ResponsiveSheet } from "@/components/organisms/responsive-sheet";
import { DOCUMENT_LABELS, type DocumentKind } from "@/lib/business/commercial-document";
import type { DocumentView } from "@/lib/business/documents-db";
import { formatCurrency } from "@/lib/format";

/**
 * Visor de documentos en PANTALLA COMPLETA (el modal «avanzado»): facturas, cuentas de
 * cobro, recibos y notas crédito y débito se ven con su estilo de factura (emisor,
 * adquirente, líneas, impuestos, retenciones, saldo y documentos relacionados), con
 * impresión limpia. Las acciones rápidas sobre el documento (cobrar, anular, emitir
 * una nota) abren modales PEQUEÑOS encima: un campo o dos, sin perder el documento.
 * Criterio de elección: docs/design/interaction-patterns.md.
 */
const STATUS = { ISSUED: { label: "Emitido", tone: "warning" }, PAID: { label: "Pagado", tone: "success" }, VOID: { label: "Anulado", tone: "muted" } } as const;
const TONE: Record<DocumentKind, string> = { CREDIT_NOTE: "text-[#9B2C2C]", DEBIT_NOTE: "text-[#1F5F3F]", QUOTE: "", ORDER: "", BILL: "", RECEIPT: "", SALE: "" };

export function DocumentViewer({
  open,
  onClose,
  doc,
  loading,
  error,
  actions,
  onOpenDocument,
}: {
  open: boolean;
  onClose: () => void;
  doc: DocumentView | null;
  loading?: boolean;
  error?: string | null;
  /** Botones de acciones rápidas (cada uno abre un modal pequeño). */
  actions?: ReactNode;
  onOpenDocument?: (id: string) => void;
}) {
  return (
    <ResponsiveSheet open={open} onOpenChange={(o) => !o && onClose()} size="full" title={doc ? `${DOCUMENT_LABELS[doc.kind]} ${doc.code}` : "Documento"} className="print:static print:bg-white">
      <div className="flex flex-wrap items-center justify-end gap-2 pb-3 print:hidden">
        {actions}
        <button type="button" onClick={() => window.print()} disabled={!doc} className={buttonVariants({ variant: "outline", size: "sm" })}>
          <Printer aria-hidden="true" className="size-3.5" /> Imprimir o guardar PDF
        </button>
      </div>
      {loading ? <p role="status" className="py-20 text-center text-sm text-muted-foreground">Cargando documento…</p> : null}
      {error ? <p role="alert" className="py-20 text-center text-sm text-danger">{error}</p> : null}
      {doc && !loading ? <Paper doc={doc} onOpenDocument={onOpenDocument} /> : null}
    </ResponsiveSheet>
  );
}

function Paper({ doc, onOpenDocument }: { doc: DocumentView; onOpenDocument?: (id: string) => void }) {
  const isNote = doc.kind === "CREDIT_NOTE" || doc.kind === "DEBIT_NOTE";
  const st = STATUS[doc.status];
  const party = doc.kind === "RECEIPT" ? "Recibimos de" : "Adquirente";
  return (
    <article aria-label={`${DOCUMENT_LABELS[doc.kind]} ${doc.code}`} className="mx-auto w-full max-w-4xl rounded-lg border border-border bg-white p-6 text-[#0B0B0C] shadow-sm sm:p-12 print:max-w-none print:border-0 print:p-0 print:shadow-none">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[#E4E1DA] pb-6">
        <div>
          <p className="font-display text-xl font-bold">{doc.issuer.legalName || doc.issuer.name}</p>
          <p className="max-w-sm text-[13px] text-[#5E5D63]">{[doc.issuer.taxId ? `NIT ${doc.issuer.taxId}` : null, doc.issuer.address, doc.issuer.city, doc.issuer.phone].filter(Boolean).join(" · ")}</p>
        </div>
        <div className="text-right">
          <p className={`font-mono text-[11px] uppercase tracking-[0.14em] ${TONE[doc.kind] || "text-[#5E5D63]"}`}>{DOCUMENT_LABELS[doc.kind]}</p>
          <p className="font-display text-3xl font-bold">{doc.code}</p>
          <Badge tone={st.tone}>{st.label}</Badge>
        </div>
      </header>

      <section className="grid gap-4 py-6 text-[14px] sm:grid-cols-3">
        <div>
          <p className="text-[12px] uppercase tracking-wide text-[#5E5D63]">{party}</p>
          <p className="font-semibold">{doc.customer.name}</p>
          {doc.customer.doc ? <p className="text-[#5E5D63]">Documento {doc.customer.doc}</p> : null}
        </div>
        <div>
          <p className="text-[12px] uppercase tracking-wide text-[#5E5D63]">Fechas</p>
          <p>Emitido {doc.issueDate}</p>
          {doc.dueDate ? <p className="text-[#5E5D63]">Vence {doc.dueDate}</p> : null}
        </div>
        {doc.source ? (
          <div>
            <p className="text-[12px] uppercase tracking-wide text-[#5E5D63]">{isNote ? "Afecta al documento" : "Viene de"}</p>
            <button type="button" onClick={() => onOpenDocument?.(doc.source!.id)} className="font-mono font-semibold underline underline-offset-2">{doc.source.code}</button>
          </div>
        ) : null}
      </section>

      <div role="region" aria-label="Detalle del documento" tabIndex={0} className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-[13.5px]">
          <caption className="sr-only">Líneas del documento</caption>
          <thead className="border-y border-[#E4E1DA] text-left text-[12px] uppercase tracking-wide text-[#5E5D63]">
            <tr>
              <th scope="col" className="py-2 pr-2 font-medium">Concepto</th>
              <th scope="col" className="px-2 py-2 text-right font-medium">Cant.</th>
              <th scope="col" className="px-2 py-2 text-right font-medium">Valor unit.</th>
              <th scope="col" className="px-2 py-2 text-right font-medium">Desc.</th>
              <th scope="col" className="px-2 py-2 text-right font-medium">IVA</th>
              <th scope="col" className="py-2 pl-2 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EFECE6]">
            {doc.lines.map((l, i) => (
              <tr key={i}>
                <th scope="row" className="py-2.5 pr-2 text-left font-normal">{l.description}</th>
                <td className="px-2 py-2.5 text-right font-mono tabular-nums">{l.quantity}</td>
                <td className="px-2 py-2.5 text-right font-mono tabular-nums">{formatCurrency(l.unitPrice)}</td>
                <td className="px-2 py-2.5 text-right font-mono tabular-nums">{l.discountPct ? `${l.discountPct} %` : "—"}</td>
                <td className="px-2 py-2.5 text-right font-mono tabular-nums">{l.taxRatePct ? `${l.taxRatePct} %` : "—"}</td>
                <td className="py-2.5 pl-2 text-right font-mono tabular-nums">{formatCurrency(l.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dl className="ml-auto mt-6 grid w-full max-w-sm gap-1.5 text-[14px]">
        <Total label="Subtotal" value={doc.subtotal} />
        {doc.discountTotal ? <Total label="Descuentos" value={-doc.discountTotal} /> : null}
        {doc.taxTotal ? <Total label="Impuestos" value={doc.taxTotal} /> : null}
        <div className="flex justify-between border-t border-[#E4E1DA] pt-2 text-[17px] font-bold"><dt>{doc.kind === "CREDIT_NOTE" ? "Total a favor" : "Total"}</dt><dd className="font-mono tabular-nums">{formatCurrency(doc.total)}</dd></div>
        {doc.withholdings.map((w) => <Total key={w.name} label={`Retención · ${w.name}`} value={-w.amount} />)}
        {doc.kind === "BILL" ? <Total label="Abonado" value={doc.status === "PAID" ? doc.total : doc.paid} /> : null}
        {doc.kind === "BILL" && doc.status === "ISSUED" ? <div className="flex justify-between font-semibold"><dt>Saldo por cobrar</dt><dd className="font-mono tabular-nums">{formatCurrency(doc.balance)}</dd></div> : null}
      </dl>

      {doc.notes ? <p className="mt-6 text-[13px] text-[#5E5D63]"><b className="text-[#0B0B0C]">{isNote ? "Motivo: " : "Notas: "}</b>{doc.notes}</p> : null}
      {doc.voidReason ? <p className="mt-2 text-[13px] text-[#9B2C2C]"><b>Anulado:</b> {doc.voidReason}</p> : null}

      {doc.related.length ? (
        <section aria-label="Documentos relacionados" className="mt-8 border-t border-[#E4E1DA] pt-4 print:hidden">
          <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-[#5E5D63]">Notas y documentos relacionados</h3>
          <ul className="grid gap-1.5 text-[13.5px]">
            {doc.related.map((r) => (
              <li key={r.id} className="flex items-center gap-3">
                <button type="button" onClick={() => onOpenDocument?.(r.id)} className="font-mono font-semibold underline underline-offset-2">{r.code}</button>
                <span className="text-[#5E5D63]">{DOCUMENT_LABELS[r.kind]}</span>
                <span className="ml-auto font-mono tabular-nums">{formatCurrency(r.total)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}

function Total({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between">
      <dt className="text-[#5E5D63]">{label}</dt>
      <dd className="font-mono tabular-nums">{formatCurrency(value)}</dd>
    </div>
  );
}
