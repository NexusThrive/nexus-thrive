import { notFound } from "next/navigation";
import { Alert } from "@/components/molecules/alert";
import { PageHeader } from "@/components/molecules/page-header";
import { getAppBaseUrl } from "@/lib/app-url";
import { can } from "@/lib/business/permissions";
import { siteForEditor } from "@/lib/site/site-db";
import { requireTenantContext } from "@/lib/tenant/context";
import SiteEditor from "./_components/site-editor";

/** Mi sitio web: plantilla, textos, color, catálogo y SEO, con vista previa. */
export default async function SitePage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const ctx = await requireTenantContext(tenant, "/sitio");
  if (!ctx) notFound();
  const header = <PageHeader eyebrow="Visibilidad" title="Mi sitio web" description="Tu página pública con tu catálogo, tu WhatsApp y todo listo para que te encuentren." />;
  if (!can(ctx.role, "business.manage")) {
    return (
      <div className="grid gap-5">
        {header}
        <Alert tone="info">Solo el dueño o administración edita el sitio.</Alert>
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
