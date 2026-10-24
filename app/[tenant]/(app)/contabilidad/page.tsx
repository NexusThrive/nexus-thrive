import { notFound } from "next/navigation";
import { Alert } from "@/components/molecules/alert";
import { PageHeader } from "@/components/molecules/page-header";
import { listEntries } from "@/lib/accounting/ledger-db";
import { listAccounts, listCostCenters, listPeriods, listRules } from "@/lib/accounting/accounting-db";
import { can } from "@/lib/business/permissions";
import { todayCO } from "@/lib/tax/tax";
import { requireTenantContext } from "@/lib/tenant/context";
import { tenantWithModules } from "@/lib/tenant/membership";
import AccountingView from "./_components/accounting-view";

/** Contabilidad: plan de cuentas, reglas de asientos, centros de costo y cierre de períodos. */
export default async function AccountingPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const ctx = await requireTenantContext(tenant, "/contabilidad");
  if (!ctx) notFound();
  const header = <PageHeader eyebrow="Dinero" title="Contabilidad" description="Tu plan de cuentas, las reglas que generan los asientos y el cierre de cada mes." />;
  if (!can(ctx.role, "business.manage")) {
    return (
      <div className="grid gap-5">
        {header}
        <Alert tone="info">Solo el dueño o administración ve la contabilidad.</Alert>
      </div>
    );
  }
  const [accounts, rules, centers, periods, entries, tenantRow] = await Promise.all([listAccounts(ctx.tenantId), listRules(ctx.tenantId), listCostCenters(ctx.tenantId), listPeriods(ctx.tenantId), listEntries(ctx.tenantId), tenantWithModules(ctx.tenantId)]);
  return (
    <div className="grid gap-5">
      {header}
      <AccountingView slug={tenant} accounts={accounts} rules={rules} centers={centers} periods={periods} entries={entries} auto={Boolean((tenantRow as { accountingEnabled?: boolean } | null)?.accountingEnabled)} today={todayCO()} canReopen={can(ctx.role, "business.setup")} />
    </div>
  );
}
