import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/molecules/page-header";
import { loadInbox } from "@/lib/experience/dashboard/notifications-db";
import { requireTenantContext } from "@/lib/core/tenancy/context";
import { loadInboxAction, setNotificationsArchivedAction, setNotificationsReadAction } from "../_actions/notifications";
import InboxView from "./_components/inbox-view";

export const metadata: Metadata = { title: "Notificaciones" };

/** Notificaciones: el buzón de cada persona (para todos los roles). Muestra lo de sus módulos activos, con historial, leídas y archivadas. */
export default async function NotificacionesPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const ctx = await requireTenantContext(tenant, "/notificaciones");
  if (!ctx) notFound();
  const items = await loadInbox(ctx.tenantId, ctx.memberId, ctx.role);
  return (
    <div data-bleed="" className="grid gap-5 px-6 pb-8 pt-6">
      <PageHeader title="Notificaciones" description="Lo que pasa en tu negocio y necesita tu atención: cobros, citas, pedidos y tareas, con su historial." />
      <InboxView slug={tenant} initial={items} actions={{ load: loadInboxAction, setRead: setNotificationsReadAction, setArchived: setNotificationsArchivedAction }} />
    </div>
  );
}
