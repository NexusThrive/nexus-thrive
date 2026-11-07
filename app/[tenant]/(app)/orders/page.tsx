import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/molecules/page-header";
import { PermissionNotice } from "@/components/molecules/permission-notice";
import { listOrders } from "@/lib/business/store/store-db";
import { can } from "@/lib/core/auth/permissions";
import { requireTenantContext } from "@/lib/core/tenancy/context";
import OrdersView from "./_components/orders-view";

export const metadata: Metadata = { title: "Pedidos" };

/** Pedidos: de la tienda y de las cotizaciones aprobadas, con su cumplimiento (recibido → entregado) separado del pago. */
export default async function OrdersPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const ctx = await requireTenantContext(tenant, "/orders");
  if (!ctx) notFound();
  const header = <PageHeader title="Pedidos" description="Lo que piden tus clientes y en qué paso va cada uno, desde que lo recibes hasta que lo entregas." />;
  if (!can(ctx.role, "money.handle")) {
    return (
      <div className="grid gap-5">
        {header}
        <PermissionNotice permission="money.handle" action="manejar los pedidos" />
      </div>
    );
  }
  return (
    <div className="grid gap-5">
      {header}
      <OrdersView slug={tenant} orders={await listOrders(ctx.tenantId, 200)} />
    </div>
  );
}
