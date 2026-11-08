import { notFound } from "next/navigation";
import { PageHeader } from "@/components/molecules/page-header";
import { PermissionNotice } from "@/components/molecules/permission-notice";
import { priceListLines } from "@/lib/business/catalog/price-lists-db";
import { pricingFor } from "@/lib/business/catalog/pricing-db";
import { customerOptions } from "@/lib/business/customers/customers-db";
import { db } from "@/prisma/db";
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
  const [pricing, groups, assigned, options] = await Promise.all([
    pricingFor(ctx.tenantId, id),
    db.orm.public.CustomerGroup.where({ tenantId: ctx.tenantId }).select("id", "name", "priceListId").orderBy((g) => g.name.asc()).limit(200).all(),
    db.orm.public.Customer.where({ tenantId: ctx.tenantId, priceListId: id }).select("id", "name").orderBy((c) => c.name.asc()).limit(200).all(),
    customerOptions(ctx.tenantId),
  ]);
  const tiers = Object.fromEntries(Object.entries(pricing).filter(([, p]) => p.tiers.length).map(([productId, p]) => [productId, p.tiers]));
  return <PriceListDetail slug={tenant} list={detail.list} lines={detail.lines} tiers={tiers} groups={groups.map((g) => ({ id: g.id, name: g.name, usesThis: g.priceListId === id }))} assigned={assigned.map((c) => ({ id: c.id, name: c.name }))} customers={options} />;
}
