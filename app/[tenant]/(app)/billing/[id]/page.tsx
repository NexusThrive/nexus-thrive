import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/atoms/badge";
import { amountInWords, INVOICE_KIND_LABELS, invoiceCode } from "@/lib/business/invoice";
import { getInvoice } from "@/lib/business/invoices-db";
import { canManage } from "@/lib/business/roles";
import { formatCurrency } from "@/lib/format";
import { requireTenantContext } from "@/lib/tenant/context";
import { db } from "@/prisma/db";
import InvoiceActions from "./invoice-actions";

/** Cuenta de cobro o recibo listo para imprimir o guardar como PDF. */
export default async function InvoicePage({ params }: { params: Promise<{ tenant: string; id: string }> }) {
  const { tenant, id } = await params;
  const ctx = await requireTenantContext(tenant, "/billing");
  if (!ctx) notFound();
  const [inv, biz] = await Promise.all([getInvoice(ctx.tenantId, id), db.orm.public.Tenant.where({ id: ctx.tenantId }).select("name", "legalName", "taxId", "address", "city", "whatsappNumber").first()]);
  if (!inv || !biz) notFound();
  const fmt = (d: string) => new Intl.DateTimeFormat("es-CO", { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/${tenant}/billing`} className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground">
          <ArrowLeft aria-hidden="true" className="size-3.5" /> Facturación
        </Link>
        <InvoiceActions slug={tenant} id={inv.id} status={inv.status} canManage={canManage(ctx.role)} />
      </div>
      <article className="mx-auto w-full max-w-3xl rounded-lg border border-border bg-white p-6 text-[#0B0B0C] shadow-sm sm:p-10 print:max-w-none print:border-0 print:p-0 print:shadow-none">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[#E4E1DA] pb-5">
          <div>
            <p className="font-display text-xl font-bold">{biz.legalName || biz.name}</p>
            <p className="text-[13px] text-[#5E5D63]">{[biz.taxId ? `NIT ${biz.taxId}` : null, biz.address, biz.city, biz.whatsappNumber].filter(Boolean).join(" · ")}</p>
          </div>
          <div className="text-right">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#8A8990]">{INVOICE_KIND_LABELS[inv.kind]}</p>
            <p className="font-display text-2xl font-bold">{invoiceCode(inv.kind, inv.number)}</p>
            {inv.status !== "ISSUED" ? <Badge tone={inv.status === "PAID" ? "success" : "muted"}>{inv.status === "PAID" ? "Pagada" : "Anulada"}</Badge> : null}
          </div>
        </header>
        <section className="grid gap-1 py-5 text-[14px] sm:grid-cols-2">
          <p>
            <span className="text-[#5E5D63]">{inv.kind === "BILL" ? "Debe a la orden de " : "Recibimos de "}</span>
            {inv.kind === "BILL" ? <b>{biz.legalName || biz.name}</b> : <b>{inv.customerName}</b>}
          </p>
          <p className="sm:text-right">
            <span className="text-[#5E5D63]">Fecha: </span>
            {fmt(inv.issueDate)}
          </p>
          <p>
            <span className="text-[#5E5D63]">{inv.kind === "BILL" ? "Cliente: " : "Documento: "}</span>
            {inv.kind === "BILL" ? inv.customerName : (inv.customerDoc ?? "—")}
            {inv.kind === "BILL" && inv.customerDoc ? ` · ${inv.customerDoc}` : ""}
          </p>
          {inv.dueDate ? (
            <p className="sm:text-right">
              <span className="text-[#5E5D63]">Vence: </span>
              {fmt(inv.dueDate)}
            </p>
          ) : null}
        </section>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[460px] border-collapse text-[13.5px]">
            <thead>
              <tr className="border-y border-[#E4E1DA] text-left text-[11px] uppercase tracking-[0.08em] text-[#8A8990]">
                <th className="py-2 font-semibold">Concepto</th>
                <th className="py-2 text-right font-semibold">Cant.</th>
                <th className="py-2 text-right font-semibold">Valor unitario</th>
                <th className="py-2 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {inv.lines.map((l) => (
                <tr key={l.id} className="border-b border-[#EFEDE7]">
                  <td className="py-2.5">{l.description}</td>
                  <td className="py-2.5 text-right tabular-nums">{l.quantity.toLocaleString("es-CO")}</td>
                  <td className="py-2.5 text-right tabular-nums">{formatCurrency(l.unitPrice)}</td>
                  <td className="py-2.5 text-right tabular-nums">{formatCurrency(l.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col items-end gap-1 py-5">
          <p className="font-display text-2xl font-bold tabular-nums">{formatCurrency(inv.total)}</p>
          <p className="text-[12.5px] text-[#5E5D63]">Son: {amountInWords(inv.total)}</p>
        </div>
        {inv.notes ? <p className="whitespace-pre-wrap rounded-md bg-[#F7F6F3] p-3 text-[13px]">{inv.notes}</p> : null}
        {inv.voidReason ? <p className="mt-3 text-[13px] text-[#B3362C]">Anulada: {inv.voidReason}</p> : null}
        {inv.kind === "BILL" ? (
          <footer className="mt-10 grid gap-1 text-[13px] sm:w-72">
            <span className="border-t border-[#0B0B0C] pt-2">Firma</span>
            <span className="text-[#5E5D63]">{biz.legalName || biz.name}</span>
          </footer>
        ) : null}
      </article>
    </div>
  );
}
