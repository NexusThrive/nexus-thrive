"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/molecules/alert";
import { Badge } from "@/components/atoms/badge";
import { buttonVariants } from "@/components/atoms/button-variants";
import { inputClasses } from "@/components/atoms/input";
import { Select } from "@/components/atoms/select";
import { EmptyState } from "@/components/molecules/empty-state";
import { Field } from "@/components/molecules/field";
import { SegmentedControl } from "@/components/molecules/segmented-control";
import { useToast } from "@/components/molecules/toast";
import { FormDialog } from "@/components/organisms/form-sheet";
import { metaStatusAction, saveTemplateAction, sendPendingAction, type NoticeResult } from "@/app/[tenant]/(app)/avisos/actions";
import { META_STATUS_TEXT, NOTICE_EVENTS } from "@/lib/integrations/channels/notices";
import type { NoticeRow, TemplateRow } from "@/lib/integrations/channels/notices-db";

type Tab = "templates" | "notices";
const EVENT_TEXT: Record<string, string> = { "order.created": "Se recibe un pedido", "order.paid": "Se paga un pedido", "cart.abandoned": "Un pedido queda sin pagar", "order.confirmed": "Se confirma un pedido", "order.ready": "Un pedido queda listo", "order.shipped": "Se envía un pedido", "order.delivered": "Se entrega un pedido" };
const STATUS_TEXT = { PENDING: "Pendiente", SENT: "Enviado", MANUAL: "Listo para enviar con un toque", BLOCKED: "Bloqueado por baja", FAILED: "Con error" } as const;
const TONE = { PENDING: "secondary", SENT: "success", MANUAL: "warning", BLOCKED: "destructive", FAILED: "destructive" } as const;
type Dialog = { kind: "template"; row: TemplateRow | null } | { kind: "meta"; row: TemplateRow } | null;

