import { notFound } from "next/navigation";
import { Alert } from "@/components/molecules/alert";
import { PageHeader } from "@/components/molecules/page-header";
import { can } from "@/lib/business/permissions";
import { payables, receivables } from "@/lib/receivables/receivables-db";
import { requireTenantContext } from "@/lib/tenant/context";
import CarteraView from "./_components/cartera-view";

/** Cartera: lo que te deben (cuentas de cobro) y lo que debes (facturas de proveedor), por antigüedad. */
export default async function CarteraPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const ctx = await requireTenantContext(tenant, "/cartera");
  if (!ctx) notFound();
  const header = <PageHeader eyebrow="Dinero" title="Cartera" description="Lo que te deben y lo que debes, con su antigüedad." />;
  if (!can(ctx.role, "money.handle")) {
    return (
      <div className="grid gap-5">
        {header}
        <Alert tone="info">Tu rol no ve la cartera del negocio.</Alert>
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
