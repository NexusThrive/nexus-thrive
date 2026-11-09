import { notFound } from "next/navigation";
import { PageHeader } from "@/components/molecules/page-header";
import { PermissionNotice } from "@/components/molecules/permission-notice";
import { listPriceLists } from "@/lib/business/catalog/price-lists-db";
import { canManage } from "@/lib/core/auth/roles";
import { requireTenantContext } from "@/lib/core/tenancy/context";
import PriceListsView from "./_components/price-lists-view";

/** Listas de precios: mayorista, detal, convenios… Cada una puede cambiar el precio de algunos o de todos los productos. */
export default async function PriceListsPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const ctx = await requireTenantContext(tenant, "/ventas/listas-precios");
  if (!ctx) notFound();
  if (!canManage(ctx.role)) {
    return (
      <div className="grid gap-5">
        <PageHeader title="Listas de precios" description="Precios distintos según el cliente o el canal." />
        <PermissionNotice permission="business.manage" action="cambiar las listas de precios" />
      </div>
    );
  }
  const lists = await listPriceLists(ctx.tenantId);
  return (
    <div className="grid gap-5">
      <PageHeader title="Listas de precios" description="Precios distintos según el cliente o el canal (mayorista, detal, convenios). Lo que no tiene precio en la lista usa el precio de venta del producto." />
      <PriceListsView slug={tenant} lists={lists} />
    </div>
  );
}
