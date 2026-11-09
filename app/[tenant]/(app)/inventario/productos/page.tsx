import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/molecules/page-header";
import { kindsForVertical, KIND_LABELS } from "@/lib/business/catalog/catalog-kinds";
import { listCategories, syncCategoriesFromText } from "@/lib/business/catalog/categories-db";
import { listProducts } from "@/lib/business/catalog/products-db";
import { canManage } from "@/lib/core/auth/roles";
import { requireTenantContext } from "@/lib/core/tenancy/context";
import { customerOptions } from "@/lib/business/customers/customers-db";
import CatalogView from "./_components/catalog-view";

/** Catálogo e inventario: lo que vende el negocio (productos, servicios, planes, entradas o tours según su rubro). */
export default async function InventoryPage({ params, searchParams }: { params: Promise<{ tenant: string }>; searchParams: Promise<{ nuevo?: string; vista?: string }> }) {
  const { tenant } = await params;
  const { nuevo, vista } = await searchParams;
  // Los enlaces de antes (`?nuevo=1`, de los primeros pasos) abren ahora la página de alta.
  if (nuevo === "1") redirect(`/${tenant}/inventario/productos/nuevo`);
  const ctx = await requireTenantContext(tenant, "/inventario/productos");
  if (!ctx) notFound();
  const kinds = kindsForVertical(ctx.vertical);
  await syncCategoriesFromText(ctx.tenantId);
  const [products, customers, categories] = await Promise.all([
    listProducts(ctx.tenantId, { kind: kinds }),
    customerOptions(ctx.tenantId),
    listCategories(ctx.tenantId),
  ]);
  return (
    <div className="grid gap-5">
      <PageHeader title="Catálogo" description={`${kinds.map((k) => KIND_LABELS[k].many).join(", ")}: precios, inventario y ventas.`} />
      <CatalogView slug={tenant} products={products} kinds={kinds} categories={categories} customers={customers} canManage={canManage(ctx.role)} vista={vista === "tabla" ? "tabla" : "tarjetas"} />
    </div>
  );
}
