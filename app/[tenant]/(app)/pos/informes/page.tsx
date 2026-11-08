import { notFound } from "next/navigation";
import { PageHeader } from "@/components/molecules/page-header";
import { PermissionNotice } from "@/components/molecules/permission-notice";
import { isPeriod } from "@/lib/business/pos/sales-report";
import { salesReport } from "@/lib/business/pos/sales-report-db";
import { canManage } from "@/lib/core/auth/roles";
import { requireTenantContext } from "@/lib/core/tenancy/context";
import SalesReportView from "./_components/sales-report-view";

/** Informe de ventas del mostrador: cuánto se vendió, qué se vende más, quién vendió y cómo pagaron. */
export default async function SalesReportPage({ params, searchParams }: { params: Promise<{ tenant: string }>; searchParams: Promise<{ periodo?: string }> }) {
  const { tenant } = await params;
  const { periodo } = await searchParams;
  const ctx = await requireTenantContext(tenant, "/pos/informes");
  if (!ctx) notFound();
  if (!canManage(ctx.role)) {
    return (
      <div className="grid gap-5">
        <PageHeader title="Informe de ventas" description="Lo que se vendió en el punto de venta." />
        <PermissionNotice permission="business.manage" action="ver los informes de ventas" />
      </div>
    );
  }
  const report = await salesReport(ctx.tenantId, isPeriod(periodo) ? periodo : "hoy");
  return (
    <div className="grid gap-5">
      <PageHeader title="Informe de ventas" description="Cuánto se vendió, qué se vende más, quién vendió y cómo pagaron." />
      <SalesReportView slug={tenant} report={report} />
    </div>
  );
}
