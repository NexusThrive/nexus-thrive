import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Badge } from "@/components/atoms/badge";
import { PageHeader } from "@/components/molecules/page-header";
import { getStaffContext } from "@/lib/ops/access";
import { listManagers } from "@/lib/ops/accounts";
import { listConversations, listInboxMessages } from "@/lib/ops/inbox";
import { providers } from "@/lib/ops/inbox-providers";
import { tenantOptions } from "@/lib/ops/leads";
import InboxView from "./_components/inbox-view";

export const metadata: Metadata = { title: "Bandeja · NEXUS Operations Center" };

/** WhatsApp y correo de NEXUS con los negocios, en un solo lugar. */
export default async function BandejaPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const staff = await getStaffContext();
  if (!staff?.permissions.includes("tickets.view")) notFound();
  const { c } = await searchParams;
  const [conversations, tenants, team] = await Promise.all([listConversations(), tenantOptions(), listManagers()]);
  const active = conversations.find((x) => x.id === c) ?? null;
  const messages = active ? await listInboxMessages(active.id) : [];
  const p = { whatsapp: providers.whatsapp(), email: providers.email() };
  return (
    <div className="grid gap-5">
      <PageHeader
        eyebrow="Clientes"
        title="Bandeja"
        description="Los canales de NEXUS con los negocios (no los canales de cada negocio con sus clientes)."
        actions={
          <span className="flex flex-wrap gap-1.5">
            <Badge tone={p.whatsapp ? "success" : "muted"}>WhatsApp {p.whatsapp ? "conectado" : "sin conectar"}</Badge>
            <Badge tone={p.email ? "success" : "muted"}>Correo {p.email ? "conectado" : "sin conectar"}</Badge>
          </span>
        }
      />
      <InboxView conversations={conversations} active={active} messages={messages} tenants={tenants} staff={team} me={staff.staffId} canReply={staff.permissions.includes("tickets.reply")} providers={p} />
    </div>
  );
}
