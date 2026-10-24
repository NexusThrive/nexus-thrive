"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { buttonVariants } from "@/components/atoms/button-variants";
import { inputClasses, textareaClasses } from "@/components/atoms/input";
import { Field } from "@/components/molecules/field";
import { useToast } from "@/components/molecules/toast";
import { UsdInput } from "@/components/molecules/usd-input";
import { ResponsiveSheet } from "@/components/organisms/responsive-sheet";
import { VERTICALS, VERTICAL_LABELS } from "@/lib/admin/catalogs";
import { isActiveStage, LEAD_SOURCES, LEAD_STAGES, LOST_REASONS, type LeadInput, type LeadStageValue } from "@/lib/ops/crm-rules";
import type { LeadRow } from "@/lib/ops/leads";
import { saveLeadAction } from "../actions";
import { Select } from "@/components/atoms/select";

export type Option = { id: string; name: string };

const EMPTY = (ownerId: string, today: string): LeadInput => ({
  company: "",
  contactName: "",
  phone: "",
  email: "",
  vertical: "",
  city: "",
  source: "Referido",
  stage: "NEW",
  ownerId,
  nextStep: "Primer contacto",
  nextStepDate: today,
  valueUsdCents: 0,
  plan: "",
  notes: "",
  lostReason: null,
  tenantId: null,
});

/**
 * Crear o editar un lead. Mientras esté activo pide responsable y próximo
 * paso con fecha; al perderse pide el motivo; al ganarse, el negocio.
 */
export default function LeadSheet({
  lead,
  open,
  onOpenChange,
  owners,
  tenants,
  me,
  today,
  canAssign,
}: {
  lead: LeadRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  owners: Option[];
  tenants: Option[];
  me: string;
  today: string;
  canAssign: boolean;
}) {
  const [v, setV] = useState<LeadInput>(() => (lead ? { ...lead } : EMPTY(me, today)));
  const [errors, setErrors] = useState<Partial<Record<keyof LeadInput, string>>>({});
  const [pending, start] = useTransition();
  const router = useRouter();
  const { toast } = useToast();
  const set = <K extends keyof LeadInput>(k: K, val: LeadInput[K]) => setV((p) => ({ ...p, [k]: val }));
  const active = isActiveStage(v.stage);

  const submit = () =>
    start(async () => {
      const r = await saveLeadAction(lead?.id ?? null, v);
      if (r.ok) {
        toast(lead ? "Lead actualizado" : "Lead creado", "success");
        onOpenChange(false);
        if (lead) router.refresh();
        else router.push(`/admin/crm/${r.id}`);
      } else {
        setErrors(r.errors ?? {});
        toast({ title: "No se guardó", description: r.message, variant: "error" });
      }
    });

  return (
    <ResponsiveSheet
      drawer
      size="lg"
      open={open}
      onOpenChange={onOpenChange}
      title={lead ? `Editar · ${lead.company}` : "Nuevo lead"}
      description="Ningún lead activo queda sin responsable ni próximo paso."
      footer={
        <>
          <button type="button" onClick={() => onOpenChange(false)} className={buttonVariants({ variant: "outline" })}>
            Cancelar
          </button>
          <button type="button" disabled={pending} onClick={submit} className={buttonVariants()}>
            {pending ? "Guardando…" : lead ? "Guardar cambios" : "Crear lead"}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Negocio o prospecto" required error={errors.company}>
          {(c) => <input {...c} value={v.company} onChange={(e) => set("company", e.target.value)} className={inputClasses} placeholder="Gimnasio Andes" />}
        </Field>
        <Field label="Persona de contacto">{(c) => <input {...c} value={v.contactName ?? ""} onChange={(e) => set("contactName", e.target.value)} className={inputClasses} />}</Field>
        <Field label="Teléfono / WhatsApp" error={errors.phone}>
          {(c) => <input {...c} inputMode="tel" value={v.phone ?? ""} onChange={(e) => set("phone", e.target.value)} className={inputClasses} />}
        </Field>
        <Field label="Correo" error={errors.email}>
          {(c) => <input {...c} type="email" value={v.email ?? ""} onChange={(e) => set("email", e.target.value)} className={inputClasses} />}
        </Field>
        <Field label="Rubro">
          {(c) => (
            <Select {...c} value={v.vertical ?? ""} onChange={(e) => set("vertical", e.target.value)}>
              <option value="">Sin definir</option>
              {VERTICALS.map((x) => (
                <option key={x} value={x}>
                  {VERTICAL_LABELS[x]}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Ciudad">{(c) => <input {...c} value={v.city ?? ""} onChange={(e) => set("city", e.target.value)} className={inputClasses} />}</Field>
        <Field label="Origen" error={errors.source}>
          {(c) => (
            <Select {...c} value={v.source} onChange={(e) => set("source", e.target.value)}>
              {LEAD_SOURCES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Valor mensual estimado" hint="Lo que pagaría al mes.">
          {(c) => <UsdInput id={c.id} value={v.valueUsdCents ?? 0} onChange={(x) => set("valueUsdCents", x)} />}
        </Field>
        <Field label="Etapa" error={errors.stage}>
          {(c) => (
            <Select {...c} value={v.stage} onChange={(e) => set("stage", e.target.value as LeadStageValue)}>
              {LEAD_STAGES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Responsable" required={active} error={errors.ownerId} hint={canAssign ? undefined : "Solo puedes asignarte a ti."}>
          {(c) => (
            <Select {...c} value={v.ownerId ?? ""} onChange={(e) => set("ownerId", e.target.value || null)}>
              <option value="">Sin responsable</option>
              {owners
                .filter((o) => canAssign || o.id === me || o.id === lead?.ownerId)
                .map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                    {o.id === me ? " (tú)" : ""}
                  </option>
                ))}
            </Select>
          )}
        </Field>
        {active ? (
          <>
            <Field label="Próximo paso" required error={errors.nextStep}>
              {(c) => <input {...c} value={v.nextStep ?? ""} onChange={(e) => set("nextStep", e.target.value)} className={inputClasses} placeholder="Enviar propuesta" />}
            </Field>
            <Field label="Fecha del próximo paso" required error={errors.nextStepDate}>
              {(c) => <input {...c} type="date" value={v.nextStepDate ?? ""} onChange={(e) => set("nextStepDate", e.target.value)} className={inputClasses} />}
            </Field>
          </>
        ) : null}
        {v.stage === "LOST" ? (
          <Field label="Motivo" required error={errors.lostReason}>
            {(c) => (
              <Select {...c} value={v.lostReason ?? ""} onChange={(e) => set("lostReason", e.target.value || null)}>
                <option value="">Elige un motivo</option>
                {LOST_REASONS.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </Select>
            )}
          </Field>
        ) : null}
        {v.stage === "WON" ? (
          <Field label="Negocio en NEXUS" hint="Vincula la cuenta que creó al registrarse.">
            {(c) => (
              <Select {...c} value={v.tenantId ?? ""} onChange={(e) => set("tenantId", e.target.value || null)}>
                <option value="">Aún sin negocio</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        ) : null}
        <Field label="Notas" className="sm:col-span-2">
          {(c) => <textarea {...c} rows={3} value={v.notes ?? ""} onChange={(e) => set("notes", e.target.value)} className={textareaClasses} />}
        </Field>
      </div>
    </ResponsiveSheet>
  );
}
