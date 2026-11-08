import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { can } from "@/lib/core/auth/permissions";
import { requireTenantContext } from "@/lib/core/tenancy/context";
import { crmConfig } from "@/lib/business/growth/pipeline-config-db";
import CrmConfigView from "./_components/crm-config";

export const metadata: Metadata = { title: "Configuración del CRM" };

/** App CRM › Configuración: etapas (nombre, orden y probabilidad), motivos de pérdida, etiquetas y equipos. */
export default async function CrmConfigPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const ctx = await requireTenantContext(tenant, "/crm/configuracion");
  if (!ctx) notFound();
  return <CrmConfigView slug={tenant} data={await crmConfig(ctx.tenantId)} canEdit={can(ctx.role, "business.manage")} />;
}