/** Plantillas (texto, hecho que las dispara, aprobación en Meta) y avisos (lo que salió o quedó listo con un toque). */
export default function NoticesView({ slug, templates, notices, connected }: { slug: string; templates: TemplateRow[]; notices: NoticeRow[]; connected: boolean }) {
  const [tab, setTab] = useState<Tab>("templates");
  const [dialog, setDialog] = useState<Dialog>(null);
  const router = useRouter();
  const { toast } = useToast();
  const done = (message?: string) => {
    if (message) toast(message, "success");
    router.refresh();
  };
  const sendNow = async () => {
    const r: NoticeResult = await sendPendingAction(slug);
    toast(r.message, r.ok ? "success" : "error");
    if (r.ok) router.refresh();
  };
  return (
    <div className="grid gap-4">
      {!connected ? (
        <Alert tone="info">
          Aún no conectas tu número de WhatsApp Business: los avisos quedan listos para enviarlos con un toque.{" "}
          <Link href={`/${slug}/integrations`} className="font-semibold underline">Conectar WhatsApp</Link>
        </Alert>
      ) : null}
      <Alert tone="warning">Fuera de las 24 h desde el último mensaje del cliente, WhatsApp solo deja enviar plantillas aprobadas por Meta. Sin consentimiento, el aviso nunca sale solo; si el cliente escribe «BAJA», no le sale ninguno más.</Alert>
      <div className="flex flex-wrap items-center gap-2">
        <div className="max-w-full overflow-x-auto pb-1">
          <SegmentedControl ariaLabel="Sección" value={tab} onChange={setTab} options={[{ value: "templates", label: "Plantillas" }, { value: "notices", label: "Avisos", count: notices.filter((n) => n.status === "MANUAL" || n.status === "PENDING").length || undefined }]} />
        </div>
        <button type="button" onClick={sendNow} className={buttonVariants({ variant: "outline", className: "ml-auto" })}>Procesar avisos ahora</button>
      </div>

      {tab === "templates" ? (
        templates.length === 0 ? (
          <EmptyState title="Sin plantillas" description="Se crean las de partida la primera vez que abres esta pantalla." />
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
            {templates.map((t) => (
              <li key={t.id} className="grid gap-2 px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <b className="text-ui font-medium">{t.title}</b>
                  <Badge variant={t.metaStatus === "APPROVED" ? "success" : t.metaStatus === "REJECTED" ? "destructive" : "secondary"}>{META_STATUS_TEXT[t.metaStatus]}</Badge>
                  {!t.enabled ? <Badge variant="outline">Apagada</Badge> : null}
                </div>
                <p className="break-words text-ui text-muted-foreground">{t.body}</p>
                <p className="text-xs text-muted-foreground">{t.event ? `Se envía cuando: ${EVENT_TEXT[t.event] ?? t.event}` : "Solo manual"}{t.metaName ? ` · en Meta: ${t.metaName}` : ""}</p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => setDialog({ kind: "template", row: t })} className={buttonVariants({ variant: "outline", size: "sm" })}>Editar</button>
                  <button type="button" onClick={() => setDialog({ kind: "meta", row: t })} className={buttonVariants({ variant: "ghost", size: "sm" })}>Estado en Meta</button>
                </div>
              </li>
            ))}
          </ul>
        )
      ) : notices.length === 0 ? (
        <EmptyState title="Aún no hay avisos" description="Cuando se reciba o se pague un pedido, el aviso aparece aquí con lo que pasó." />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
          {notices.map((n) => (
            <li key={n.id} className="grid gap-1.5 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <b className="text-ui font-medium">{n.customerName ?? "Contacto"}</b>
                <Badge variant={TONE[n.status]}>{STATUS_TEXT[n.status]}</Badge>
                <span className="text-xs text-muted-foreground">{EVENT_TEXT[n.event] ?? n.event}</span>
              </div>
              {n.text ? <p className="break-words text-ui text-muted-foreground">{n.text}</p> : null}
              {n.reason ? <p className="text-xs text-muted-foreground">{n.reason}</p> : null}
              {n.link ? <a href={n.link} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "outline", size: "sm", className: "justify-self-start" })}>Enviar con un toque en WhatsApp</a> : null}
            </li>
          ))}
        </ul>
      )}

      <FormDialog
        open={dialog?.kind === "template"}
        onOpenChange={(o) => !o && setDialog(null)}
        title={dialog?.kind === "template" && dialog.row ? "Editar plantilla" : "Nueva plantilla"}
        description="Usa {{nombre}}, {{codigo}}, {{total}} y {{negocio}} donde quieras que se rellenen. Si cambias el texto, hay que volver a aprobarla en Meta."
        submitLabel="Guardar"
        pendingLabel="Guardando…"
        onSubmit={async (d) => {
          const r = await saveTemplateAction(slug, { key: String(d.get("key") ?? ""), title: String(d.get("title") ?? ""), body: String(d.get("body") ?? ""), event: String(d.get("event") ?? ""), enabled: d.get("enabled") === "on" });
          return r.ok ? { ok: true, message: r.message } : { ok: false, message: r.message, fieldErrors: { key: r.message } };
        }}
        onSuccess={({ message }) => done(message)}
      >
        {({ fieldErrors }) => {
          const row = dialog?.kind === "template" ? dialog.row : null;
          return (
            <div className="grid gap-3">
              <Field label="Clave" required error={fieldErrors.key} hint="Minúsculas y guion bajo.">{(c) => <input {...c} name="key" autoComplete="off" defaultValue={row?.key ?? ""} readOnly={Boolean(row)} className={inputClasses} placeholder="pedido_listo" />}</Field>
              <Field label="Título" required>{(c) => <input {...c} name="title" autoComplete="off" maxLength={80} defaultValue={row?.title ?? ""} className={inputClasses} />}</Field>
              <Field label="Texto del mensaje" required>{(c) => <textarea {...c} name="body" rows={4} maxLength={1000} defaultValue={row?.body ?? ""} className={inputClasses} />}</Field>
              <Field label="Se envía cuando">
                {(c) => (
                  <Select {...c} name="event" defaultValue={row?.event ?? ""}>
                    <option value="">Solo manual</option>
                    {NOTICE_EVENTS.map((e) => <option key={e} value={e}>{EVENT_TEXT[e]}</option>)}
                  </Select>
                )}
              </Field>
              <label className="flex items-center gap-2 text-ui"><input type="checkbox" name="enabled" defaultChecked={row?.enabled ?? true} /> Encendida</label>
            </div>
          );
        }}
      </FormDialog>

      <FormDialog
        open={dialog?.kind === "meta"}
        onOpenChange={(o) => !o && setDialog(null)}
        title="Estado en Meta"
        description={dialog?.kind === "meta" ? `${dialog.row.title}. La aprobación se pide y se da en Meta; aquí solo anotas cómo va.` : undefined}
        submitLabel="Guardar"
        pendingLabel="Guardando…"
        onSubmit={async (d) => {
          const r = await metaStatusAction(slug, (dialog as { row: TemplateRow }).row.id, String(d.get("status") ?? "NONE"), String(d.get("metaName") ?? ""));
          return r.ok ? { ok: true, message: r.message } : { ok: false, message: r.message, fieldErrors: { metaName: r.message } };
        }}
        onSuccess={({ message }) => done(message)}
      >
        {({ fieldErrors }) => {
          const row = dialog?.kind === "meta" ? dialog.row : null;
          return (
            <div className="grid gap-3">
              <Field label="Estado">
                {(c) => (
                  <Select {...c} name="status" defaultValue={row?.metaStatus ?? "NONE"}>
                    {(Object.keys(META_STATUS_TEXT) as (keyof typeof META_STATUS_TEXT)[]).map((s) => <option key={s} value={s}>{META_STATUS_TEXT[s]}</option>)}
                  </Select>
                )}
              </Field>
              <Field label="Nombre de la plantilla en Meta" error={fieldErrors.metaName} hint="Obligatorio si está aprobada. Minúsculas y guion bajo.">{(c) => <input {...c} name="metaName" autoComplete="off" defaultValue={row?.metaName ?? ""} className={inputClasses} />}</Field>
            </div>
          );
        }}
      </FormDialog>
    </div>
  );
}
