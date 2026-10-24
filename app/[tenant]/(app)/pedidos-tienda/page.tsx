import { notFound } from "next/navigation";
import { Alert } from "@/components/molecules/alert";
import { PageHeader } from "@/components/molecules/page-header";
import { can } from "@/lib/business/permissions";
import { listOrders } from "@/lib/store/store-db";
import { requireTenantContext } from "@/lib/tenant/context";
import OrdersView from "./_components/orders-view";

/** Pedidos de la tienda en línea: quién pidió qué, si ya pagó y lo que hay que revisar. */
export default async function StoreOrdersPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const ctx = await requireTenantContext(tenant, "/pedidos-tienda");
  if (!ctx) notFound();
  const header = <PageHeader eyebrow="Visibilidad" title="Pedidos de la tienda" description="Lo que piden tus clientes desde tu sitio. Se confirman cuando llega el pago." />;
  if (!can(ctx.role, "money.handle")) {
    return (
      <div className="grid gap-5">
        {header}
        <Alert tone="info">Tu rol no maneja los pedidos de la tienda.</Alert>
      </div>
    );
  }
  return (
    <div className="grid gap-5">
      {header}
      <OrdersView slug={tenant} orders={await listOrders(ctx.tenantId)} />
    </div>
  );
}
