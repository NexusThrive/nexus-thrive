import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { db } from "@/prisma/db";
import { createTenantDb } from "@/lib/tenant-db";
import { getQuoteTerms, getVerticalTerms } from "@/lib/vertical-terms";
import QuoteBuilder from "../_components/quote-builder";

/**
 * Nuevo presupuesto: el cotizador es un componente cliente que carga a
 * sus clientes y el catálogo APU con los precios vigentes. Los totales
 * que muestra son previsualización; el servidor recalcula al guardar.
 */
export default async function NewQuotePage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;

  const tenantRecord = await db.orm.public.Tenant.where({
    slug: tenantSlug,
    active: true,
  }).first();
  if (!tenantRecord) {
    notFound();
  }

  const tenantDb = createTenantDb(tenantRecord.id);
  const [customers, catalog] = await Promise.all([
    tenantDb.customers.list(),
    tenantDb.apu.listActivities({}),
  ]);

  const terms = getQuoteTerms(tenantRecord.vertical);
  const baseTerms = getVerticalTerms(tenantRecord.vertical);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-1">
        <Link
          href={`/${tenantSlug}/quotes`}
          className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground/80"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Volver a {terms.quotes.toLowerCase()}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Nuevo {terms.quote.toLowerCase()}
        </h1>
        <p className="text-sm text-muted-foreground">
          Arma el {terms.quote.toLowerCase()} con el catálogo APU y ajusta la
          AIU. El servidor recalcula todo con precisión decimal exacta.
        </p>
      </header>

      <QuoteBuilder
        tenantSlug={tenantSlug}
        customers={customers
          .filter((customer) => customer.active)
          .map((customer) => ({ id: customer.id, name: customer.name }))}
        activities={catalog.rows}
        quoteLabel={terms.quote}
        customerLabel={baseTerms.customer}
      />
    </div>
  );
}