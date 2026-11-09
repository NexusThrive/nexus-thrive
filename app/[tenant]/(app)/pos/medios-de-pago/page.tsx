import { notFound } from "next/navigation";
import { PageHeader } from "@/components/molecules/page-header";
import { PermissionNotice } from "@/components/molecules/permission-notice";
import { listPaymentMethods } from "@/lib/business/sales/payment-methods-db";
import { canManage } from "@/lib/core/auth/roles";
import { requireTenantContext } from "@/lib/core/tenancy/context";
import PaymentMethodsView from "./_components/payment-methods-view";

/** Medios de pago del negocio: cuáles se ofrecen al cobrar y con qué nombre e instrucciones (Nequi, Daviplata, cuenta del banco…). */
export default async function PaymentMethodsPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const ctx = await requireTenantContext(tenant, "/pos/medios-de-pago");
  if (!ctx) notFound();
  if (!canManage(ctx.role)) {
    return (
      <div className="grid gap-5">
        <PageHeader title="Medios de pago" description="Cómo te pagan tus clientes." />
        <PermissionNotice permission="business.manage" action="cambiar los medios de pago" />
      </div>
    );
  }
  const methods = await listPaymentMethods(ctx.tenantId);
  return (
    <div className="grid gap-5">
      <PageHeader title="Medios de pago" description="Los que ofreces al cobrar en el punto de venta. Cada uno lleva su nombre y, si quieres, dónde pagar." />
      <PaymentMethodsView slug={tenant} methods={methods} />
    </div>
  );
}
