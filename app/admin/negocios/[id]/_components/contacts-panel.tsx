"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Mail, MessageCircle, Pencil, Phone, Plus, Trash2 } from "lucide-react";
import { buttonVariants } from "@/components/atoms/button-variants";
import { Chip, ChipRow } from "@/components/atoms/chip";
import { inputClasses, textareaClasses } from "@/components/atoms/input";
import { Alert } from "@/components/molecules/alert";
import { EmptyState } from "@/components/molecules/empty-state";
import { Field } from "@/components/molecules/field";
import { useToast } from "@/components/molecules/toast";
import { ResponsiveSheet } from "@/components/organisms/responsive-sheet";
import type { ContactRow } from "@/lib/ops/accounts";
import { CONTACT_CHANNELS, CONTACT_PURPOSES } from "@/lib/ops/validators";
import { cn } from "@/lib/utils";
import { deleteContactAction, saveContactAction } from "../../actions";

const EMPTY = { name: "", purpose: "Dueño", phone: "", whatsapp: "", email: "", preferredChannel: "WhatsApp", hours: "", notes: "" };
const wa = (n: string) => `https://wa.me/${n.replace(/\D/g, "").replace(/^(\d{10})$/, "57$1")}`;

/**
 * Contactos del negocio para el equipo NEXUS: para qué sirve cada canal,
 * cuál prefiere y en qué horario. Acciones rápidas: WhatsApp, llamar y
 * correo (se muestran también como texto para copiar).
 */
