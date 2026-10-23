import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { customerContact } from "@/lib/business/customers-db";
import { createTenantDb } from "@/lib/tenant/db";
import { getQuoteTerms, getVerticalTerms } from "@/lib/vertical-terms";
import { formatCurrency, formatDateShort } from "@/lib/format";
import PrintButton from "./_components/print-button";
import QuoteDocumentSheet from "@/components/organisms/quote-document-sheet";
import { buttonVariants } from "@/components/atoms/button-variants";
import { requirePageContext } from "@/lib/tenant/context";

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

  // Sesión + negocio activo + membresía activa (SEC-03): no basta el layout.
  const pageCtx = await requirePageContext(tenantSlug, "/quotes");
  const tenantRecord = pageCtx.tenant;

  const tenantDb = createTenantDb(tenantRecord.id);
  const terms = getQuoteTerms(tenantRecord.vertical);

  // Versión emitida desde una obra: se imprime su foto congelada.
  const versioned = await tenantDb.projectQuotes.getDocument(quoteId);
  if (versioned) {
    return (
      <div className="min-h-screen bg-muted px-4 py-6 print:bg-card print:p-0">
        <style>{`@page { size: A4; margin: 12mm; }`}</style>
        <div className="mx-auto mb-6 flex max-w-[210mm] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
          <Link
            href={`/${tenantSlug}/projects/${versioned.projectId}?tab=cotizaciones`}
            className={`${buttonVariants({ variant: "outline" })} w-fit`}
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Volver a la obra
          </Link>
          <PrintButton />
        </div>
        <QuoteDocumentSheet document={versioned.document} quoteLabel={terms.quote} />
      </div>
    );
  }

  const quote = await tenantDb.quotes.get(quoteId);
  if (!quote) {
    notFound();
  }

  const customer = quote.customerId
    ? await customerContact(tenantRecord.id, quote.customerId)
    : null;

  const baseTerms = getVerticalTerms(tenantRecord.vertical);

  return (
    <div className="min-h-screen bg-muted px-4 py-6 print:bg-card print:p-0">
      {/* Barra de acciones: invisible al imprimir */}
      <style>{`@page { size: A4; margin: 12mm; }`}</style>

      <div className="mx-auto mb-6 flex max-w-[210mm] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <Link
          href={`/${tenantSlug}/quotes/${quoteId}`}
          className={`${buttonVariants({ variant: "outline" })} w-fit`}
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Volver al detalle
        </Link>
        <PrintButton />
      </div>

      {/* Documento A4 */}
      <article className="mx-auto w-full max-w-[210mm] rounded-lg bg-card px-8 py-10 text-foreground sm:px-10 print:max-w-none print:rounded-none print:px-0 print:py-0 print:shadow-none">
        {/* Encabezado */}
        <header className="flex flex-col gap-6 border-b border-border pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xl font-bold tracking-tight sm:text-2xl">
              {tenantRecord.name}
            </p>
            {tenantRecord.city ? (
              <p className="mt-1 text-sm text-muted-foreground">
                {tenantRecord.city}
              </p>
            ) : null}
            <address className="mt-2 space-y-0.5 not-italic text-xs text-muted-foreground">
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
            <p className="text-lg font-semibold uppercase tracking-wide text-foreground">
              {terms.quote}
            </p>
            <p className="mt-1 font-mono text-sm font-medium text-muted-foreground">
              {quote.code}
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Fecha: {formatDateShort(quote.createdAt)}
            </p>
          </div>
        </header>

        {/* Cliente */}
        <section className="border-b border-border py-6">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {baseTerms.customer}
          </h2>
          <dl className="mt-2 space-y-1 text-sm">
            <div className="flex gap-2">
              <dt className="w-20 shrink-0 text-muted-foreground">Nombre</dt>
              <dd className="font-medium text-foreground">
                {customer?.name ?? quote.customerName ?? "—"}
              </dd>
            </div>
            {customer?.email ? (
              <div className="flex gap-2">
                <dt className="w-20 shrink-0 text-muted-foreground">Email</dt>
                <dd className="text-foreground/80">{customer.email}</dd>
              </div>
            ) : null}
            {customer?.phone ? (
              <div className="flex gap-2">
                <dt className="w-20 shrink-0 text-muted-foreground">Teléfono</dt>
                <dd className="text-foreground/80">{customer.phone}</dd>
              </div>
            ) : null}
          </dl>
          <p className="mt-3 text-sm">
            Proyecto:{" "}
            <span className="font-medium text-foreground">{quote.title}</span>
          </p>
        </section>

        {/* Actividades */}
        <section className="border-b border-border py-6">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {terms.quoteItems}
          </h2>
          {quote.items.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Sin actividades por mostrar.
            </p>
          ) : (
            <table className="mt-3 w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border-strong text-left text-xs font-semibold text-muted-foreground">
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
                    className="border-b border-border last:border-b-0"
                  >
                    <td className="py-2 pr-2 text-muted-foreground">{index + 1}</td>
                    <td className="py-2 pr-2 font-medium text-foreground">
                      {item.name}
                    </td>
                    <td className="py-2 pr-2 text-right text-muted-foreground">
                      {item.unit}
                    </td>
                    <td className="py-2 pr-2 text-right text-muted-foreground">
                      {item.quantity}
                    </td>
                    <td className="py-2 pr-2 text-right text-muted-foreground">
                      {formatCurrency(item.unitCost)}
                    </td>
                    <td className="py-2 text-right font-semibold text-foreground">
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
            <div className="flex justify-between text-muted-foreground">
              <dt>Costo Directo</dt>
              <dd className="font-medium text-foreground">
                {formatCurrency(quote.directCost)}
              </dd>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <dt>Administración ({quote.adminPercent}%)</dt>
              <dd>{formatCurrency(quote.administration)}</dd>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <dt>Imprevistos ({quote.imprevPercent}%)</dt>
              <dd>{formatCurrency(quote.contingency)}</dd>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <dt>Utilidad ({quote.utilPercent}%)</dt>
              <dd>{formatCurrency(quote.utility)}</dd>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <dt>Subtotal</dt>
              <dd className="font-medium text-foreground">
                {formatCurrency(quote.subtotal)}
              </dd>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <dt>IVA sobre utilidad ({quote.taxPercent}%)</dt>
              <dd>{formatCurrency(quote.tax)}</dd>
            </div>
            <div className="flex justify-between border-t border-border-strong pt-2 text-base font-bold text-foreground">
              <dt>TOTAL</dt>
              <dd>{formatCurrency(quote.totalAmount)}</dd>
            </div>
          </dl>
        </section>

        {/* Condiciones comerciales */}
        <section className="border-t border-border py-6">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Condiciones comerciales
          </h2>
          <dl className="mt-3 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
            <div className="flex justify-between border-b border-dashed border-border pb-1">
              <dt className="text-muted-foreground">Validez de la oferta</dt>
              <dd className="text-muted-foreground">—</dd>
            </div>
            <div className="flex justify-between border-b border-dashed border-border pb-1">
              <dt className="text-muted-foreground">Forma de pago</dt>
              <dd className="text-muted-foreground">—</dd>
            </div>
            <div className="flex justify-between border-b border-dashed border-border pb-1">
              <dt className="text-muted-foreground">Tiempo estimado</dt>
              <dd className="text-muted-foreground">—</dd>
            </div>
            <div className="flex justify-between border-b border-dashed border-border pb-1">
              <dt className="text-muted-foreground">Observaciones</dt>
              <dd className="text-muted-foreground">—</dd>
            </div>
          </dl>
        </section>

        {/* Firmas */}
        <section className="grid gap-10 pt-8 sm:grid-cols-2">
          <div>
            <p className="text-sm font-semibold text-foreground">
              Aceptación del cliente
            </p>
            <p className="mt-8 border-b border-border-strong pb-1 text-xs text-muted-foreground">
              Nombre
            </p>
            <p className="mt-8 border-b border-border-strong pb-1 text-xs text-muted-foreground">
              Firma
            </p>
            <div className="mt-8 grid grid-cols-2 gap-6">
              <p className="border-b border-border-strong pb-1 text-xs text-muted-foreground">
                Documento
              </p>
              <p className="border-b border-border-strong pb-1 text-xs text-muted-foreground">
                Fecha
              </p>
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Autorización del negocio
            </p>
            <p className="mt-8 border-b border-border-strong pb-1 text-xs text-muted-foreground">
              Firma autorizada
            </p>
            <p className="mt-8 text-xs text-muted-foreground">{tenantRecord.name}</p>
          </div>
        </section>
      </article>
    </div>
  );
}