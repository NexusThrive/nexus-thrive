import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  FileText,
  Printer,
  User,
  Wallet,
} from "lucide-react";
import { db } from "@/prisma/db";
import { createTenantDb } from "@/lib/tenant/db";
import { getQuoteTerms, getVerticalTerms } from "@/lib/vertical-terms";
import { formatCurrency, formatDateShort } from "@/lib/format";
import { QuoteStatusBadge } from "@/components/molecules/quote-badges";
import { buttonVariants } from "@/components/atoms/button-variants";
import { PageHeader } from "@/components/molecules/page-header";
import { requirePageContext } from "@/lib/tenant/context";

/**
 * Detalle de una cotización.
 *
 * Una cotización emitida desde una obra se gestiona en la pestaña
 * Cotizaciones de esa obra: aquí solo se redirige. Las cotizaciones
 * anteriores a la obra se muestran en solo lectura, con su documento para
 * imprimir y la opción de pasarlas a una obra (en Cotizaciones anteriores).
 *
 * Multi-tenant: `tenantDb.quotes.get(quoteId)` filtra por `tenantId`; si el
 * presupuesto no pertenece al tenant → 404 sin revelar su existencia.
 */
export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ tenant: string; id: string }>;
}) {
  const { tenant: tenantSlug, id: quoteId } = await params;

  // Sesión + negocio activo + membresía activa (SEC-03): no basta el layout.
  const pageCtx = await requirePageContext(tenantSlug, "/quotes");
  const tenantRecord = pageCtx.tenant;

  const owner = await db.orm.public.Quote.where({ id: quoteId, tenantId: tenantRecord.id })
    .select("projectId")
    .first();
  if (owner?.projectId) {
    redirect(`/${tenantSlug}/projects/${owner.projectId}?tab=cotizaciones`);
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
    <div className="space-y-6">
      <PageHeader
        eyebrow="Cotizaciones"
        title={<>{quote.code} · {quote.title}</>}
        description={<>Creado el {formatDateShort(quote.createdAt)}</>}
        actions={<><Link
          href={`/${tenantSlug}/quotes?folder=anteriores`}
          className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground/80"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Volver a cotizaciones anteriores
        </Link><QuoteStatusBadge status={quote.status} /></>}
      />

      {/* Acciones rápidas */}
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={`/${tenantSlug}/quotes/${quote.id}/print`}
          className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-accent/30 bg-accent-subtle px-3 text-sm font-medium text-accent-text transition hover:border-accent/40 hover:bg-accent-subtle"
        >
          <Printer aria-hidden="true" className="h-4 w-4" />
          Imprimir / PDF Cliente
        </Link>
        <Link
          href={`/${tenantSlug}/quotes?folder=anteriores`}
          className={buttonVariants({ variant: "outline" })}
        >
          Pasar a una obra
        </Link>
      </div>

      {/* Resumen */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-muted-foreground">
                {baseTerms.customer}
              </p>
              <p className="mt-2 truncate text-lg font-semibold text-foreground">
                {customer?.name ?? quote.customerName ?? "Sin cliente"}
              </p>
              {customer?.email ? (
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {customer.email}
                </p>
              ) : null}
              {customer?.phone ? (
                <p className="text-xs text-muted-foreground">{customer.phone}</p>
              ) : null}
            </div>
            <span
              aria-hidden="true"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground"
            >
              <User className="h-5 w-5" />
            </span>
          </div>
        </article>

        <article className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-muted-foreground">Estado</p>
              <div className="mt-2">
                <QuoteStatusBadge status={quote.status} />
              </div>
            </div>
            <span
              aria-hidden="true"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground"
            >
              <FileText className="h-5 w-5" />
            </span>
          </div>
        </article>

        <article className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-muted-foreground">Fecha</p>
              <p className="mt-2 text-lg font-semibold text-foreground">
                {formatDateShort(quote.createdAt)}
              </p>
            </div>
            <span
              aria-hidden="true"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground"
            >
              <CalendarDays className="h-5 w-5" />
            </span>
          </div>
        </article>

        <article className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-muted-foreground">Total</p>
              <p className="mt-2 text-lg font-semibold text-foreground">
                {formatCurrency(quote.totalAmount)}
              </p>
            </div>
            <span
              aria-hidden="true"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent-subtle text-accent-text"
            >
              <Wallet className="h-5 w-5" />
            </span>
          </div>
        </article>
      </div>

      {/* Actividades */}
      <section className="overflow-hidden rounded-lg border border-border bg-card">
        <header className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">
            {terms.quoteItems}
          </h2>
        </header>
        {quote.items.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">
            Sin actividades por mostrar.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-muted text-left text-xs font-semibold text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">{terms.quoteItem}</th>
                  <th className="px-4 py-3 font-medium">Unidad</th>
                  <th className="px-4 py-3 text-right font-medium">Cantidad</th>
                  <th className="px-4 py-3 text-right font-medium">
                    Vr. Unitario
                  </th>
                  <th className="px-4 py-3 text-right font-medium">
                    Vr. Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {quote.items.map((item) => (
                  <tr key={item.id} className="transition hover:bg-muted/60">
                    <td className="max-w-[16rem] truncate px-4 py-3 font-medium text-foreground">
                      {item.name}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{item.unit}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {item.quantity}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {formatCurrency(item.unitCost)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-foreground">
                      {formatCurrency(item.totalCost)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Desglose AIU */}
      <section className="flex justify-end">
        <div className="w-full max-w-sm rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground">
            Desglose financiero
          </h2>
          <dl className="mt-3 space-y-1.5 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <dt>Costo directo</dt>
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
            <div className="flex justify-between border-t border-border pt-2 text-base font-semibold text-foreground">
              <dt>Total</dt>
              <dd>{formatCurrency(quote.totalAmount)}</dd>
            </div>
          </dl>
        </div>
      </section>
    </div>
  );
}