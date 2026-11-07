import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/molecules/page-header";
import { customerOptions } from "@/lib/business/customers/customers-db";
import { listOpportunities } from "@/lib/business/growth/opportunities-db";
import { requireTenantContext } from "@/lib/core/tenancy/context";
import { todayCO } from "@/lib/domains/finance/tax/tax";
import OpportunitiesView from "./_components/opportunities-view";

export const metadata: Metadata = { title: "Oportunidades" };

/** Oportunidades: cada interesado ligado a un contacto, con su siguiente paso, hasta que compra o se pierde. */
export default async function OportunidadesPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const ctx = await requireTenantContext(tenant, "/crm");
  if (!ctx) notFound();
  const [open, won, lost, customers] = await Promise.all([listOpportunities(ctx.tenantId, "OPEN"), listOpportunities(ctx.tenantId, "WON", 50), listOpportunities(ctx.tenantId, "LOST", 50), customerOptions(ctx.tenantId)]);
  return (
    <div className="grid gap-5">
      <PageHeader title="Oportunidades" description="A quién le estás vendiendo, qué le interesa y cuál es el siguiente paso." />
      <OpportunitiesView slug={tenant} open={open} won={won} lost={lost} customers={customers} today={todayCO()} />
    </div>
  );
}
