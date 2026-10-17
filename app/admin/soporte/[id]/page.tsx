import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/molecules/page-header";
import { getStaffContext } from "@/lib/ops/access";
import { listManagers } from "@/lib/ops/accounts";
import { getTicket, listTicketMessages } from "@/lib/ops/tickets";
import TicketDetail from "./_components/ticket-detail";

export const metadata: Metadata = { title: "Ticket · NEXUS Operations Center" };

export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const staff = await getStaffContext();
  if (!staff?.permissions.includes("tickets.view")) notFound();
  const [ticket, messages, team] = await Promise.all([getTicket(id), listTicketMessages(id), listManagers()]);
  if (!ticket) notFound();
  return (
    <div className="grid gap-5">
      <Link href="/admin/soporte" className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground">
        <ArrowLeft aria-hidden="true" className="size-3.5" /> Soporte
      </Link>
      <PageHeader
        eyebrow={ticket.code}
        title={ticket.subject}
        description={
          ticket.tenantId ? (
            <Link href={`/admin/negocios/${ticket.tenantId}`} className="inline-flex items-center gap-1 hover:text-foreground">
              {ticket.tenantName} <ExternalLink aria-hidden="true" className="size-3" />
            </Link>
          ) : (
            "Sin negocio vinculado"
          )
        }
      />
      <TicketDetail ticket={ticket} messages={messages} staff={team} me={staff.staffId} canReply={staff.permissions.includes("tickets.reply")} canEscalate={staff.permissions.includes("tickets.escalate")} />
    </div>
  );
}
