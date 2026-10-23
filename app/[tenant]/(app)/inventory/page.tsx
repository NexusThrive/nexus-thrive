import { notFound } from "next/navigation";
import { PageHeader } from "@/components/molecules/page-header";
import { kindsForVertical, KIND_LABELS } from "@/lib/business/catalog-kinds";
import { listProducts } from "@/lib/business/products-db";
import { canManage } from "@/lib/business/roles";
import { requireTenantContext } from "@/lib/tenant/context";
import { customerOptions } from "@/lib/business/customers-db";
import CatalogView from "./_components/catalog-view";

/** Catálogo e inventario: lo que vende el negocio (productos, servicios, planes, entradas o tours según su rubro). */
export default async function InventoryPage({ params, searchParams }: { params: Promise<{ tenant: string }>; searchParams: Promise<{ nuevo?: string }> }) {
  const { tenant } = await params;
  const { nuevo } = await searchParams;
  const ctx = await requireTenantContext(tenant, "/inventory");
  if (!ctx) notFound();
  const kinds = kindsForVertical(ctx.vertical);
  const [products, customers] = await Promise.all([
    listProducts(ctx.tenantId, { kind: kinds }),
    customerOptions(ctx.tenantId),
  ]);
  return (
    <div className="grid gap-5">
      <PageHeader eyebrow="Clientes y operación" title="Catálogo" description={`${kinds.map((k) => KIND_LABELS[k].many).join(", ")}: precios, inventario y ventas.`} />
      <CatalogView slug={tenant} products={products} kinds={kinds} customers={customers} canManage={canManage(ctx.role)} initialNew={nuevo === "1"} />
    </div>
  );
}
