import { notFound } from "next/navigation";
import { PageHeader } from "@/components/molecules/page-header";
import { PermissionNotice } from "@/components/molecules/permission-notice";
import { shiftReport } from "@/lib/business/pos/shift-report-db";
import { canManage } from "@/lib/core/auth/roles";
import { requireTenantContext } from "@/lib/core/tenancy/context";
import ShiftsView from "./_components/shifts-view";

/** Turnos de caja del mostrador: quién los abrió, con cuánto, cuánto se esperaba, cuánto se contó y la diferencia. */
export default async function ShiftsPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const ctx = await requireTenantContext(tenant, "/pos/informes");
  if (!ctx) notFound();
  if (!canManage(ctx.role)) {
    return (
      <div className="grid gap-5">
        <PageHeader title="Turnos de caja" description="Cómo cuadró cada turno del mostrador." />
        <PermissionNotice permission="business.manage" action="ver los turnos de caja" />
      </div>
    );
  }
  return (
    <div className="grid gap-5">
      <PageHeader title="Turnos de caja" description="Cómo cuadró cada turno del mostrador: lo que se esperaba, lo que se contó y la diferencia." />
      <ShiftsView slug={tenant} rows={await shiftReport(ctx.tenantId)} />
    </div>
  );
}
