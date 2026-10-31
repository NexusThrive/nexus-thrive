import { notFound } from "next/navigation";
import { Alert } from "@/components/molecules/alert";
import { PageHeader } from "@/components/molecules/page-header";
import { canManage } from "@/lib/core/auth/roles";
import { listProducts } from "@/lib/business/catalog/products-db";
import { listWarehouses } from "@/lib/business/inventory/kardex";
import { listParties } from "@/lib/core/parties/parties-db";
import { listOrders } from "@/lib/business/purchasing/purchases-db";
import { tenantWithModules } from "@/lib/core/tenancy/membership";
import { requireTenantContext } from "@/lib/core/tenancy/context";
import PurchasesView from "./_components/purchases-view";
import { routeCategory } from "@/lib/experience/navigation/tenant-nav";
import { getVerticalTerms } from "@/lib/core/sectors/terms";
import { bogotaDay } from "@/lib/plain-date";

/**
 * Compras a proveedores: órdenes, recepción de mercancía al inventario y
 * proveedores. Pertenece al módulo `purchases`; necesita `inventory` (la
 * mercancía entra por su servicio de stock).
 */
export default async function PurchasesPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const ctx = await requireTenantContext(tenant, "/purchases");
  if (!ctx) notFound();
  const record = await tenantWithModules(ctx.tenantId);
  const inventoryActive = !!record?.modules.some((m) => m.active && String(m.moduleName) === "inventory");
  const title = getVerticalTerms(ctx.vertical).purchases ?? "Compras";

  if (!canManage(ctx.role)) {
    return (
      <div className="grid gap-5">
        <PageHeader eyebrow={routeCategory("/purchases")} title={title} description="Órdenes de compra, proveedores y recepción de mercancía." />
        <Alert tone="info">Solo el dueño o administración maneja las compras.</Alert>
      </div>
    );
  }
  if (!inventoryActive) {
    return (
      <div className="grid gap-5">
        <PageHeader eyebrow={routeCategory("/purchases")} title={title} description="Órdenes de compra, proveedores y recepción de mercancía." />
        <Alert tone="warning" title="Falta el módulo «Catálogo e inventario»">
          La mercancía que recibes entra al inventario. Actívalo en Configuración → Módulos para empezar a comprar.
        </Alert>
      </div>
    );
  }

  const [orders, suppliers, products, warehouses] = await Promise.all([
    listOrders(ctx.tenantId),
    listParties(ctx.tenantId, { role: "SUPPLIER", limit: 50 }),
    listProducts(ctx.tenantId, { kind: ["PRODUCT"], activeOnly: true }),
    listWarehouses(ctx.tenantId),
  ]);
  return (
    <div className="grid gap-5">
      <PageHeader eyebrow={routeCategory("/purchases")} title={title} description="Pide a tus proveedores y, al llegar la mercancía, entra al inventario con su costo." />
      <PurchasesView
        slug={tenant}
        orders={orders}
        suppliers={suppliers}
        products={products.filter((p) => p.trackStock).map((p) => ({ id: p.id, name: p.name, cost: p.cost, stock: p.stock }))}
        warehouses={warehouses}
        today={bogotaDay()}
      />
    </div>
  );
}
