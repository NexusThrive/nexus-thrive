import { notFound } from "next/navigation";
import { PermissionNotice } from "@/components/molecules/permission-notice";
import { PageHeader } from "@/components/molecules/page-header";
import { can } from "@/lib/core/auth/permissions";
import { listingView } from "@/lib/integrations/google/google-db";
import { requireTenantContext } from "@/lib/core/tenancy/context";
import GoogleView from "./_components/google-view";

/** Ficha de Google Business: se conecta con tu llave, se lee y se compara con lo que dice tu negocio. */
export default async function GooglePage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const ctx = await requireTenantContext(tenant, "/google");
  if (!ctx) notFound();
  const header = <PageHeader title="Ficha de Google" description="Que lo que Google muestra de tu negocio coincida con lo que tú dices." />;
  if (!can(ctx.role, "business.manage")) {
    return (
      <div className="grid gap-5">
        {header}
        <PermissionNotice permission="business.manage" action="manejar la ficha de Google" />
      </div>
    );
  }
  return (
    <div className="grid gap-5">
      {header}
      <GoogleView slug={tenant} listing={await listingView(ctx.tenantId)} />
    </div>
  );
}
