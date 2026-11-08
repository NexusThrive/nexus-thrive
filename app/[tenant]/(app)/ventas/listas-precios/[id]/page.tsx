import { notFound } from "next/navigation";
import { PageHeader } from "@/components/molecules/page-header";
import { PermissionNotice } from "@/components/molecules/permission-notice";
import { priceListLines } from "@/lib/business/catalog/price-lists-db";
import { canManage } from "@/lib/core/auth/roles";
import { requireTenantContext } from "@/lib/core/tenancy/context";
import PriceListDetail from "../_components/price-list-detail";

/** Los precios de una lista: el precio base de cada producto y el que lleva en esta lista. */
export default async function PriceListPage({ params }: { params: Promise<{ tenant: string; id: string }> }) {
  const { tenant, id } = await params;
  const ctx = await requireTenantContext(tenant, "/ventas/listas-precios");
  if (!ctx) notFound();
  if (!canManage(ctx.role)) {
    return (
      <div className="grid gap-5">
        <PageHeader title="Lista de precios" />
        <PermissionNotice permission="business.manage" action="cambiar las listas de precios" />
      </div>
    );
  }
  const detail = await priceListLines(ctx.tenantId, id);
  if (!detail) notFound();
  return <PriceListDetail slug={tenant} list={detail.list} lines={detail.lines} />;
}
