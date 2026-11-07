import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/molecules/page-header";
import { PermissionNotice } from "@/components/molecules/permission-notice";
import { listLeadForms } from "@/lib/business/growth/lead-forms-db";
import { can } from "@/lib/core/auth/permissions";
import { requireTenantContext } from "@/lib/core/tenancy/context";
import { getAppBaseUrl } from "@/lib/foundation/app-url";
import FormsView from "./_components/forms-view";

export const metadata: Metadata = { title: "Formularios web" };

/** Formularios web: recibe interesados desde cualquier web (WordPress, Shopify, Next.js); cada uno crea el contacto y su oportunidad. */
export default async function FormulariosPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const ctx = await requireTenantContext(tenant, "/formularios");
  if (!ctx) notFound();
  const header = <PageHeader title="Formularios web" description="Recibe interesados desde cualquier web. Cada envío crea el contacto y su oportunidad, con su origen." />;
  if (!can(ctx.role, "business.manage")) {
    return (
      <div className="grid gap-5">
        {header}
        <PermissionNotice permission="business.manage" action="manejar los formularios web" />
      </div>
    );
  }
  return (
    <div className="grid gap-5">
      {header}
      <FormsView slug={tenant} forms={await listLeadForms(ctx.tenantId)} appUrl={await getAppBaseUrl()} />
    </div>
  );
}
