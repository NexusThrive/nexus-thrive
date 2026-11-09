import { notFound } from "next/navigation";
import { PermissionNotice } from "@/components/molecules/permission-notice";
import { PageHeader } from "@/components/molecules/page-header";
import { listAttributes } from "@/lib/business/catalog/attributes-db";
import { listVariants } from "@/lib/business/catalog/catalog-db";
import { kindsForVertical } from "@/lib/business/catalog/catalog-kinds";
import { listCategories } from "@/lib/business/catalog/categories-db";
import { loadProductForm } from "@/lib/business/catalog/product-form-db";
import { canManage } from "@/lib/core/auth/roles";
import { requireTenantContext } from "@/lib/core/tenancy/context";
import ProductForm from "../_components/product-form";

/** Editar un producto: el mismo formulario del alta, con sus datos, atributos y variantes. */
export default async function EditProductPage({ params }: { params: Promise<{ tenant: string; id: string }> }) {
  const { tenant, id } = await params;
  const ctx = await requireTenantContext(tenant, "/inventario/productos");
  if (!ctx) notFound();
  if (!canManage(ctx.role)) {
    return (
      <div className="grid gap-5">
        <PageHeader title="Producto" />
        <PermissionNotice permission="business.manage" action="editar productos" />
      </div>
    );
  }
  const product = await loadProductForm(ctx.tenantId, id);
  if (!product) notFound();
  const [categories, attributes, variants] = await Promise.all([listCategories(ctx.tenantId), listAttributes(ctx.tenantId), listVariants(ctx.tenantId, id)]);
  const { id: _id, stock, imageUrl, barcodes: _barcodes, variantCount: _count, ...draft } = product;
  void _id; void _barcodes; void _count;
  return (
    <ProductForm
      slug={tenant}
      productId={id}
      initial={draft}
      kinds={kindsForVertical(ctx.vertical)}
      categories={categories}
      attributes={attributes}
      variantNames={variants.map((v) => v.name)}
      stock={stock}
      imageUrl={imageUrl}
    />
  );
}
