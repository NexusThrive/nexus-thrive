import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/molecules/page-header";
import { customerOptions } from "@/lib/business/customers/customers-db";
import { listDeliverables } from "@/lib/business/customers/deliverables-db";
import { projectOptions } from "@/lib/business/customers/tasks-db";
import { requireTenantContext } from "@/lib/core/tenancy/context";
import DeliverablesView from "./_components/deliverables-view";

export const metadata: Metadata = { title: "Entregables" };

/** Entregables: lo que le entregas a un cliente y que él aprueba o devuelve con cambios desde un enlace, sin crear cuenta. */
export default async function EntregablesPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const ctx = await requireTenantContext(tenant, "/entregables");
  if (!ctx) notFound();
  const [rows, projects, customers] = await Promise.all([listDeliverables(ctx.tenantId), projectOptions(ctx.tenantId), customerOptions(ctx.tenantId)]);
  return (
    <div className="grid gap-5">
      <PageHeader title="Entregables" description="Envía lo que hiciste y deja que tu cliente lo apruebe o pida cambios, con constancia de fecha." />
      <DeliverablesView slug={tenant} rows={rows} projects={projects} customers={customers} />
    </div>
  );
}
