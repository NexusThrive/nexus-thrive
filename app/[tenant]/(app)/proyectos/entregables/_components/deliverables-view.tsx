"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Paperclip, Plus } from "lucide-react";
import { Alert } from "@/components/molecules/alert";
import { Badge } from "@/components/atoms/badge";
import { buttonVariants } from "@/components/atoms/button-variants";
import { inputClasses } from "@/components/atoms/input";
import { Select } from "@/components/atoms/select";
import { EmptyState } from "@/components/molecules/empty-state";
import { Field } from "@/components/molecules/field";
import { useToast } from "@/components/molecules/toast";
import { FormDialog } from "@/components/organisms/form-sheet";
import { createDeliverableAction, sendDeliverableAction, uploadDeliverableFileAction } from "@/app/[tenant]/(app)/proyectos/entregables/actions";
import { DELIVERABLE_TEXT, canSend } from "@/lib/business/customers/deliverables";
import type { DeliverableRow } from "@/lib/business/customers/deliverables-db";

const TONE = { DRAFT: "secondary", IN_REVIEW: "warning", APPROVED: "success", CHANGES_REQUESTED: "destructive" } as const;
type Dialog = { kind: "new" } | { kind: "file"; row: DeliverableRow } | null;

/** Entregables con sus archivos y estado. El enlace para el cliente se muestra al enviar (una sola vez: no se guarda en claro). */
export default function DeliverablesView({ slug, rows, projects, customers }: { slug: string; rows: DeliverableRow[]; projects: { id: string; name: string }[]; customers: { id: string; name: string }[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [link, setLink] = useState<{ title: string; url: string } | null>(null);
  const done = (message?: string) => {
    if (message) toast(message, "success");
    router.refresh();
  };
  const send = async (row: DeliverableRow) => {
    const r = await sendDeliverableAction(slug, row.id);
    if (!r.ok) return toast(r.message, "error");
    setLink({ title: row.title, url: r.link! });
    router.refresh();
  };
  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast("Enlace copiado", "success");
    } catch {
      toast("No se pudo copiar: selecciona el enlace y cópialo a mano.", "error");
    }
  };

  return (
    <div className="grid gap-4">
      <div className="flex">
        <button type="button" onClick={() => setDialog({ kind: "new" })} className={buttonVariants({ className: "ml-auto" })}>
          <Plus aria-hidden="true" className="size-4" /> Nuevo entregable
        </button>
      </div>
      {link ? (
        <div className="grid gap-2 rounded-lg border border-border bg-surface p-4">
          <Alert tone="info" title={`Enlace para el cliente: ${link.title}`}>Se muestra una sola vez y caduca en 30 días. Cópialo y envíaselo a tu cliente.</Alert>
          <code className="break-all rounded-md bg-muted px-2 py-1 font-mono text-xs text-foreground">{link.url}</code>
          <div className="flex gap-2">
            <button type="button" onClick={() => copy(link.url)} className={buttonVariants({ size: "sm" })}>Copiar enlace</button>
            <button type="button" onClick={() => setLink(null)} className={buttonVariants({ variant: "ghost", size: "sm" })}>Ocultar</button>
          </div>
        </div>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState mark="page" title="Aún no hay entregables" description="Crea uno, adjunta los archivos y envíaselo a tu cliente para que lo apruebe." />
      ) : (
        <ul className="grid gap-3">
          {rows.map((r) => (
            <li key={r.id} className="grid gap-2 rounded-lg border border-border bg-surface p-4">
              <div className="flex flex-wrap items-center gap-2">
                <b className="break-words">{r.title}</b>
                <Badge variant={TONE[r.status]}>{DELIVERABLE_TEXT[r.status]}</Badge>
              </div>
              <p className="text-ui text-muted-foreground">{[r.customerName, r.projectName ? `Proyecto ${r.projectName}` : null].filter(Boolean).join(" · ") || "Sin cliente ni proyecto"}</p>
              {r.description ? <p className="break-words text-ui">{r.description}</p> : null}
              <p className="flex items-center gap-1 text-ui text-muted-foreground"><Paperclip aria-hidden="true" className="size-4" /> {r.files.length === 0 ? "Sin archivos" : r.files.map((f) => f.fileName).join(", ")}</p>
              {r.status === "APPROVED" ? <p className="text-ui">Aprobado por <b>{r.decidedByName}</b> el {r.decidedAt?.slice(0, 10)}.</p> : null}
              {r.status === "CHANGES_REQUESTED" ? <Alert tone="warning" title={`${r.decidedByName ?? "El cliente"} pidió cambios`}>{r.clientComment}</Alert> : null}
              {canSend(r.status) ? (
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => setDialog({ kind: "file", row: r })} className={buttonVariants({ variant: "outline", size: "sm" })}>Adjuntar archivo</button>
                  <button type="button" onClick={() => send(r)} className={buttonVariants({ size: "sm" })}>{r.status === "CHANGES_REQUESTED" ? "Reenviar al cliente" : "Enviar al cliente"}</button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <FormDialog
        open={dialog?.kind === "new"}
        onOpenChange={(o) => !o && setDialog(null)}
        title="Nuevo entregable"
        description="Algo que le entregas a un cliente para que lo apruebe."
        submitLabel="Crear"
        pendingLabel="Creando…"
        onSubmit={async (d) => {
          const r = await createDeliverableAction(slug, { title: String(d.get("title") ?? ""), description: String(d.get("description") ?? ""), projectId: String(d.get("projectId") ?? ""), customerId: String(d.get("customerId") ?? "") });
          return r.ok ? { ok: true, message: r.message } : { ok: false, message: r.message, fieldErrors: { title: r.message } };
        }}
        onSuccess={({ message }) => done(message)}
      >
        {({ fieldErrors }) => (
          <div className="grid gap-3">
            <Field label="Nombre" required error={fieldErrors.title}>{(c) => <input {...c} name="title" autoComplete="off" maxLength={160} className={inputClasses} placeholder="Ej.: Logo final" />}</Field>
            <Field label="Descripción">{(c) => <input {...c} name="description" autoComplete="off" maxLength={1000} className={inputClasses} />}</Field>
            <Field label="Cliente">
              {(c) => (
                <Select {...c} name="customerId" defaultValue="">
                  <option value="">Ninguno</option>
                  {customers.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </Select>
              )}
            </Field>
            {projects.length > 0 ? (
              <Field label="Proyecto">
                {(c) => (
                  <Select {...c} name="projectId" defaultValue="">
                    <option value="">Ninguno</option>
                    {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </Select>
                )}
              </Field>
            ) : null}
          </div>
        )}
      </FormDialog>

      <FormDialog
        open={dialog?.kind === "file"}
        onOpenChange={(o) => !o && setDialog(null)}
        title="Adjuntar archivo"
        description={dialog?.kind === "file" ? dialog.row.title : undefined}
        submitLabel="Subir"
        pendingLabel="Subiendo…"
        onSubmit={async (d) => {
          const r = await uploadDeliverableFileAction(slug, (dialog as { row: DeliverableRow }).row.id, d);
          return r.ok ? { ok: true, message: r.message } : { ok: false, message: r.message, fieldErrors: { file: r.message } };
        }}
        onSuccess={({ message }) => done(message)}
      >
        {({ fieldErrors }) => (
          <Field label="Archivo" required error={fieldErrors.file} hint="PDF, JPG, PNG o WEBP, hasta 8 MB.">{(c) => <input {...c} name="file" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className={inputClasses} />}</Field>
        )}
      </FormDialog>
    </div>
  );
}
