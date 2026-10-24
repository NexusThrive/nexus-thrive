import { notFound } from "next/navigation";
import { Alert } from "@/components/molecules/alert";
import { PageHeader } from "@/components/molecules/page-header";
import { can } from "@/lib/business/permissions";
import { listResolutions, listTaxRates } from "@/lib/tax/tax-db";
import { requireTenantContext } from "@/lib/tenant/context";
import TaxesView from "./_components/taxes-view";

/**
 * Impuestos con vigencia (IVA, impoconsumo, retenciones) y resoluciones de
 * numeración. Parte de Finanzas; vale igual para cualquier rubro.
 */
export default async function TaxesPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const ctx = await requireTenantContext(tenant, "/taxes");
  if (!ctx) notFound();
  const header = <PageHeader eyebrow="Dinero" title="Impuestos y numeración" description="Tarifas con vigencia, retenciones y las resoluciones con las que numeras tus documentos." />;
  if (!can(ctx.role, "business.manage")) {
    return (
      <div className="grid gap-5">
        {header}
        <Alert tone="info">Solo el dueño o administración maneja impuestos y numeración.</Alert>
      </div>
    );
  }
  const [rates, resolutions] = await Promise.all([listTaxRates(ctx.tenantId), listResolutions(ctx.tenantId)]);
  return (
    <div className="grid gap-5">
      {header}
      <TaxesView slug={tenant} rates={rates} resolutions={resolutions} />
    </div>
  );
}
