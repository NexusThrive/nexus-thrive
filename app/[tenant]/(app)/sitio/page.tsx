import { notFound } from "next/navigation";
import { PermissionNotice } from "@/components/molecules/permission-notice";
import { PageHeader } from "@/components/molecules/page-header";
import { getAppBaseUrl } from "@/lib/foundation/app-url";
import { can } from "@/lib/core/auth/permissions";
import { siteForEditor } from "@/lib/experience/site/site-db";
import { requireTenantContext } from "@/lib/core/tenancy/context";
import SiteEditor from "./_components/site-editor";

/** Mi sitio web: plantilla, textos, color, catálogo y SEO, con vista previa. */
export default async function SitePage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const ctx = await requireTenantContext(tenant, "/sitio");
  if (!ctx) notFound();
  const header = <PageHeader title="Mi sitio web" description="Tu página pública con tu catálogo, tu WhatsApp y todo listo para que te encuentren." />;
  if (!can(ctx.role, "business.manage")) {
    return (
      <div className="grid gap-5">
        {header}
        <PermissionNotice permission="business.manage" action="editar el sitio" />
      </div>
    );
  }
  const [editor, base] = await Promise.all([siteForEditor(ctx.tenantId), getAppBaseUrl()]);
  return (
    <div className="grid gap-5">
      {header}
      <SiteEditor slug={tenant} baseUrl={base} initial={editor} />
    </div>
  );
}
