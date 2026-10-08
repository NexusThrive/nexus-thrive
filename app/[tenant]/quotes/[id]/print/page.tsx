import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { db } from "@/prisma/db";
import { createTenantDb } from "@/lib/tenant-db";
import { getQuoteTerms, getVerticalTerms } from "@/lib/vertical-terms";
import { formatCurrency, formatDateShort } from "@/lib/format";
import PrintButton from "./_components/print-button";

/**
 * Documento comercial para el cliente — Fase 3.
 *
 * Está FUERA del grupo `(app)`: no hereda header/sidebar del negocio ni el
 * layout responsive de pantalla. Renderiza un documento A4 con diseño propio
 * (encabezado, cliente, actividades, desglose AIU, condiciones y firmas).
 *
 * Los precios son los valores CONGELADOS del `QuoteItem` / `Quote`: nunca se
 * recalculan desde el catálogo vigente. El `apuSnapshot` solo se usa en la
 * explosión de insumos, no aquí.
 */
export default async function QuotePrintPage({
  params,
}: {
  params: Promise<{ tenant: string; id: string }>;
}) {
  const { tenant: tenantSlug, id: quoteId } = await params;

  const tenantRecord = await db.orm.public.Tenant.where({
    slug: tenantSlug,
    active: true,
  }).first();
  if (!tenantRecord) {
    notFound();
  }

  const tenantDb = createTenantDb(tenantRecord.id);
  const quote = await tenantDb.quotes.get(quoteId);
  if (!quote) {
    notFound();
  }

  const customer = quote.customerId
    ? await db.orm.public.Customer.where({
        id: quote.customerId,
        tenantId: tenantRecord.id,
      })
        .select("name", "email", "phone")
        .first()
    : null;

  const terms = getQuoteTerms(tenantRecord.vertical);
  const baseTerms = getVerticalTerms(tenantRecord.vertical);

  return (
    <div className="min-h-screen bg-slate-200 px-4 py-6 print:bg-white print:p-0">
      {/* Barra de acciones: invisible al imprimir */}
      <style>{`@page { size: A4; margin: 12mm; }`}</style>

      <div className="mx-auto mb-6 flex max-w-[210mm] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <Link
          href={`/${tenantSlug}/quotes/${quoteId}`}
          className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Volver al detalle
        </Link>
        <PrintButton />
      </div>

      {/* Documento A4 */}
      <article className="mx-auto w-full max-w-[210mm] rounded-lg bg-white px-8 py-10 text-slate-900 shadow-lg sm:px-10 print:max-w-none print:rounded-none print:px-0 print:py-0 print:shadow-none">
        {/* Encabezado */}
        <header className="flex flex-col gap-6 border-b border-slate-200 pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xl font-bold tracking-tight sm:text-2xl">
              {tenantRecord.name}
            </p>
            {tenantRecord.city ? (
              <p className="mt-1 text-sm text-slate-600">
                {tenantRecord.city}
              </p>
            ) : null}
            <address className="mt-2 space-y-0.5 not-italic text-xs text-slate-500">
              {tenantRecord.whatsappNumber ? (
                <p>WhatsApp: {tenantRecord.whatsappNumber}</p>
              ) : null}
              {tenantRecord.websiteUrl ? (
                <p>{tenantRecord.websiteUrl}</p>
              ) : null}
              {tenantRecord.instagramHandle ? (
                <p>@{tenantRecord.instagramHandle}</p>
              ) : null}
            </address>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-lg font-semibold uppercase tracking-wide text-slate-800">
              {terms.quote}
            </p>
            <p className="mt-1 font-mono text-sm font-medium text-slate-600">
              {quote.code}
            </p>
            <p className="mt-0.5 text-sm text-slate-600">
              Fecha: {formatDateShort(quote.createdAt)}
            </p>
          </div>
        </header>

        {/* Cliente */}
        <section className="border-b border-slate-200 py-6">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {baseTerms.customer}
          </h2>
          <dl className="mt-2 space-y-1 text-sm">
            <div className="flex gap-2">
              <dt className="w-20 shrink-0 text-slate-500">Nombre</dt>
              <dd className="font-medium text-slate-900">
                {customer?.name ?? quote.customerName ?? "—"}
              </dd>
            </div>
            {customer?.email ? (
              <div className="flex gap-2">
                <dt className="w-20 shrink-0 text-slate-500">Email</dt>
                <dd className="text-slate-700">{customer.email}</dd>
              </div>
            ) : null}
            {customer?.phone ? (
              <div className="flex gap-2">
                <dt className="w-20 shrink-0 text-slate-500">Teléfono</dt>
                <dd className="text-slate-700">{customer.phone}</dd>
              </div>
            ) : null}
          </dl>
          <p className="mt-3 text-sm">
            Proyecto:{" "}
            <span className="font-medium text-slate-900">{quote.title}</span>
          </p>
        </section>

        {/* Actividades */}
        <section className="border-b border-slate-200 py-6">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {terms.quoteItems}
          </h2>
          {quote.items.length === 0 ? (
            <p className="mt-4 text-sm text-slate-400">
              Sin actividades por mostrar.
            </p>
          ) : (
            <table className="mt-3 w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-2 font-medium">#</th>
                  <th className="py-2 pr-2 font-medium">
                    {terms.quoteItem}
                  </th>
                  <th className="py-2 pr-2 text-right font-medium">Und</th>
                  <th className="py-2 pr-2 text-right font-medium">Cant.</th>
                  <th className="py-2 pr-2 text-right font-medium">
                    Vr. Unitario
                  </th>
                  <th className="py-2 text-right font-medium">Vr. Total</th>
                </tr>
              </thead>
              <tbody>
                {quote.items.map((item, index) => (
                  <tr
                    key={item.id}
                    className="border-b border-slate-100 last:border-b-0"
                  >
                    <td className="py-2 pr-2 text-slate-400">{index + 1}</td>
                    <td className="py-2 pr-2 font-medium text-slate-900">
                      {item.name}
                    </td>
                    <td className="py-2 pr-2 text-right text-slate-600">
                      {item.unit}
                    </td>
                    <td className="py-2 pr-2 text-right text-slate-600">
                      {item.quantity}
                    </td>
                    <td className="py-2 pr-2 text-right text-slate-600">
                      {formatCurrency(item.unitCost)}
                    </td>
                    <td className="py-2 text-right font-semibold text-slate-900">
                      {formatCurrency(item.totalCost)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* Desglose financiero */}
        <section className="flex justify-end py-6">
          <dl className="w-full max-w-xs space-y-1.5 text-sm">
            <div className="flex justify-between text-slate-600">
              <dt>Costo Directo</dt>
              <dd className="font-medium text-slate-900">
                {formatCurrency(quote.directCost)}
              </dd>
            </div>
            <div className="flex justify-between text-slate-600">
              <dt>Administración ({quote.adminPercent}%)</dt>
              <dd>{formatCurrency(quote.administration)}</dd>
            </div>
            <div className="flex justify-between text-slate-600">
              <dt>Imprevistos ({quote.imprevPercent}%)</dt>
              <dd>{formatCurrency(quote.contingency)}</dd>
            </div>
            <div className="flex justify-between text-slate-600">
              <dt>Utilidad ({quote.utilPercent}%)</dt>
              <dd>{formatCurrency(quote.utility)}</dd>
            </div>
            <div className="flex justify-between text-slate-600">
              <dt>Subtotal</dt>
              <dd className="font-medium text-slate-900">
                {formatCurrency(quote.subtotal)}
              </dd>
            </div>
            <div className="flex justify-between text-slate-600">
              <dt>IVA sobre utilidad ({quote.taxPercent}%)</dt>
              <dd>{formatCurrency(quote.tax)}</dd>
            </div>
            <div className="flex justify-between border-t border-slate-300 pt-2 text-base font-bold text-slate-900">
              <dt>TOTAL</dt>
              <dd>{formatCurrency(quote.totalAmount)}</dd>
            </div>
          </dl>
        </section>

        {/* Condiciones comerciales */}
        <section className="border-t border-slate-200 py-6">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Condiciones comerciales
          </h2>
          <dl className="mt-3 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
            <div className="flex justify-between border-b border-dashed border-slate-200 pb-1">
              <dt className="text-slate-500">Validez de la oferta</dt>
              <dd className="text-slate-400">—</dd>
            </div>
            <div className="flex justify-between border-b border-dashed border-slate-200 pb-1">
              <dt className="text-slate-500">Forma de pago</dt>
              <dd className="text-slate-400">—</dd>
            </div>
            <div className="flex justify-between border-b border-dashed border-slate-200 pb-1">
              <dt className="text-slate-500">Tiempo estimado</dt>
              <dd className="text-slate-400">—</dd>
            </div>
            <div className="flex justify-between border-b border-dashed border-slate-200 pb-1">
              <dt className="text-slate-500">Observaciones</dt>
              <dd className="text-slate-400">—</dd>
            </div>
          </dl>
        </section>

        {/* Firmas */}
        <section className="grid gap-10 pt-8 sm:grid-cols-2">
          <div>
            <p className="text-sm font-semibold text-slate-800">
              Aceptación del cliente
            </p>
            <p className="mt-8 border-b border-slate-300 pb-1 text-xs text-slate-400">
              Nombre
            </p>
            <p className="mt-8 border-b border-slate-300 pb-1 text-xs text-slate-400">
              Firma
            </p>
            <div className="mt-8 grid grid-cols-2 gap-6">
              <p className="border-b border-slate-300 pb-1 text-xs text-slate-400">
                Documento
              </p>
              <p className="border-b border-slate-300 pb-1 text-xs text-slate-400">
                Fecha
              </p>
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">
              Autorización del negocio
            </p>
            <p className="mt-8 border-b border-slate-300 pb-1 text-xs text-slate-400">
              Firma autorizada
            </p>
            <p className="mt-8 text-xs text-slate-500">{tenantRecord.name}</p>
          </div>
        </section>
      </article>
    </div>
  );
}