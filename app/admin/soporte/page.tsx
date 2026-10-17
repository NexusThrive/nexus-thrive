import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/molecules/page-header";
import { getStaffContext } from "@/lib/ops/access";
import { listManagers } from "@/lib/ops/accounts";
import { tenantOptions } from "@/lib/ops/leads";
import { listTickets } from "@/lib/ops/tickets";
import SupportView from "./_components/support-view";

export const metadata: Metadata = { title: "Soporte · NEXUS Operations Center" };

/** Tickets de soporte de los negocios, con SLA por prioridad. */
export default async function SoportePage() {
  const staff = await getStaffContext();
  if (!staff?.permissions.includes("tickets.view")) notFound();
  const [tickets, tenants, team] = await Promise.all([listTickets(), tenantOptions(), listManagers()]);
  return (
    <div className="grid gap-5">
      <PageHeader eyebrow="Clientes" title="Soporte" description="Casos de los negocios con prioridad y SLA. Las notas internas solo las ve el equipo." />
      <SupportView tickets={tickets} tenants={tenants} staff={team} me={staff.staffId} canReply={staff.permissions.includes("tickets.reply")} />
    </div>
  );
}
