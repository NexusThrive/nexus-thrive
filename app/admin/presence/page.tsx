import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { KpiCard } from "@/components/molecules/kpi-card";
import { PageHeader, SectionTitle } from "@/components/molecules/page-header";
import { getStaffContext } from "@/lib/ops/access";
import { presenceOverview } from "@/lib/ops/presence";
import PresenceRow from "./_components/presence-row";
import RequestList from "./_components/request-list";

export const metadata: Metadata = { title: "Presence Thrive · NEXUS Operations Center" };

/**
 * Presence Thrive en el Operations Center: puntaje de presencia digital de
 * cada negocio, el detalle por criterio, el reanálisis del sitio y el
 * pipeline de solicitudes (PresenceRequest).
 */
export default async function PresencePage() {
  const staff = await getStaffContext();
  if (!staff?.permissions.includes("presence.view")) notFound();

  const { rows, requests } = await presenceOverview();

  const withoutSite = rows.filter((row) => !row.siteUrl).length;
  const dominant = rows.filter((row) => row.state === "DOMINANTE").length;
  const pendingRequests = requests.filter((request) => request.status === "PENDING").length;
  const canManage = staff.permissions.includes("presence.manage");

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5">
      <PageHeader
        eyebrow="Comercial"
        title="Presence Thrive"
        description="Presencia digital de cada negocio: puntaje verificado, canales y solicitudes de sitio."
      />

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <KpiCard label="Negocios" value={rows.length} index={0} />
        <KpiCard label="Dominantes" value={dominant} index={1} />
        <KpiCard label="Sin sitio" value={withoutSite} index={2} alert={withoutSite > 0} />
        <KpiCard label="Solicitudes pendientes" value={pendingRequests} index={3} alert={pendingRequests > 0} />
      </div>

      <SectionTitle title="Solicitudes de sitio" />
      {canManage ? (
        <RequestList rows={requests} />
      ) : (
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-2.5">
          {requests.map((request) => (
            <li key={request.id} className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3">
              <span className="min-w-0 flex-1 truncate font-medium">{request.businessName}</span>
              <span className="text-xs text-muted-foreground">{request.tenantName}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{request.status}</span>
            </li>
          ))}
          {requests.length === 0 ? (
            <li className="rounded-lg border border-dashed border-border-strong bg-surface px-4 py-6 text-center text-sm text-muted-foreground">
              Aún no hay solicitudes de sitio.
            </li>
          ) : null}
        </ul>
      )}

      <SectionTitle title="Presencia por negocio" />
      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border-strong bg-surface px-4 py-6 text-center text-sm text-muted-foreground">
          Todavía no hay negocios.
        </p>
      ) : (
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-2.5">
          {rows.map((row) => (
            <PresenceRow key={row.id} row={row} />
          ))}
        </ul>
      )}
    </div>
  );
}
