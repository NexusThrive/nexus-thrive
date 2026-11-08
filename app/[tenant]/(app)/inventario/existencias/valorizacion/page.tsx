import { notFound } from "next/navigation";
import { PageHeader } from "@/components/molecules/page-header";
import { PermissionNotice } from "@/components/molecules/permission-notice";
import { listProducts } from "@/lib/business/catalog/products-db";
import { stockOverview } from "@/lib/business/inventory/stock-docs-db";
import { summarizeValuation } from "@/lib/business/inventory/valuation";
import { canManage } from "@/lib/core/auth/roles";
import { requireTenantContext } from "@/lib/core/tenancy/context";
import ValuationView from "./_components/valuation-view";

/** Valorización del inventario: cuánto vale lo que hay (a costo promedio), por categoría y por producto. */
export default async function ValuationPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const ctx = await requireTenantContext(tenant, "/inventario/existencias");
  if (!ctx) notFound();
  if (!canManage(ctx.role)) {
    return (
      <div className="grid gap-5">
        <PageHeader title="Valorización" description="Cuánto vale tu inventario." />
        <PermissionNotice permission="business.manage" action="ver la valorización del inventario" />
      </div>
    );
  }
  const [overview, products] = await Promise.all([stockOverview(ctx.tenantId), listProducts(ctx.tenantId, { kind: ["PRODUCT"], activeOnly: false })]);
  const category = new Map(products.map((p) => [p.id, p.category]));
  const valuation = summarizeValuation(overview.map((r) => ({ productId: r.productId, name: r.productName, category: category.get(r.productId) ?? null, units: r.quantity, value: r.value })));
  return (
    <div className="grid gap-5">
      <PageHeader title="Valorización" description="Cuánto vale lo que hay en tus bodegas, a costo promedio." />
      <ValuationView slug={tenant} valuation={valuation} />
    </div>
  );
}
