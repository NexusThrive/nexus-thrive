import { notFound } from "next/navigation";
import { Alert } from "@/components/molecules/alert";
import { PageHeader } from "@/components/molecules/page-header";
import { can } from "@/lib/business/permissions";
import { listingView } from "@/lib/google/google-db";
import { requireTenantContext } from "@/lib/tenant/context";
import GoogleView from "./_components/google-view";

/** Ficha de Google Business: se conecta con tu llave, se lee y se compara con lo que dice tu negocio. */
export default async function GooglePage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const ctx = await requireTenantContext(tenant, "/google");
  if (!ctx) notFound();
  const header = <PageHeader eyebrow="Visibilidad" title="Ficha de Google" description="Que lo que Google muestra de tu negocio coincida con lo que tú dices." />;
  if (!can(ctx.role, "business.manage")) {
    return (
      <div className="grid gap-5">
        {header}
        <Alert tone="info">Solo el dueño o administración maneja la ficha de Google.</Alert>
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
