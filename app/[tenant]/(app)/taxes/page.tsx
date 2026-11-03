import { notFound } from "next/navigation";
import { PermissionNotice } from "@/components/molecules/permission-notice";
import { PageHeader } from "@/components/molecules/page-header";
import { can } from "@/lib/core/auth/permissions";
import { listResolutions, listTaxRates } from "@/lib/domains/finance/tax/tax-db";
import { requireTenantContext } from "@/lib/core/tenancy/context";
import TaxesView from "./_components/taxes-view";

/**
 * Impuestos con vigencia (IVA, impoconsumo, retenciones) y resoluciones de
 * numeración. Parte de Finanzas; vale igual para cualquier rubro.
 */
export default async function TaxesPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const ctx = await requireTenantContext(tenant, "/taxes");
  if (!ctx) notFound();
  const header = <PageHeader title="Impuestos y numeración" description="Tarifas con vigencia, retenciones y las resoluciones con las que numeras tus documentos." />;
  if (!can(ctx.role, "business.manage")) {
    return (
      <div className="grid gap-5">
        {header}
        <PermissionNotice permission="business.manage" action="manejar impuestos y numeración" />
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
