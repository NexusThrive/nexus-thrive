import { notFound } from "next/navigation";
import { Alert } from "@/components/molecules/alert";
import { PageHeader } from "@/components/molecules/page-header";
import { getAppBaseUrl } from "@/lib/foundation/app-url";
import { can } from "@/lib/core/auth/permissions";
import { connectedGateways, listIntents, listReconciliations } from "@/lib/domains/finance/payments/intents-db";
import { todayCO } from "@/lib/domains/finance/tax/tax";
import { requireTenantContext } from "@/lib/core/tenancy/context";
import CobrosView from "./_components/cobros-view";
import { routeCategory } from "@/lib/experience/navigation/tenant-nav";

/** Cobros en línea: enlaces y botones de pago, estado oficial, reembolsos y conciliación diaria. */
export default async function CobrosPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const ctx = await requireTenantContext(tenant, "/cobros");
  if (!ctx) notFound();
  const header = <PageHeader eyebrow={routeCategory("/cobros")} title="Cobros en línea" description="Enlaces y botones de pago: el ingreso se registra cuando llega la confirmación oficial." />;
  if (!can(ctx.role, "money.handle")) {
    return (
      <div className="grid gap-5">
        {header}
        <Alert tone="info">Tu rol no maneja cobros en línea.</Alert>
      </div>
    );
  }
  const admin = can(ctx.role, "business.manage");
  const [intents, runs, base, gateways] = await Promise.all([listIntents(ctx.tenantId), admin ? listReconciliations(ctx.tenantId) : Promise.resolve([]), getAppBaseUrl(), connectedGateways(ctx.tenantId)]);
  return (
    <div className="grid gap-5">
      {header}
      <CobrosView slug={tenant} baseUrl={base} intents={intents} runs={runs} canAdmin={admin} today={todayCO()} gateways={gateways} />
    </div>
  );
}
