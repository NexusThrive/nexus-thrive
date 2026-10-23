"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { buttonVariants } from "@/components/atoms/button-variants";
import { inputClasses, selectClasses, textareaClasses } from "@/components/atoms/input";
import { Field } from "@/components/molecules/field";
import { useToast } from "@/components/molecules/toast";
import { ResponsiveSheet } from "@/components/organisms/responsive-sheet";
import { TICKET_CATEGORIES, TICKET_CHANNELS, TICKET_PRIORITIES, type TicketInput } from "@/lib/ops/support-rules";
import { createTicketAction } from "../actions";

export type Option = { id: string; name: string };

/** Abrir un ticket a nombre de un negocio (lo que llegó por WhatsApp, correo o llamada). */
export default function TicketSheet({ open, onOpenChange, tenants, staff, me, defaultTenantId }: { open: boolean; onOpenChange: (o: boolean) => void; tenants: Option[]; staff: Option[]; me: string; defaultTenantId?: string }) {
  const [v, setV] = useState<TicketInput>({ tenantId: defaultTenantId ?? "", subject: "", description: "", category: TICKET_CATEGORIES[0], priority: "NORMAL", channel: "WhatsApp", requesterName: "", requesterContact: "", assigneeId: me });
  const [errors, setErrors] = useState<Partial<Record<keyof TicketInput, string>>>({});
  const [pending, start] = useTransition();
  const router = useRouter();
  const { toast } = useToast();
  const set = <K extends keyof TicketInput>(k: K, val: TicketInput[K]) => setV((p) => ({ ...p, [k]: val }));

  const submit = () =>
    start(async () => {
      const r = await createTicketAction(v);
      if (r.ok) {
        toast(`Ticket ${r.code} creado`, "success");
        onOpenChange(false);
        router.push(`/admin/soporte/${r.id}`);
      } else {
        setErrors(r.errors ?? {});
        toast({ title: "No se creó", description: r.message, variant: "error" });
      }
    });

  return (
    <ResponsiveSheet
      drawer
      size="lg"
      open={open}
      onOpenChange={onOpenChange}
      title="Nuevo ticket"
      description="Registra el caso con su prioridad: el SLA empieza a correr desde ahora."
      footer={
        <>
          <button type="button" onClick={() => onOpenChange(false)} className={buttonVariants({ variant: "outline" })}>
            Cancelar
          </button>
          <button type="button" disabled={pending} onClick={submit} className={buttonVariants()}>
            {pending ? "Creando…" : "Crear ticket"}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Negocio" className="sm:col-span-2">
          {(c) => (
            <select {...c} value={v.tenantId ?? ""} onChange={(e) => set("tenantId", e.target.value)} className={selectClasses}>
              <option value="">Sin negocio (prospecto o interno)</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Asunto" required error={errors.subject} className="sm:col-span-2">
          {(c) => <input {...c} value={v.subject} onChange={(e) => set("subject", e.target.value)} className={inputClasses} placeholder="No puede registrar cobros" />}
        </Field>
        <Field label="Qué pasa" required error={errors.description} className="sm:col-span-2">
          {(c) => <textarea {...c} rows={4} value={v.description} onChange={(e) => set("description", e.target.value)} className={textareaClasses} placeholder="Pasos, pantallas y desde cuándo ocurre." />}
        </Field>
        <Field label="Categoría" error={errors.category}>
          {(c) => (
            <select {...c} value={v.category} onChange={(e) => set("category", e.target.value)} className={selectClasses}>
              {TICKET_CATEGORIES.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Prioridad" error={errors.priority}>
          {(c) => (
            <select {...c} value={v.priority} onChange={(e) => set("priority", e.target.value)} className={selectClasses}>
              {TICKET_PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label} · responder en {p.firstResponseHours} h
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Canal" error={errors.channel}>
          {(c) => (
            <select {...c} value={v.channel} onChange={(e) => set("channel", e.target.value)} className={selectClasses}>
              {TICKET_CHANNELS.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Responsable">
          {(c) => (
            <select {...c} value={v.assigneeId ?? ""} onChange={(e) => set("assigneeId", e.target.value)} className={selectClasses}>
              <option value="">Sin asignar</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.id === me ? " (tú)" : ""}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Quién reporta">{(c) => <input {...c} value={v.requesterName ?? ""} onChange={(e) => set("requesterName", e.target.value)} className={inputClasses} />}</Field>
        <Field label="Su contacto">{(c) => <input {...c} value={v.requesterContact ?? ""} onChange={(e) => set("requesterContact", e.target.value)} className={inputClasses} placeholder="Teléfono o correo" />}</Field>
      </div>
    </ResponsiveSheet>
  );
}
