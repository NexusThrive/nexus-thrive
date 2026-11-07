import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/molecules/page-header";
import { PermissionNotice } from "@/components/molecules/permission-notice";
import { can } from "@/lib/core/auth/permissions";
import { requireTenantContext } from "@/lib/core/tenancy/context";
import { moneyOverview } from "@/lib/experience/dashboard/where-is-my-money";
import DineroView from "./_components/dinero-view";

export const metadata: Metadata = { title: "¿Dónde está mi dinero?" };

/** ¿Dónde está mi dinero? Cobrado por canal, lo que te deben, lo que viene en camino y lo que falta revisar; solo lee de los motores. */
export default async function DineroPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const ctx = await requireTenantContext(tenant, "/dinero");
  if (!ctx) notFound();
  const header = <PageHeader title="¿Dónde está mi dinero?" description="Lo cobrado, lo que te deben, lo que viene en camino a tu banco y lo que falta revisar." />;
  if (!can(ctx.role, "money.handle")) {
    return (
      <div className="grid gap-5">
        {header}
        <PermissionNotice permission="money.handle" action="ver el dinero del negocio" />
      </div>
    );
  }
  return (
    <div className="grid gap-5">
      {header}
      <DineroView slug={tenant} overview={await moneyOverview(ctx.tenantId)} />
    </div>
  );
}
