import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/molecules/page-header";
import { PermissionNotice } from "@/components/molecules/permission-notice";
import { can } from "@/lib/core/auth/permissions";
import { canManage } from "@/lib/core/auth/roles";
import { requireTenantContext } from "@/lib/core/tenancy/context";
import { memberDirectory } from "@/lib/core/tenancy/membership";
import { cashHistory, listCashBoxes, sessionMovements } from "@/lib/business/sales/finance-db";
import CashPanel from "../_components/cash-panel";

export const metadata: Metadata = { title: "Caja menor" };

/** Caja menor: fondo fijo con responsable, turno con apertura, movimientos y cierre con arqueo. */
export default async function CajaPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const ctx = await requireTenantContext(tenant, "/finanzas/caja");
  if (!ctx) notFound();
  const header = <PageHeader title="Caja menor" description="El efectivo para gastos pequeños: abre el turno, registra lo que entra y sale y ciérralo contando." />;
  if (!can(ctx.role, "money.handle")) {
    return (
      <div data-bleed="" className="grid gap-5 px-6 pb-8 pt-6">
        {header}
        <PermissionNotice permission="money.handle" action="ver la caja menor" />
      </div>
    );
  }
  const [boxes, history, members] = await Promise.all([listCashBoxes(ctx.tenantId), cashHistory(ctx.tenantId, 10), memberDirectory(ctx.tenantId)]);
  const open = boxes.find((b) => b.openSession) ?? null;
  const moves = open?.openSession ? await sessionMovements(ctx.tenantId, open.openSession.id) : [];
  return (
    <div data-bleed="" className="grid gap-5 px-6 pb-8 pt-6">
      {header}
      <CashPanel slug={tenant} boxes={boxes} moves={moves} history={history} members={members.map((m) => ({ id: m.id, name: m.name ?? m.email }))} canManage={canManage(ctx.role)} />
    </div>
  );
}
