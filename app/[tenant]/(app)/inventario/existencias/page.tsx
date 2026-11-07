import { notFound } from "next/navigation";
import { PermissionNotice } from "@/components/molecules/permission-notice";
import { PageHeader } from "@/components/molecules/page-header";
import { canManage } from "@/lib/core/auth/roles";
import { listProducts } from "@/lib/business/catalog/products-db";
import { listWarehouses } from "@/lib/business/inventory/kardex";
import { listCounts, listTransfers, reorderOverview, stockOverview } from "@/lib/business/inventory/stock-docs-db";
import { requireTenantContext } from "@/lib/core/tenancy/context";
import { tenantWithModules } from "@/lib/core/tenancy/membership";
import StockView from "./_components/stock-view";

/**
 * Existencias: qué hay en cada bodega, traslados entre bodegas, conteos físicos
 * con ajuste en el kardex y reposición. Parte de «Catálogo e inventario».
 */
export default async function StockPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const ctx = await requireTenantContext(tenant, "/inventario/existencias");
  if (!ctx) notFound();
  if (!canManage(ctx.role)) {
    return (
      <div className="grid gap-5">
        <PageHeader title="Existencias" description="Bodegas, traslados, conteos y reposición." />
        <PermissionNotice permission="business.manage" action="manejar el inventario" />
      </div>
    );
  }
  const [record, warehouses, overview, transfers, counts, reorder, products] = await Promise.all([
    tenantWithModules(ctx.tenantId),
    listWarehouses(ctx.tenantId),
    stockOverview(ctx.tenantId),
    listTransfers(ctx.tenantId),
    listCounts(ctx.tenantId),
    reorderOverview(ctx.tenantId),
    listProducts(ctx.tenantId, { kind: ["PRODUCT"], activeOnly: true }),
  ]);
  const purchasesActive = !!record?.modules.some((m) => m.active && String(m.moduleName) === "purchases");
  return (
    <div className="grid gap-5">
      <PageHeader title="Existencias" description="Qué hay en cada bodega, cómo se mueve y qué conviene reponer." />
      <StockView
        slug={tenant}
        warehouses={warehouses}
        overview={overview}
        transfers={transfers}
        counts={counts}
        reorder={reorder}
        products={products.filter((p) => p.trackStock).map((p) => ({ id: p.id, name: p.name }))}
        purchasesActive={purchasesActive}
      />
    </div>
  );
}
