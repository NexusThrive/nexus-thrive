import { notFound } from "next/navigation";
import { PermissionNotice } from "@/components/molecules/permission-notice";
import { PageHeader } from "@/components/molecules/page-header";
import { getAppBaseUrl } from "@/lib/foundation/app-url";
import { can } from "@/lib/core/auth/permissions";
import { siteForEditor } from "@/lib/experience/site/site-db";
import { requireTenantContext } from "@/lib/core/tenancy/context";
import { registrationSettings } from "@/lib/business/customers/registration-db";
import { profileFor } from "@/lib/business/customers/customer-fields";
import SiteEditor from "./_components/site-editor";
import RegistrationSettings from "./_components/registration-settings";

/** Mi sitio web: plantilla, textos, color, catálogo y SEO, con vista previa. */
export default async function SitePage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const ctx = await requireTenantContext(tenant, "/sitio");
  if (!ctx) notFound();
  const gym = profileFor(ctx.vertical).planOnCreate;
  const header = gym ? (
    <PageHeader title="Panel de registro de cliente" description="Tus clientes se registran solos y tú les asignas la membresía después." />
  ) : (
    <PageHeader title="Mi sitio web" description="Tu página pública con tu catálogo, tu WhatsApp y todo listo para que te encuentren." />
  );
  if (!can(ctx.role, "business.manage")) {
    return (
      <div className="grid gap-5">
        {header}
        <PermissionNotice permission="business.manage" action="editar el sitio" />
      </div>
    );
  }
  const base = await getAppBaseUrl();
  if (gym) {
    const registration = await registrationSettings(ctx.tenantId);
    return (
      <div className="grid gap-5">
        {header}
        <RegistrationSettings slug={tenant} baseUrl={base} initialEnabled={registration.enabled} initialLogoId={registration.logoId} businessName={ctx.tenant.name} />
      </div>
    );
  }
  const editor = await siteForEditor(ctx.tenantId);
  return (
    <div className="grid gap-5">
      {header}
      <SiteEditor slug={tenant} baseUrl={base} initial={editor} />
    </div>
  );
}
