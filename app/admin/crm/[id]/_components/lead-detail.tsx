"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Mail, MessageCircle, Pencil, Phone, Trash2 } from "lucide-react";
import { Badge } from "@/components/atoms/badge";
import { buttonVariants } from "@/components/atoms/button-variants";
import { textareaClasses } from "@/components/atoms/input";
import { SegmentedControl } from "@/components/molecules/segmented-control";
import { useToast } from "@/components/molecules/toast";
import { followUpState, isActiveStage, LEAD_ACTIVITY_KINDS, LEAD_STAGES, stageMeta } from "@/lib/ops/crm-rules";
import type { LeadActivityRow, LeadRow } from "@/lib/ops/leads";
import { formatDateTime } from "@/lib/format";
import { formatUsdCents } from "@/lib/plans/pricing";
import { cn } from "@/lib/utils";
import Panel from "../../../_components/panel";
import { addLeadActivityAction, deleteLeadAction } from "../../actions";
import LeadSheet, { type Option } from "../../_components/lead-sheet";

type Kind = (typeof LEAD_ACTIVITY_KINDS)[number]["value"];

/** Ficha del lead: datos, etapa, próximo paso y bitácora de actividad. */
export default function LeadDetail({
  lead,
  activity,
  owners,
  tenants,
  me,
  today,
  canEdit,
  canAssign,
  verticalLabel,
  tenantName,
}: {
  lead: LeadRow;
  activity: LeadActivityRow[];
  owners: Option[];
  tenants: Option[];
  me: string;
  today: string;
  canEdit: boolean;
  canAssign: boolean;
  verticalLabel: string | null;
  tenantName: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [kind, setKind] = useState<Kind>("call");
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  const { toast } = useToast();
  const follow = followUpState(lead.stage, lead.nextStepDate, today);
  const stageIndex = LEAD_STAGES.findIndex((s) => s.value === lead.stage);

  const log = () =>
    start(async () => {
      const r = await addLeadActivityAction(lead.id, kind, body);
      if (r.ok) {
        setBody("");
        toast("Actividad registrada", "success");
        router.refresh();
      } else toast({ title: "No se registró", description: r.message, variant: "error" });
    });

  return (
    <div className="grid gap-4">
      {/* Recorrido por el embudo. */}
      <ol aria-label="Etapa del lead" className="flex gap-1 overflow-x-auto [scrollbar-width:none]">
        {LEAD_STAGES.filter((s) => s.value !== "LOST").map((s, i) => {
          const done = lead.stage !== "LOST" && i <= stageIndex;
          return (
            <li key={s.value} className={cn("min-w-[84px] flex-1 border-t-2 pt-1.5 text-[11px]", done ? "border-accent text-foreground" : "border-border text-muted-foreground", s.value === lead.stage && "font-semibold")}>
              {s.short}
            </li>
          );
        })}
      </ol>

      <div className="grid grid-cols-1 items-start gap-3.5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <Panel
          title="Datos del lead"
          action={
            canEdit ? (
              <button type="button" onClick={() => setEditing(true)} className={buttonVariants({ variant: "outline", size: "sm" })}>
                <Pencil aria-hidden="true" className="size-3.5" /> Editar
              </button>
            ) : null
          }
        >
          <dl className="grid gap-3 p-[18px] text-[13.5px]">
            <div className="flex flex-wrap gap-1.5">
              <Badge tone={lead.stage === "WON" ? "success" : lead.stage === "LOST" ? "muted" : "warning"}>{stageMeta(lead.stage).label}</Badge>
              {lead.valueUsdCents ? <Badge variant="gold">{formatUsdCents(lead.valueUsdCents)}/mes</Badge> : null}
              {verticalLabel ? <Badge tone="neutral">{verticalLabel}</Badge> : null}
            </div>
            {isActiveStage(lead.stage) ? (
              <div className={cn("flex items-start gap-2 rounded-md p-3", follow === "overdue" ? "bg-danger-subtle text-danger" : "bg-surface-muted")}>
                <CalendarClock aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                <span>
                  <b className="block font-medium">{lead.nextStep}</b>
                  <small className="text-xs">{follow === "overdue" ? `Vencido · ${lead.nextStepDate}` : follow === "today" ? "Para hoy" : lead.nextStepDate}</small>
                </span>
              </div>
            ) : null}
            {lead.stage === "LOST" ? <p className="text-muted-foreground">Motivo: {lead.lostReason}</p> : null}
            {lead.stage === "WON" ? <p className="text-muted-foreground">Negocio: {tenantName ?? "sin vincular todavía"}</p> : null}
            {[
              ["Contacto", lead.contactName],
              ["Responsable", lead.ownerName ?? "Sin responsable"],
              ["Origen", lead.source],
              ["Ciudad", lead.city],
              ["Plan de interés", lead.plan],
            ]
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 border-b border-border pb-2 last:border-0">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="text-right font-medium">{v}</dd>
                </div>
              ))}
            <div className="flex flex-wrap gap-2">
              {lead.phone ? (
                <>
                  <a href={`tel:${lead.phone}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                    <Phone aria-hidden="true" className="size-3.5" /> Llamar
                  </a>
                  <a href={`https://wa.me/${lead.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "outline", size: "sm" })}>
                    <MessageCircle aria-hidden="true" className="size-3.5" /> WhatsApp
                  </a>
                </>
              ) : null}
              {lead.email ? (
                <a href={`mailto:${lead.email}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                  <Mail aria-hidden="true" className="size-3.5" /> Correo
                </a>
              ) : null}
            </div>
            {lead.notes ? <p className="whitespace-pre-wrap rounded-md bg-surface-muted p-3 text-[13px]">{lead.notes}</p> : null}
            {canAssign ? (
              <button
                type="button"
                onClick={() => {
                  if (!window.confirm(`¿Eliminar el lead ${lead.company}? Se borra su actividad.`)) return;
                  start(async () => {
                    const r = await deleteLeadAction(lead.id);
                    if (r.ok) router.push("/admin/crm");
                    else toast({ title: "No se eliminó", description: r.message, variant: "error" });
                  });
                }}
                className={buttonVariants({ variant: "ghost", size: "sm", className: "justify-self-start text-danger" })}
              >
                <Trash2 aria-hidden="true" className="size-3.5" /> Eliminar lead
              </button>
            ) : null}
          </dl>
        </Panel>

        <Panel title="Actividad" hint="Cada llamada, mensaje o reunión con el prospecto.">
          {canEdit ? (
            <div className="grid gap-2.5 border-b border-border p-[18px]">
              <div className="overflow-x-auto [scrollbar-width:none]">
                <SegmentedControl ariaLabel="Tipo de actividad" size="sm" value={kind} onChange={setKind} options={LEAD_ACTIVITY_KINDS.map((k) => ({ value: k.value, label: k.label }))} />
              </div>
              <textarea aria-label="Qué pasó" rows={3} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Qué pasó y qué sigue…" className={textareaClasses} />
              <button type="button" disabled={pending || body.trim().length < 2} onClick={log} className={buttonVariants({ size: "sm", className: "justify-self-end" })}>
                Registrar
              </button>
            </div>
          ) : null}
          <ol className="grid gap-0 p-[18px]">
            {activity.map((a) => (
              <li key={a.id} className="relative border-l border-border pb-4 pl-4 last:pb-0">
                <span aria-hidden="true" className={cn("absolute -left-[4.5px] top-1 size-2 rounded-full", a.kind === "stage" ? "bg-accent" : "bg-foreground/60")} />
                <p className="text-xs text-muted-foreground">
                  {a.kind === "stage" ? "Etapa" : (LEAD_ACTIVITY_KINDS.find((k) => k.value === a.kind)?.label ?? a.kind)} · {a.staffName ?? "Equipo"} · {formatDateTime(a.createdAt)}
                </p>
                <p className="whitespace-pre-wrap text-[13.5px]">{a.body}</p>
              </li>
            ))}
            {activity.length === 0 ? <li className="text-sm text-muted-foreground">Sin actividad todavía.</li> : null}
          </ol>
        </Panel>
      </div>

      {editing ? <LeadSheet lead={lead} open onOpenChange={setEditing} owners={owners} tenants={tenants} me={me} today={today} canAssign={canAssign} /> : null}
    </div>
  );
}
