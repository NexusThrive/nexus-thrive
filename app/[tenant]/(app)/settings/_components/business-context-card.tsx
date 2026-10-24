"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { buttonVariants } from "@/components/atoms/button-variants";
import { inputClasses } from "@/components/atoms/input";
import { Select } from "@/components/atoms/select";
import { Field } from "@/components/molecules/field";
import { useToast } from "@/components/molecules/toast";
import { VERTICAL_LABELS, VERTICALS, type VerticalValue } from "@/lib/admin/catalogs";
import { BUSINESS_MODELS, MAX_ACTIVITY, type BusinessModel } from "@/lib/tenant/business-context";
import { updateBusinessContextAction } from "@/app/[tenant]/(app)/settings/context-actions";

/**
 * Perfil del negocio: contexto para el vocabulario y las sugerencias. No
 * restringe nada: cualquier función se puede encender sea cual sea el perfil.
 */
export default function BusinessContextCard({ slug, canManage, initial }: { slug: string; canManage: boolean; initial: { vertical: VerticalValue; businessModels: BusinessModel[]; activity: string } }) {
  const [vertical, setVertical] = useState<VerticalValue>(initial.vertical);
  const [models, setModels] = useState<BusinessModel[]>(initial.businessModels);
  const [activity, setActivity] = useState(initial.activity);
  const [pending, start] = useTransition();
  const router = useRouter();
  const { toast } = useToast();
  const toggle = (m: BusinessModel) => setModels((cur) => (cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m]));

  const save = () =>
    start(async () => {
      const r = await updateBusinessContextAction(slug, { vertical, businessModels: models, activity });
      if (r.ok) {
        toast(r.message, "success");
        router.refresh();
      } else toast({ title: "No se guardó", description: r.message, variant: "error" });
    });

  return (
    <section aria-labelledby="context-title" className="rounded-lg border border-border bg-card p-6">
      <h3 id="context-title" className="font-display text-[15px] font-semibold text-foreground">
        Cómo es tu negocio
      </h3>
      <p className="mt-0.5 text-sm text-muted-foreground">Sirve para ponerle nombre a las cosas y sugerirte funciones. No limita nada: puedes usar cualquier función, sea cual sea tu perfil.</p>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Field label="Perfil de partida" hint="Define el vocabulario (Socios, Pacientes, Obras…) y qué funciones te sugerimos. «General / Otro» sirve para agencias, consultoras, empresas B2B o negocios mixtos.">
          {(c) => (
            <Select {...c} value={vertical} disabled={!canManage || pending} onChange={(e) => setVertical(e.target.value as VerticalValue)}>
              {VERTICALS.map((v) => (
                <option key={v} value={v}>
                  {VERTICAL_LABELS[v]}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Qué hace tu negocio" optional hint={`En tus palabras, hasta ${MAX_ACTIVITY} caracteres.`}>
          {(c) => <input {...c} value={activity} maxLength={MAX_ACTIVITY} disabled={!canManage || pending} onChange={(e) => setActivity(e.target.value)} className={inputClasses} placeholder="Agencia de marketing para pymes" />}
        </Field>
      </div>

      <fieldset className="mt-4" disabled={!canManage || pending}>
        <legend className="text-[13px] font-medium">A quién le vendes <span className="font-normal text-muted-foreground">(puedes elegir varios)</span></legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {BUSINESS_MODELS.map((m) => (
            <label key={m.value} className="flex cursor-pointer items-center gap-2 rounded-md border border-border-input bg-surface px-3 py-2 text-[13px] has-[:checked]:border-foreground has-[:checked]:bg-surface-muted has-[:disabled]:cursor-not-allowed">
              <input type="checkbox" checked={models.includes(m.value)} onChange={() => toggle(m.value)} className="size-4 accent-[var(--foreground)]" />
              <span>
                {m.label}
                <span className="block text-xs text-muted-foreground">{m.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {canManage ? (
        <div className="mt-5">
          <button type="button" disabled={pending} onClick={save} className={buttonVariants()}>
            {pending ? "Guardando…" : "Guardar perfil"}
          </button>
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">Solo el dueño del negocio cambia el perfil.</p>
      )}
    </section>
  );
}
