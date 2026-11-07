import { notFound } from "next/navigation";
import { PermissionNotice } from "@/components/molecules/permission-notice";
import { PageHeader } from "@/components/molecules/page-header";
import { getAppBaseUrl } from "@/lib/foundation/app-url";
import { can } from "@/lib/core/auth/permissions";
import { growthReport, listLinks, listReviews, reputationOf } from "@/lib/business/growth/growth-db";
import { listingView } from "@/lib/integrations/google/google-db";
import { siteForEditor } from "@/lib/experience/site/site-db";
import { requireTenantContext } from "@/lib/core/tenancy/context";
import GrowthView from "./_components/growth-view";

/** Campañas con enlaces cortos y UTM, de dónde vienen tus ventas y tus reseñas. */
export default async function GrowthPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const ctx = await requireTenantContext(tenant, "/presencia/crecimiento");
  if (!ctx) notFound();
  const header = <PageHeader title="Campañas y reseñas" description="De dónde llegan tus clientes, cuánto cuesta cada origen y qué dicen de ti." />;
  if (!can(ctx.role, "business.manage")) {
    return (
      <div className="grid gap-5">
        {header}
        <PermissionNotice permission="business.manage" action="ver las campañas y las reseñas" />
      </div>
    );
  }
  const [links, report, reviews, rep, site, base, google] = await Promise.all([listLinks(ctx.tenantId), growthReport(ctx.tenantId), listReviews(ctx.tenantId), reputationOf(ctx.tenantId), siteForEditor(ctx.tenantId), getAppBaseUrl(), listingView(ctx.tenantId)]);
  return (
    <div className="grid gap-5">
      {header}
      <GrowthView slug={tenant} baseUrl={base} siteSlug={site.site.slug} siteEnabled={site.enabled} links={links} report={report} reviews={reviews} reputation={rep ? { average: rep.average, count: rep.count, alerts: rep.alerts } : null} googlePlaceId={google.placeId} />
    </div>
  );
}
