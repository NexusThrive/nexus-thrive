import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/molecules/page-header";
import { listProducts } from "@/lib/business/catalog/products-db";
import { customerOptions } from "@/lib/business/customers/customers-db";
import { listSalesQuotes } from "@/lib/business/sales/sales-quotes-db";
import { requireTenantContext } from "@/lib/core/tenancy/context";
import { todayCO } from "@/lib/foundation/dates/plain-date";
import QuotesView from "./_components/quotes-view";

export const metadata: Metadata = { title: "Cotizaciones" };

/** Cotizaciones comerciales con tu catálogo. Al aprobarlas nace el pedido, con su anticipo pendiente en la cartera. */
export default async function CotizacionesPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const ctx = await requireTenantContext(tenant, "/ventas/cotizaciones");
  if (!ctx) notFound();
  const [quotes, customers, products] = await Promise.all([listSalesQuotes(ctx.tenantId), customerOptions(ctx.tenantId), listProducts(ctx.tenantId, { activeOnly: true, kind: ["PRODUCT", "SERVICE"], limit: 300 })]);
  return (
    <div className="grid gap-5">
      <PageHeader title="Cotizaciones" description="Cotiza con tu catálogo. Cuando el cliente aprueba, nace el pedido con su anticipo." />
      <QuotesView slug={tenant} quotes={quotes} customers={customers} products={products.map((p) => ({ id: p.id, name: p.name, price: p.price }))} today={todayCO()} />
    </div>
  );
}
