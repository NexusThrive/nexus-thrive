import { REPORTS, ledgerRows, reportCsv, type ReportKind } from "@/lib/accounting/reports-db";
import { can } from "@/lib/business/permissions";
import { logTenantAction } from "@/lib/tenant/audit";
import { requireTenantContext } from "@/lib/tenant/context";

/**
 * Descarga de un informe contable en CSV para el contador (`?desde=AAAA-MM-DD&hasta=AAAA-MM-DD&cuenta=1105`).
 * Solo dueño y administración; queda en la bitácora.
 */
export async function GET(request: Request, { params }: { params: Promise<{ tenant: string; report: string }> }) {
  const { tenant, report } = await params;
  if (!(REPORTS as readonly string[]).includes(report)) return new Response("No encontrado", { status: 404 });
  const ctx = await requireTenantContext(tenant, "/contabilidad");
  if (!ctx || !can(ctx.role, "business.manage")) return new Response("No autorizado", { status: 403 });
  const q = new URL(request.url).searchParams;
  const date = /^\d{4}-\d{2}-\d{2}$/;
  const from = date.test(q.get("desde") ?? "") ? q.get("desde")! : "2000-01-01";
  const to = date.test(q.get("hasta") ?? "") ? q.get("hasta")! : "2999-12-31";
  const account = (q.get("cuenta") ?? "").replace(/\D/g, "").slice(0, 10);
  const rows = await ledgerRows(ctx.tenantId, from, to);
  await logTenantAction(ctx, "BIZ_ACCOUNTING", { action: "export", report, from, to });
  return new Response(reportCsv(report as ReportKind, rows, account), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="contabilidad-${report}-${from}_${to}.csv"`, "Cache-Control": "no-store" },
  });
}
