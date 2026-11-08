import { notFound } from "next/navigation";
import { PageHeader } from "@/components/molecules/page-header";
import { PermissionNotice } from "@/components/molecules/permission-notice";
import { listAttributes } from "@/lib/business/catalog/attributes-db";
import { canManage } from "@/lib/core/auth/roles";
import { requireTenantContext } from "@/lib/core/tenancy/context";
import AttributesView from "./_components/attributes-view";

/** Atributos de producto: talla, color, material… Con ellos un producto genera sus variantes o se personaliza al vender. */
export default async function AttributesPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const ctx = await requireTenantContext(tenant, "/inventario/atributos");
  if (!ctx) notFound();
  if (!canManage(ctx.role)) {
    return (
      <div className="grid gap-5">
        <PageHeader title="Atributos" description="Talla, color y otras características de tus productos." />
        <PermissionNotice permission="business.manage" action="cambiar los atributos" />
      </div>
    );
  }
  const attributes = await listAttributes(ctx.tenantId);
  return (
    <div className="grid gap-5">
      <PageHeader title="Atributos" description="Talla, color, material… Un atributo puede crear una variante por cada valor, ser solo informativo o escribirse al vender (productos personalizables)." />
      <AttributesView slug={tenant} attributes={attributes} />
    </div>
  );
}
