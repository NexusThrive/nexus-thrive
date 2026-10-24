import { notFound } from "next/navigation";
import { Alert } from "@/components/molecules/alert";
import { PageHeader } from "@/components/molecules/page-header";
import { can } from "@/lib/business/permissions";
import { fiscalSettings, listFiscal } from "@/lib/einvoice/einvoice-db";
import { requireTenantContext } from "@/lib/tenant/context";
import FiscalView from "./_components/fiscal-view";
import { routeCategory } from "@/lib/navigation/tenant-nav";

/** Factura electrónica: cada venta deja su documento fiscal en cola y se entrega a un proveedor tecnológico por un puerto. */
export default async function FiscalPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const ctx = await requireTenantContext(tenant, "/factura-electronica");
  if (!ctx) notFound();
  const header = <PageHeader eyebrow={routeCategory("/factura-electronica")} title="Factura electrónica" description="Documentos fiscales de tus ventas, notas y compras a no obligados, con su estado." />;
  if (!can(ctx.role, "business.manage")) {
    return (
      <div className="grid gap-5">
        {header}
        <Alert tone="info">Solo el dueño o administración maneja la factura electrónica.</Alert>
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
