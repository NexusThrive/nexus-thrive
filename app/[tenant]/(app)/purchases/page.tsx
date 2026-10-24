import { notFound } from "next/navigation";
import { Alert } from "@/components/molecules/alert";
import { PageHeader } from "@/components/molecules/page-header";
import { canManage } from "@/lib/business/roles";
import { listProducts } from "@/lib/business/products-db";
import { listWarehouses } from "@/lib/inventory/kardex";
import { todayBogota } from "@/lib/ops/leads";
import { listParties } from "@/lib/parties/parties-db";
import { listOrders } from "@/lib/purchasing/purchases-db";
import { tenantWithModules } from "@/lib/tenant/membership";
import { requireTenantContext } from "@/lib/tenant/context";
import PurchasesView from "./_components/purchases-view";
import { routeCategory } from "@/lib/navigation/tenant-nav";

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
  const title = ctx.vertical === "restaurant" ? "Compras de insumos" : "Compras";

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
        today={todayBogota()}
      />
    </div>
  );
}
