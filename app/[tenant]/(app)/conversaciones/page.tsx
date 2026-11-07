import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/molecules/page-header";
import { requireTenantContext } from "@/lib/core/tenancy/context";
import { listConversations, openConversation, whatsappConnection } from "@/lib/integrations/channels/conversations-db";
import ConversationsView from "./_components/conversations-view";

export const metadata: Metadata = { title: "Conversaciones" };

/** Conversaciones del negocio por su propio WhatsApp. Cada una pertenece a un contacto y queda en su ficha. */
export default async function ConversacionesPage({ params, searchParams }: { params: Promise<{ tenant: string }>; searchParams: Promise<{ c?: string }> }) {
  const { tenant } = await params;
  const { c } = await searchParams;
  const ctx = await requireTenantContext(tenant, "/conversaciones");
  if (!ctx) notFound();
  const [conversations, connection] = await Promise.all([listConversations(ctx.tenantId), whatsappConnection(ctx.tenantId)]);
  const selected = c && conversations.some((x) => x.id === c) ? c : (conversations[0]?.id ?? null);
  const messages = selected ? ((await openConversation(ctx.tenantId, selected)) ?? []) : [];
  return (
    <div className="grid gap-5">
      <PageHeader title="Conversaciones" description="Lo que tus clientes te escriben por WhatsApp y lo que les respondes." />
      <ConversationsView slug={tenant} conversations={conversations} selected={selected} messages={messages} connected={connection !== null} />
    </div>
  );
}
