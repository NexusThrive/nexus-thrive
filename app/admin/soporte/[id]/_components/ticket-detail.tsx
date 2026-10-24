"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lock, Send } from "lucide-react";
import { Badge } from "@/components/atoms/badge";
import { buttonVariants } from "@/components/atoms/button-variants";
import { textareaClasses } from "@/components/atoms/input";
import { SegmentedControl } from "@/components/molecules/segmented-control";
import { useToast } from "@/components/molecules/toast";
import { formatDateTime } from "@/lib/format";
import { allowedTransitions, isOpenStatus, statusMeta, TICKET_CATEGORIES, TICKET_PRIORITIES, type TicketStatusValue } from "@/lib/ops/support-rules";
import type { TicketMessageRow, TicketRow } from "@/lib/ops/tickets";
import { cn } from "@/lib/utils";
import Panel from "../../../_components/panel";
import { addTicketMessageAction, setTicketStatusAction, updateTicketAction } from "../../actions";
import SlaBadge from "../../_components/sla-badge";
import { Select } from "@/components/atoms/select";

type Option = { id: string; name: string };

/** Ticket: conversación con el cliente, notas internas y control del caso. */
export default function TicketDetail({ ticket, messages, staff, me, canReply, canEscalate }: { ticket: TicketRow; messages: TicketMessageRow[]; staff: Option[]; me: string; canReply: boolean; canEscalate: boolean }) {
  const [mode, setMode] = useState<"reply" | "internal">("reply");
  const [body, setBody] = useState("");
  const [solution, setSolution] = useState(ticket.solution ?? "");
  const [pending, start] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  const run = (fn: () => Promise<{ ok: boolean; message?: string }>, done: string, after?: () => void) =>
    start(async () => {
      const r = await fn();
      if (r.ok) {
        toast(done, "success");
        after?.();
        router.refresh();
      } else toast({ title: "No se pudo", description: "message" in r ? r.message : undefined, variant: "error" });
    });

  const next = allowedTransitions(ticket.status).filter((s) => s !== "ESCALATED" || canEscalate);
  const move = (to: TicketStatusValue) => run(() => setTicketStatusAction(ticket.id, to, to === "RESOLVED" ? solution : undefined), `Ticket ${statusMeta(to).label.toLowerCase()}`);

  return (
    <div className="grid grid-cols-1 items-start gap-3.5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <Panel title="Conversación" hint="Las respuestas al cliente cuentan para el SLA; las notas internas no se le muestran.">
        <ol className="grid gap-3 p-[18px]">
          <li className="rounded-md border border-border bg-surface-muted p-3">
            <p className="text-xs text-muted-foreground">
              {ticket.requesterName ?? "Cliente"} · {ticket.channel} · {formatDateTime(new Date(ticket.createdAt))}
            </p>
            <p className="mt-1 whitespace-pre-wrap text-[13.5px]">{ticket.description}</p>
          </li>
          {messages.map((m) => (
            <li key={m.id} className={cn("rounded-md border p-3", m.internal ? "border-dashed border-accent/60 bg-accent-subtle/40" : "border-border bg-surface")}>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {m.internal ? <Lock aria-hidden="true" className="size-3" /> : null}
                {m.internal ? "Nota interna" : "Respuesta"} · {m.authorName} · {formatDateTime(new Date(m.createdAt))}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-[13.5px]">{m.body}</p>
            </li>
          ))}
        </ol>
        {canReply ? (
          <div className="grid gap-2.5 border-t border-border p-[18px]">
            <SegmentedControl ariaLabel="Tipo de mensaje" size="sm" value={mode} onChange={setMode} options={[{ value: "reply", label: "Respuesta al cliente" }, { value: "internal", label: "Nota interna" }]} />
            <textarea aria-label="Mensaje" rows={3} value={body} onChange={(e) => setBody(e.target.value)} placeholder={mode === "reply" ? "Lo que le respondiste al cliente…" : "Contexto para el equipo…"} className={cn(textareaClasses, mode === "internal" && "border-dashed")} />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <small className="text-xs text-muted-foreground">{mode === "reply" ? "Registra la respuesta enviada por el canal del ticket." : "Solo la ve el equipo NEXUS."}</small>
              <button type="button" disabled={pending || body.trim().length < 2} onClick={() => run(() => addTicketMessageAction(ticket.id, body, mode === "internal"), mode === "reply" ? "Respuesta registrada" : "Nota guardada", () => setBody(""))} className={buttonVariants({ size: "sm" })}>
                <Send aria-hidden="true" className="size-3.5" /> {mode === "reply" ? "Registrar respuesta" : "Guardar nota"}
              </button>
            </div>
          </div>
        ) : null}
      </Panel>

      <div className="grid gap-3.5">
        <Panel title="Estado del caso">
          <div className="grid gap-3 p-[18px]">
            <div className="flex flex-wrap gap-1.5">
              <Badge tone={statusMeta(ticket.status).tone}>{statusMeta(ticket.status).label}</Badge>
              <SlaBadge t={ticket} />
            </div>
            {canReply && isOpenStatus(ticket.status) ? (
              <label className="grid gap-1.5 text-[13px] font-medium">
                Solución <small className="font-normal text-muted-foreground">Obligatoria para resolver.</small>
                <textarea rows={3} value={solution} onChange={(e) => setSolution(e.target.value)} className={textareaClasses} placeholder="Qué se hizo para solucionarlo." />
              </label>
            ) : ticket.solution ? (
              <p className="rounded-md bg-success-subtle p-3 text-[13px]">
                <b className="block text-xs font-semibold">Solución</b>
                {ticket.solution}
              </p>
            ) : null}
            {canReply ? (
              <div className="flex flex-wrap gap-2">
                {next.map((s) => (
                  <button key={s} type="button" disabled={pending} onClick={() => move(s)} className={buttonVariants({ size: "sm", variant: s === "RESOLVED" ? "primary" : "outline" })}>
                    {s === "OPEN" && !isOpenStatus(ticket.status) ? "Reabrir" : statusMeta(s).label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </Panel>

        <Panel title="Detalles">
          <div className="grid gap-3 p-[18px] text-[13px]">
            <label className="grid gap-1.5 font-medium">
              Responsable
              <Select
                disabled={!canReply || pending}
                value={ticket.assigneeId ?? ""}
                onChange={(e) => run(() => updateTicketAction(ticket.id, { assigneeId: e.target.value || null }), "Responsable actualizado")}
              >
                <option value="">Sin asignar</option>
                {staff
                  .filter((s) => canEscalate || s.id === me || s.id === ticket.assigneeId)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                      {s.id === me ? " (tú)" : ""}
                    </option>
                  ))}
              </Select>
            </label>
            <label className="grid gap-1.5 font-medium">
              Prioridad
              <Select disabled={!canReply || pending} value={ticket.priority} onChange={(e) => run(() => updateTicketAction(ticket.id, { priority: e.target.value }), "Prioridad actualizada")}>
                {TICKET_PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label} · respuesta {p.firstResponseHours} h · resolución {p.resolutionHours} h
                  </option>
                ))}
              </Select>
            </label>
            <label className="grid gap-1.5 font-medium">
              Categoría
              <Select disabled={!canReply || pending} value={ticket.category} onChange={(e) => run(() => updateTicketAction(ticket.id, { category: e.target.value }), "Categoría actualizada")}>
                {TICKET_CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            </label>
            <dl className="grid gap-1.5 text-muted-foreground">
              {[
                ["Canal", ticket.channel],
                ["Reporta", [ticket.requesterName, ticket.requesterContact].filter(Boolean).join(" · ") || "—"],
                ["Creado", formatDateTime(new Date(ticket.createdAt))],
                ["Primera respuesta", ticket.firstResponseAt ? formatDateTime(new Date(ticket.firstResponseAt)) : "Pendiente"],
                ["Resuelto", ticket.resolvedAt ? formatDateTime(new Date(ticket.resolvedAt)) : "—"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
                  <dt>{k}</dt>
                  <dd className="text-right text-foreground">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Panel>
      </div>
    </div>
  );
}
