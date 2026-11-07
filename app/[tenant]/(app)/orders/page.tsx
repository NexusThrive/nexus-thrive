import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/molecules/page-header";
import { PermissionNotice } from "@/components/molecules/permission-notice";
import { listOrders } from "@/lib/business/store/store-db";
import { can } from "@/lib/core/auth/permissions";
import { requireTenantContext } from "@/lib/core/tenancy/context";
import { listProduction } from "@/lib/business/store/production-db";
import OrdersView from "./_components/orders-view";
import { ProductionBoard } from "./_components/production-board";

export const metadata: Metadata = { title: "Pedidos" };

/** Pedidos: de la tienda y de las cotizaciones aprobadas, con su cumplimiento (recibido → entregado) separado del pago. */
export default async function OrdersPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const ctx = await requireTenantContext(tenant, "/orders");
  if (!ctx) notFound();
  const header = <PageHeader title="Pedidos" description="Lo que piden tus clientes y en qué paso va cada uno, desde que lo recibes hasta que lo entregas." />;
  if (!can(ctx.role, "orders.work")) {
    return (
      <div className="grid gap-5">
        {header}
        <PermissionNotice permission="orders.work" action="manejar los pedidos" />
      </div>
    );
  }
  return (
    <div className="grid gap-5">
      {header}
      <OrdersView slug={tenant} canCharge={can(ctx.role, "money.handle")} orders={await listOrders(ctx.tenantId, 200)} />
      <section aria-labelledby="produccion" className="grid gap-2">
        <h2 id="produccion" className="text-base font-semibold">Producción</h2>
        <ProductionBoard slug={tenant} rows={await listProduction(ctx.tenantId)} />
      </section>
    </div>
  );
}
