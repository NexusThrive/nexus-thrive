import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/molecules/page-header";
import { PermissionNotice } from "@/components/molecules/permission-notice";
import { can } from "@/lib/core/auth/permissions";
import { requireTenantContext } from "@/lib/core/tenancy/context";
import { listNotices, listTemplates } from "@/lib/integrations/channels/notices-db";
import { whatsappConnection } from "@/lib/integrations/channels/conversations-db";
import NoticesView from "./_components/notices-view";

export const metadata: Metadata = { title: "Plantillas y avisos" };

/** Plantillas y avisos de WhatsApp: el texto de cada aviso, su aprobación en Meta y lo que salió o quedó listo para enviar con un toque. */
export default async function AvisosPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const ctx = await requireTenantContext(tenant, "/avisos");
  if (!ctx) notFound();
  const header = <PageHeader title="Plantillas y avisos" description="Avisos automáticos por WhatsApp que cumplen las reglas de Meta: ventana de 24 h, plantillas aprobadas, consentimiento y bajas." />;
  if (!can(ctx.role, "business.manage")) {
    return (
      <div className="grid gap-5">
        {header}
        <PermissionNotice permission="business.manage" action="manejar las plantillas y avisos" />
      </div>
    );
  }
  const [templates, notices, connection] = await Promise.all([listTemplates(ctx.tenantId), listNotices(ctx.tenantId), whatsappConnection(ctx.tenantId)]);
  return (
    <div className="grid gap-5">
      {header}
      <NoticesView slug={tenant} templates={templates} notices={notices} connected={connection !== null} />
    </div>
  );
}
