"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { Alert } from "@/components/molecules/alert";
import { Badge } from "@/components/atoms/badge";
import { buttonVariants } from "@/components/atoms/button-variants";
import { inputClasses } from "@/components/atoms/input";
import { EmptyState } from "@/components/molecules/empty-state";
import { Field } from "@/components/molecules/field";
import { useToast } from "@/components/molecules/toast";
import { replyAction } from "@/app/[tenant]/(app)/conversaciones/actions";
import type { ConversationRow, MessageRow } from "@/lib/integrations/channels/conversations-db";
import { cn } from "@/lib/utils";

const STATUS_TEXT: Record<string, string> = { RECEIVED: "", SENT: "Enviado", DELIVERED: "Entregado", READ: "Leído", FAILED: "No se entregó", MANUAL: "Pendiente de enviar con un toque" };
const when = new Intl.DateTimeFormat("es-CO", { dateStyle: "short", timeStyle: "short", timeZone: "America/Bogota" });

/** Lista de conversaciones y el hilo de la seleccionada; responder sale por la API dentro de las 24 h y, si no, queda listo con un toque. */
export default function ConversationsView({ slug, conversations, selected, messages, connected }: { slug: string; conversations: ConversationRow[]; selected: string | null; messages: MessageRow[]; connected: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const current = conversations.find((c) => c.id === selected) ?? null;

  const send = async () => {
    if (!selected || busy) return;
    setBusy(true);
    setLink(null);
    const r = await replyAction(slug, selected, text);
    setBusy(false);
    toast(r.message, r.ok ? "success" : "error");
    if (r.ok) {
      setText("");
      if (r.delivery === "manual" && r.link) setLink(r.link);
      router.refresh();
    }
  };

  return (
    <div className="grid gap-4">
      {!connected ? (
        <Alert tone="info">
          Aún no conectas tu número de WhatsApp Business: lo que escribas queda listo para enviarlo con un toque.{" "}
          <Link href={`/${slug}/integrations`} className="font-semibold underline">Conectar WhatsApp</Link>
        </Alert>
      ) : null}
      {conversations.length === 0 ? (
        <EmptyState title="Aún no hay conversaciones" description="Cuando un cliente te escriba al número que conectaste, aparecerá aquí y en su ficha." />
      ) : (
        <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
          <ul aria-label="Conversaciones" className="max-h-80 divide-y divide-border overflow-y-auto rounded-lg border border-border bg-surface lg:max-h-[32rem]">
            {conversations.map((c) => (
              <li key={c.id}>
                <Link href={`/${slug}/conversaciones?c=${c.id}`} aria-current={c.id === selected ? "true" : undefined} className={cn("grid gap-0.5 px-3 py-2.5 hover:bg-muted", c.id === selected && "bg-muted")}>
                  <span className="flex items-center gap-2">
                    <b className="min-w-0 flex-1 truncate text-ui font-medium">{c.customerName ?? c.contactName ?? c.contactHandle}</b>
                    {c.unread > 0 ? <Badge variant="warning">{c.unread}</Badge> : null}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">{c.lastBody ?? "Sin mensajes"}</span>
                </Link>
              </li>
            ))}
          </ul>

          <section aria-label="Hilo" className="grid min-w-0 content-start gap-3 rounded-lg border border-border bg-surface p-3">
            {current ? (
              <>
                <header className="flex flex-wrap items-center gap-2">
                  <b className="text-ui font-medium">{current.customerName ?? current.contactName ?? current.contactHandle}</b>
                  <span className="text-xs text-muted-foreground">+{current.contactHandle}</span>
                  {current.customerId ? <Link href={`/${slug}/crm/${current.customerId}`} className="ml-auto text-xs font-semibold text-accent-text hover:underline">Ver ficha</Link> : null}
                </header>
                <ol className="grid max-h-80 gap-2 overflow-y-auto">
                  {messages.map((m) => (
                    <li key={m.id} className={cn("max-w-[85%] break-words rounded-lg px-3 py-2 text-ui", m.direction === "IN" ? "justify-self-start bg-muted" : "justify-self-end bg-accent-subtle")}>
                      {m.body}
                      <small className="mt-0.5 block text-2xs text-muted-foreground">{when.format(new Date(m.createdAt))}{STATUS_TEXT[m.status] ? ` · ${STATUS_TEXT[m.status]}` : ""}{m.error ? ` (${m.error})` : ""}</small>
                    </li>
                  ))}
                </ol>
                <p className={cn("text-xs", current.windowOpen ? "text-muted-foreground" : "font-medium text-warning-text")}>
                  {current.windowOpen ? "Puedes responder con texto libre: pasaron menos de 24 h desde su último mensaje." : "Pasaron más de 24 h desde su último mensaje: tu respuesta queda lista para enviarla con un toque."}
                </p>
                {link ? <a href={link} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "outline", size: "sm", className: "justify-self-start" })}>Enviar con un toque en WhatsApp</a> : null}
                <Field label="Tu respuesta">{(c) => <textarea {...c} rows={3} maxLength={1000} value={text} onChange={(e) => setText(e.target.value)} className={inputClasses} />}</Field>
                <button type="button" disabled={busy || !text.trim()} onClick={send} className={buttonVariants({ className: "justify-self-end" })}>
                  <Send aria-hidden="true" className="size-4" /> {busy ? "Enviando…" : "Responder"}
                </button>
              </>
            ) : null}
          </section>
        </div>
      )}
    </div>
  );
}
