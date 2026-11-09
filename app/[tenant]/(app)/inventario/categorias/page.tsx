import { notFound } from "next/navigation";
import { PageHeader } from "@/components/molecules/page-header";
import { PermissionNotice } from "@/components/molecules/permission-notice";
import { listCategories, syncCategoriesFromText } from "@/lib/business/catalog/categories-db";
import { buildCategoryTree } from "@/lib/business/catalog/category-tree";
import { canManage } from "@/lib/core/auth/roles";
import { requireTenantContext } from "@/lib/core/tenancy/context";
import CategoriesView from "./_components/categories-view";

/** Categorías de productos: el árbol que ven el POS, la tienda y los informes (categoría y subcategoría). */
export default async function CategoriesPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const ctx = await requireTenantContext(tenant, "/inventario/categorias");
  if (!ctx) notFound();
  if (!canManage(ctx.role)) {
    return (
      <div className="grid gap-5">
        <PageHeader title="Categorías" description="Cómo se ordenan tus productos." />
        <PermissionNotice permission="business.manage" action="cambiar las categorías" />
      </div>
    );
  }
  // Las categorías escritas a mano en los productos de antes (o en una importación) se vuelven categorías de verdad.
  await syncCategoriesFromText(ctx.tenantId);
  const rows = await listCategories(ctx.tenantId);
  return (
    <div className="grid gap-5">
      <PageHeader title="Categorías" description="Organiza tus productos en categorías y subcategorías. Se muestran en el punto de venta, la tienda y los informes." />
      <CategoriesView slug={tenant} tree={buildCategoryTree(rows)} />
    </div>
  );
}
