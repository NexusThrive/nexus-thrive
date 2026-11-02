import { notFound } from "next/navigation";
import { PageHeader } from "@/components/molecules/page-header";
import { listInvoices } from "@/lib/business/sales/invoices-db";
import { listProducts } from "@/lib/business/catalog/products-db";
import { canHandleCash, canManage } from "@/lib/core/auth/roles";
import { requireTenantContext } from "@/lib/core/tenancy/context";
import { customerOptions } from "@/lib/business/customers/customers-db";
import BillingList from "./_components/billing-list";
import { bogotaDay } from "@/lib/foundation/dates/plain-date";

/** Facturación V1: cuentas de cobro y recibos numerados (la factura electrónica DIAN llega con un proveedor). */
export default async function BillingPage({ params, searchParams }: { params: Promise<{ tenant: string }>; searchParams: Promise<{ nuevo?: string; doc?: string }> }) {
  const { tenant } = await params;
  const { nuevo, doc } = await searchParams;
  const ctx = await requireTenantContext(tenant, "/billing");
  if (!ctx) notFound();
  const [rows, customers, products] = await Promise.all([
    listInvoices(ctx.tenantId),
    customerOptions(ctx.tenantId),
    listProducts(ctx.tenantId, { activeOnly: true }),
  ]);
  return (
    <div className="grid gap-5">
      <PageHeader title="Facturación" description="Cuentas de cobro y recibos numerados. Al marcarlos como pagados se registra el cobro con su recibo." />
      <BillingList
        slug={tenant}
        rows={rows}
        customers={customers}
        products={products.map((p) => ({ id: p.id, name: p.name, price: p.price }))}
        today={bogotaDay()}
        canCreate={canHandleCash(ctx.role)}
        initialNew={nuevo === "1"}
        initialDoc={doc ?? null}
        canManage={canManage(ctx.role)}
      />
    </div>
  );
}
