"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ExternalLink, Lock, Mail, MessageCircle, Send, Ticket } from "lucide-react";
import { Badge } from "@/components/atoms/badge";
import { buttonVariants } from "@/components/atoms/button-variants";
import { selectClasses, textareaClasses } from "@/components/atoms/input";
import { EmptyState } from "@/components/molecules/empty-state";
import { SegmentedControl } from "@/components/molecules/segmented-control";
import { useToast } from "@/components/molecules/toast";
import { formatDateTime } from "@/lib/format";
import type { ConversationRow, InboxMessageRow } from "@/lib/ops/inbox";
import { mailtoLink, waLink, whatsappWindow } from "@/lib/ops/inbox-rules";
import { useMinute } from "@/lib/hooks/use-minute";
import { cn } from "@/lib/utils";
import { markReadAction, replyAction, toTicketAction, updateConversationAction } from "../actions";

type Option = { id: string; name: string };
type Filter = "OPEN" | "PENDING" | "CLOSED" | "mine";

const CH = { WHATSAPP: { icon: MessageCircle, label: "WhatsApp" }, EMAIL: { icon: Mail, label: "Correo" } } as const;
const STATUS = { OPEN: "Abierta", PENDING: "Esperando respuesta", CLOSED: "Cerrada" } as const;

