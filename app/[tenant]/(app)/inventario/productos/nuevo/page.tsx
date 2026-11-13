import { notFound } from "next/navigation";
import { PermissionNotice } from "@/components/molecules/permission-notice";
import { PageHeader } from "@/components/molecules/page-header";
import { listAttributes } from "@/lib/business/catalog/attributes-db";
import { kindsForVertical } from "@/lib/business/catalog/catalog-kinds";
import { listCategories } from "@/lib/business/catalog/categories-db";
import { EMPTY_PRODUCT_DRAFT } from "@/lib/business/catalog/product-form";
import type { ProductKindValue } from "@/lib/business/catalog/products-db";
import { canManage } from "@/lib/core/auth/roles";
import { requireTenantContext } from "@/lib/core/tenancy/context";
import ProductForm from "../_components/product-form";

/** Nuevo producto, servicio, plan, entrada o tour: formulario en página con previsualización. */
export default async function NewProductPage({ params, searchParams }: { params: Promise<{ tenant: string }>; searchParams: Promise<{ tipo?: string }> }) {
  const { tenant } = await params;
  const { tipo } = await searchParams;
  const ctx = await requireTenantContext(tenant, "/inventario/productos");
  if (!ctx) notFound();
  if (!canManage(ctx.role)) {
    return (
      <div data-bleed="" className="grid gap-5 px-6 pb-8 pt-6">
        <PageHeader title="Nuevo producto" />
        <PermissionNotice permission="business.manage" action="crear productos" />
      </div>
    );
  }
  const kinds = kindsForVertical(ctx.vertical);
  const kind = (kinds.find((k) => k === tipo) ?? kinds[0]) as ProductKindValue;
  const [categories, attributes] = await Promise.all([listCategories(ctx.tenantId), listAttributes(ctx.tenantId)]);
  return (
    <ProductForm
      slug={tenant}
      productId={null}
      initial={{ ...EMPTY_PRODUCT_DRAFT, kind, trackStock: kind === "PRODUCT" }}
      kinds={kinds}
      categories={categories}
      attributes={attributes}
      variantNames={[]}
      stock={null}
      imageUrl={null}
    />
  );
}
