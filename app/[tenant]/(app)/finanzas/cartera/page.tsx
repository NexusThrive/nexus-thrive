import { notFound } from "next/navigation";
import { PermissionNotice } from "@/components/molecules/permission-notice";
import { PageHeader } from "@/components/molecules/page-header";
import { can } from "@/lib/core/auth/permissions";
import { payables, receivables } from "@/lib/domains/finance/receivables/receivables-db";
import { requireTenantContext } from "@/lib/core/tenancy/context";
import CarteraView from "./_components/cartera-view";

/** Cartera: lo que te deben (cuentas de cobro) y lo que debes (facturas de proveedor), por antigüedad. */
export default async function CarteraPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const ctx = await requireTenantContext(tenant, "/finanzas/cartera");
  if (!ctx) notFound();
  const header = <PageHeader title="Cartera" description="Lo que te deben y lo que debes, con su antigüedad." />;
  if (!can(ctx.role, "money.handle")) {
    return (
      <div className="grid gap-5">
        {header}
        <PermissionNotice permission="money.handle" action="ver la cartera del negocio" />
      </div>
    );
  }
  const canPaySuppliers = can(ctx.role, "business.manage");
  const [toCollect, toPay] = await Promise.all([receivables(ctx.tenantId), canPaySuppliers ? payables(ctx.tenantId) : Promise.resolve(null)]);
  return (
    <div className="grid gap-5">
      {header}
      <CarteraView slug={tenant} receivable={toCollect} payable={toPay} />
    </div>
  );
}
