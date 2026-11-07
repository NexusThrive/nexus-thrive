import { notFound } from "next/navigation";
import { PermissionNotice } from "@/components/molecules/permission-notice";
import { PageHeader } from "@/components/molecules/page-header";
import { can } from "@/lib/core/auth/permissions";
import { fiscalSettings, listFiscal } from "@/lib/integrations/einvoice/einvoice-db";
import { requireTenantContext } from "@/lib/core/tenancy/context";
import FiscalView from "./_components/fiscal-view";

/** Factura electrónica: cada venta deja su documento fiscal en cola y se entrega a un proveedor tecnológico por un puerto. */
export default async function FiscalPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const ctx = await requireTenantContext(tenant, "/finanzas/facturacion-electronica");
  if (!ctx) notFound();
  const header = <PageHeader title="Factura electrónica" description="Documentos fiscales de tus ventas, notas y compras a no obligados, con su estado." />;
  if (!can(ctx.role, "business.manage")) {
    return (
      <div className="grid gap-5">
        {header}
        <PermissionNotice permission="business.manage" action="manejar la factura electrónica" />
      </div>
    );
  }
  const [settings, docs] = await Promise.all([fiscalSettings(ctx.tenantId), listFiscal(ctx.tenantId)]);
  return (
    <div className="grid gap-5">
      {header}
      <FiscalView slug={tenant} settings={settings} docs={docs} />
    </div>
  );
}