function since(ms: number, now: number) {
  const m = Math.round((now - ms) / 60_000);
  if (m < 1) return "ahora";
  if (m < 60) return `${m} min`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h} h` : `${Math.round(h / 24)} d`;
}

/**
 * Bandeja de NEXUS: WhatsApp y correo en un solo lugar. Sin proveedor
 * configurado, la respuesta se registra y se envía con un clic.
 */
export default function InboxView({
  conversations,
  active,
  messages,
  tenants,
  staff,
  me,
  canReply,
  providers,
}: {
  conversations: ConversationRow[];
  active: ConversationRow | null;
  messages: InboxMessageRow[];
  tenants: Option[];
  staff: Option[];
  me: string;
  canReply: boolean;
  providers: { whatsapp: boolean; email: boolean };
}) {
  const router = useRouter();
  const params = useSearchParams();
  const now = useMinute();
  const { toast } = useToast();
  const [filter, setFilter] = useState<Filter>("OPEN");
  const [body, setBody] = useState("");
  const [note, setNote] = useState(false);
  const [lastManual, setLastManual] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (active?.unread) void markReadAction(active.id);
  }, [active?.id, active?.unread]);

  const list = conversations.filter((c) => (filter === "mine" ? c.assigneeId === me && c.status !== "CLOSED" : c.status === filter));
  const open = (id: string) => {
    const p = new URLSearchParams(params.toString());
    p.set("c", id);
    router.push(`/admin/bandeja?${p.toString()}`, { scroll: false });
  };
  const run = (fn: () => Promise<{ ok: boolean; message?: string; delivery?: string; id?: string }>, after?: (r: { delivery?: string; id?: string }) => void) =>
    start(async () => {
      const r = await fn();
      if (r.ok) {
        if (r.message) toast(r.message, "success");
        after?.(r);
        // Si la acción lleva a otra página (ticket creado), no se refresca encima.
        if (!r.id) router.refresh();
      } else toast({ title: "No se pudo", description: r.message, variant: "error" });
    });

  const win = active?.channel === "WHATSAPP" ? whatsappWindow(active.lastInboundAt, now) : null;
  const providerOn = active ? (active.channel === "WHATSAPP" ? providers.whatsapp : providers.email) : false;
  const manualHref = active && lastManual ? (active.channel === "WHATSAPP" ? waLink(active.contactHandle, lastManual) : mailtoLink(active.contactHandle, active.subject, lastManual)) : null;

  return (
    <div className="grid min-h-[60dvh] grid-cols-1 overflow-hidden rounded-lg border border-border bg-surface lg:grid-cols-[minmax(280px,360px)_minmax(0,1fr)]">
      {/* Lista */}
      <section aria-label="Conversaciones" className={cn("min-w-0 border-border lg:border-r", active && "max-lg:hidden")}>
        <div className="overflow-x-auto border-b border-border p-2.5 [scrollbar-width:none]">
          <SegmentedControl
            ariaLabel="Filtro"
            size="sm"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "OPEN", label: "Abiertas", count: conversations.filter((c) => c.status === "OPEN").length },
              { value: "PENDING", label: "Esperando", count: conversations.filter((c) => c.status === "PENDING").length },
              { value: "mine", label: "Mías" },
              { value: "CLOSED", label: "Cerradas" },
            ]}
          />
        </div>
        {list.length ? (
          <ul className="divide-y divide-border">
            {list.map((c) => {
              const Icon = CH[c.channel].icon;
              return (
                <li key={c.id}>
                  <button type="button" onClick={() => open(c.id)} className={cn("flex w-full gap-3 px-3.5 py-3 text-left transition-colors hover:bg-surface-muted", active?.id === c.id && "bg-surface-muted")}>
                    <Icon aria-label={CH[c.channel].label} className={cn("mt-0.5 size-4 shrink-0", c.channel === "WHATSAPP" ? "text-success" : "text-accent-text")} />
                    <span className="grid min-w-0 flex-1 gap-0.5">
                      <span className="flex items-baseline gap-2">
                        <b className={cn("min-w-0 flex-1 truncate text-[13.5px]", c.unread ? "font-semibold" : "font-medium")}>{c.contactName ?? c.contactHandle}</b>
                        <small className="shrink-0 font-mono text-[11px] text-muted-foreground">{since(c.lastMessageAt, now)}</small>
                      </span>
                      <small className="truncate text-xs text-muted-foreground">{c.tenantName ?? "Sin negocio"}{c.subject ? ` · ${c.subject}` : ""}</small>
                      <small className={cn("truncate text-xs", c.unread ? "text-foreground" : "text-muted-foreground")}>{c.preview}</small>
                    </span>
                    {c.unread ? <span className="mt-1 grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1.5 font-mono text-[10.5px] font-bold text-ink">{c.unread}</span> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState title="Bandeja vacía" description={filter === "OPEN" ? "No hay conversaciones abiertas." : "Nada por aquí."} />
        )}
      </section>

      {/* Conversación */}
      <section aria-label="Conversación" className={cn("flex min-w-0 flex-col", !active && "max-lg:hidden")}>
        {active ? (
          <>
            <header className="flex flex-wrap items-center gap-2.5 border-b border-border px-4 py-3">
              <Link href="/admin/bandeja" aria-label="Volver" className={buttonVariants({ variant: "ghost", size: "icon", className: "lg:hidden" })}>
                <ArrowLeft aria-hidden="true" className="size-4" />
              </Link>
              <span className="min-w-0 flex-1">
                <b className="block truncate font-medium">{active.contactName ?? active.contactHandle}</b>
                <small className="block truncate font-mono text-xs text-muted-foreground">
                  {CH[active.channel].label} · {active.contactHandle}
                </small>
              </span>
              <Badge tone={active.status === "OPEN" ? "warning" : active.status === "PENDING" ? "neutral" : "muted"}>{STATUS[active.status]}</Badge>
              {active.ticketId ? (
                <Link href={`/admin/soporte/${active.ticketId}`} className={buttonVariants({ size: "sm", variant: "outline" })}>
                  <Ticket aria-hidden="true" className="size-3.5" /> Ver ticket
                </Link>
              ) : canReply ? (
                <button type="button" disabled={pending} onClick={() => run(() => toTicketAction(active.id), (r) => r.id && router.push(`/admin/soporte/${r.id}`))} className={buttonVariants({ size: "sm", variant: "outline" })}>
                  <Ticket aria-hidden="true" className="size-3.5" /> Crear ticket
                </button>
              ) : null}
            </header>

            <div className="grid gap-2 border-b border-border bg-surface-muted/50 px-4 py-2.5 text-[12.5px] sm:grid-cols-3">
              <label className="grid gap-1">
                Negocio
                <select disabled={!canReply || pending} value={active.tenantId ?? ""} onChange={(e) => run(() => updateConversationAction(active.id, { tenantId: e.target.value || null }))} className={cn(selectClasses, "h-8 text-[12.5px]")}>
                  <option value="">Sin negocio</option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1">
                Responsable
                <select disabled={!canReply || pending} value={active.assigneeId ?? ""} onChange={(e) => run(() => updateConversationAction(active.id, { assigneeId: e.target.value || null }))} className={cn(selectClasses, "h-8 text-[12.5px]")}>
                  <option value="">Sin asignar</option>
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                      {s.id === me ? " (tú)" : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1">
                Estado
                <select disabled={!canReply || pending} value={active.status} onChange={(e) => run(() => updateConversationAction(active.id, { status: e.target.value }))} className={cn(selectClasses, "h-8 text-[12.5px]")}>
                  <option value="OPEN">Abierta</option>
                  <option value="PENDING">Esperando respuesta</option>
                  <option value="CLOSED">Cerrada</option>
                </select>
              </label>
            </div>

            <ol className="flex flex-1 flex-col gap-2.5 overflow-y-auto px-4 py-4">
              {messages.map((m) => (
                <li
                  key={m.id}
                  className={cn(
                    "max-w-[85%] rounded-lg px-3 py-2 text-[13.5px]",
                    m.direction === "IN" && "self-start bg-surface-muted",
                    m.direction === "OUT" && "self-end bg-ink text-[#F7F6F3]",
                    m.direction === "NOTE" && "self-center border border-dashed border-accent/60 bg-accent-subtle/40",
                  )}
                >
                  <p className="whitespace-pre-wrap">{m.body}</p>
                  <small className={cn("mt-1 flex items-center gap-1 text-[11px]", m.direction === "OUT" ? "text-[#A1A1A8]" : "text-muted-foreground")}>
                    {m.direction === "NOTE" ? <Lock aria-hidden="true" className="size-3" /> : null}
                    {m.authorName ? `${m.authorName} · ` : ""}
                    {formatDateTime(new Date(m.createdAt))}
                    {m.direction === "OUT" ? ` · ${m.delivery === "sent" ? "enviado" : m.delivery === "failed" ? `falló: ${m.error}` : "registrado (envío manual)"}` : ""}
                  </small>
                </li>
              ))}
            </ol>

            {canReply ? (
              <div className="grid gap-2 border-t border-border p-3.5">
                {active.channel === "WHATSAPP" && !note && win && !win.open && providerOn ? (
                  <p className="rounded-md bg-accent-subtle px-3 py-2 text-xs">Pasaron más de 24 h desde su último mensaje: WhatsApp solo permite plantillas aprobadas. Escríbele desde una plantilla o espera a que responda.</p>
                ) : null}
                {manualHref ? (
                  <a href={manualHref} target="_blank" rel="noopener noreferrer" onClick={() => setLastManual(null)} className={buttonVariants({ size: "sm", variant: "accent", className: "justify-self-start" })}>
                    <ExternalLink aria-hidden="true" className="size-3.5" /> Enviar por {CH[active.channel].label}
                  </a>
                ) : null}
                <textarea aria-label="Mensaje" rows={3} value={body} onChange={(e) => setBody(e.target.value)} placeholder={note ? "Nota interna para el equipo…" : `Responder por ${CH[active.channel].label}…`} className={cn(textareaClasses, note && "border-dashed")} />
                <div className="flex flex-wrap items-center gap-2">
                  <SegmentedControl ariaLabel="Tipo" size="sm" value={note ? "note" : "reply"} onChange={(v) => setNote(v === "note")} options={[{ value: "reply", label: "Responder" }, { value: "note", label: "Nota interna" }]} />
                  <small className="min-w-0 flex-1 text-xs text-muted-foreground">{note ? "Solo la ve el equipo." : providerOn ? "Se envía por el proveedor conectado." : "Sin proveedor conectado: se registra y la envías con un clic."}</small>
                  <button
                    type="button"
                    disabled={pending || !body.trim()}
                    onClick={() => {
                      const text = body;
                      run(() => replyAction(active.id, text, note), (r) => {
                        setBody("");
                        if (r.delivery === "manual") setLastManual(text);
                      });
                    }}
                    className={buttonVariants({ size: "sm" })}
                  >
                    <Send aria-hidden="true" className="size-3.5" /> {note ? "Guardar nota" : "Enviar"}
                  </button>
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <div className="grid flex-1 place-items-center p-8">
            <EmptyState title="Elige una conversación" description="WhatsApp y correo de los negocios llegan aquí." />
          </div>
        )}
      </section>
    </div>
  );
}