export default function ContactsPanel({ tenantId, contacts, canEdit }: { tenantId: string; contacts: ContactRow[]; canEdit: boolean }) {
  const [editing, setEditing] = useState<(typeof EMPTY & { id?: string }) | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  const save = () =>
    editing &&
    start(async () => {
      const r = await saveContactAction(tenantId, editing);
      if (r.ok) {
        setEditing(null);
        toast("Contacto guardado", "success");
        router.refresh();
      } else {
        setErrors(r.errors ?? {});
        setMessage(r.message);
      }
    });

  const remove = (id: string) =>
    start(async () => {
      const r = await deleteContactAction(tenantId, id);
      if (r.ok) {
        toast("Contacto eliminado", "success");
        router.refresh();
      } else toast({ title: "No se pudo eliminar", description: r.message, variant: "error" });
    });

  const set = (k: keyof typeof EMPTY, v: string) => editing && setEditing({ ...editing, [k]: v });

  return (
    <div>
      {contacts.length === 0 ? (
        <EmptyState title="Sin contactos" description="Agrega al dueño y a quien atiende pagos o temas técnicos." />
      ) : (
        <ul className="divide-y divide-border">
          {contacts.map((c) => (
            <li key={c.id} className="grid gap-2 px-[18px] py-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <b className="block truncate font-medium">{c.name}</b>
                  <small className="block text-xs text-muted-foreground">
                    {c.purpose}
                    {c.preferredChannel ? ` · prefiere ${c.preferredChannel}` : ""}
                    {c.hours ? ` · ${c.hours}` : ""}
                  </small>
                </div>
                {canEdit ? (
                  <div className="flex shrink-0 gap-1">
                    <button type="button" aria-label={`Editar ${c.name}`} onClick={() => { setErrors({}); setMessage(null); setEditing({ ...EMPTY, ...Object.fromEntries(Object.entries(c).map(([k, v]) => [k, v ?? ""])) }); }} className={buttonVariants({ variant: "ghost", size: "icon-sm" })}>
                      <Pencil aria-hidden="true" className="size-4" />
                    </button>
                    <button type="button" aria-label={`Eliminar ${c.name}`} disabled={pending} onClick={() => remove(c.id)} className={buttonVariants({ variant: "ghost", size: "icon-sm" })}>
                      <Trash2 aria-hidden="true" className="size-4" />
                    </button>
                  </div>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {c.whatsapp ? (
                  <a href={wa(c.whatsapp)} target="_blank" rel="noreferrer" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                    <MessageCircle aria-hidden="true" className="size-4" />
                    <span className="font-mono">{c.whatsapp}</span>
                  </a>
                ) : null}
                {c.phone ? (
                  <a href={`tel:${c.phone.replace(/\s/g, "")}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                    <Phone aria-hidden="true" className="size-4" />
                    <span className="font-mono">{c.phone}</span>
                  </a>
                ) : null}
                {c.email ? (
                  <a href={`mailto:${c.email}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                    <Mail aria-hidden="true" className="size-4" />
                    <span className="select-all">{c.email}</span>
                  </a>
                ) : null}
              </div>
              {c.notes ? <p className="text-xs text-muted-foreground">{c.notes}</p> : null}
            </li>
          ))}
        </ul>
      )}
      {canEdit ? (
        <div className="border-t border-border px-[18px] py-3">
          <button type="button" onClick={() => { setErrors({}); setMessage(null); setEditing({ ...EMPTY }); }} className={buttonVariants({ variant: "outline", size: "sm" })}>
            <Plus aria-hidden="true" className="size-4" />
            Agregar contacto
          </button>
        </div>
      ) : null}

      <ResponsiveSheet
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        title={editing?.id ? "Editar contacto" : "Nuevo contacto"}
        description="Para qué sirve este contacto y cómo prefiere que lo busquen."
        footer={
          <>
            <button type="button" onClick={() => setEditing(null)} className={buttonVariants({ variant: "outline" })}>
              Cancelar
            </button>
            <button type="button" disabled={pending} onClick={save} className={buttonVariants()}>
              {pending ? "Guardando…" : "Guardar contacto"}
            </button>
          </>
        }
      >
        {editing ? (
          <div className="grid grid-cols-1 gap-4">
            <Field label="Nombre" required error={errors.name}>
              {(c) => <input {...c} autoFocus value={editing.name} onChange={(e) => set("name", e.target.value)} className={inputClasses} />}
            </Field>
            <div>
              <p className="mb-2 text-[13px] font-medium">Para qué sirve</p>
              <ChipRow className="flex-wrap">
                {CONTACT_PURPOSES.map((p) => (
                  <Chip key={p} selected={editing.purpose === p} onClick={() => set("purpose", p)}>
                    {p}
                  </Chip>
                ))}
              </ChipRow>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="WhatsApp">{(c) => <input {...c} inputMode="tel" value={editing.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} placeholder="+57 300 123 4567" className={inputClasses} />}</Field>
              <Field label="Teléfono" error={errors.phone}>{(c) => <input {...c} inputMode="tel" value={editing.phone} onChange={(e) => set("phone", e.target.value)} className={inputClasses} />}</Field>
            </div>
            <Field label="Correo" error={errors.email}>{(c) => <input {...c} type="email" value={editing.email} onChange={(e) => set("email", e.target.value)} className={inputClasses} />}</Field>
            <div>
              <p className="mb-2 text-[13px] font-medium">Canal preferido</p>
              <ChipRow>
                {CONTACT_CHANNELS.map((ch) => (
                  <Chip key={ch} selected={editing.preferredChannel === ch} onClick={() => set("preferredChannel", ch)}>
                    {ch}
                  </Chip>
                ))}
              </ChipRow>
            </div>
            <Field label="Horario de contacto" hint="Ej. Lunes a viernes, 8 a. m. a 5 p. m.">{(c) => <input {...c} value={editing.hours} onChange={(e) => set("hours", e.target.value)} className={inputClasses} />}</Field>
            <Field label="Notas">{(c) => <textarea {...c} value={editing.notes} onChange={(e) => set("notes", e.target.value)} className={textareaClasses} />}</Field>
            {message ? <Alert tone="danger">{message}</Alert> : null}
          </div>
        ) : null}
      </ResponsiveSheet>
    </div>
  );
}
