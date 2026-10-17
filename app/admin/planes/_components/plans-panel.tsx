"use client";

import { useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { buttonVariants } from "@/components/atoms/button-variants";
import { inputClasses, textareaClasses } from "@/components/atoms/input";
import { Switch } from "@/components/atoms/switch";
import { Field } from "@/components/molecules/field";
import { UsdInput } from "@/components/molecules/usd-input";
import type { PlanConfig } from "@/lib/plans/pricing";
import { cn } from "@/lib/utils";
import { savePlanAction } from "../actions";
import { useSave } from "./use-save";

function PlanCard({ plan, canPrice, canStructure }: { plan: PlanConfig; canPrice: boolean; canStructure: boolean }) {
  const [p, setP] = useState(plan);
  const [features, setFeatures] = useState(plan.features.join("\n"));
  const { save, pending } = useSave();
  const dirty = JSON.stringify({ ...p, features: features.split("\n").map((f) => f.trim()).filter(Boolean) }) !== JSON.stringify(plan);
  const set = <K extends keyof PlanConfig>(k: K, v: PlanConfig[K]) => setP({ ...p, [k]: v });
  const id = (k: string) => `${plan.key}-${k}`;

  return (
    <section className={cn("grid gap-4 rounded-lg border bg-surface p-[18px]", p.recommended ? "border-accent shadow-[0_0_0_3px_var(--color-accent-subtle)]" : "border-border")}>
      <header className="flex items-center gap-2">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-text">{plan.key}</span>
        {p.recommended ? (
          <span className="inline-flex items-center gap-1 rounded-sm bg-primary px-2 py-0.5 text-[10.5px] font-semibold text-primary-foreground">
            <Sparkles aria-hidden="true" className="size-3" /> Recomendado
          </span>
        ) : null}
        {!p.active ? <span className="text-xs text-danger">Oculto en el registro</span> : null}
      </header>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Nombre">{(c) => <input {...c} disabled={!canStructure} value={p.name} onChange={(e) => set("name", e.target.value)} className={inputClasses} />}</Field>
        <Field label="Precio base mensual" hint="Antes del factor del rubro.">
          {(c) => <UsdInput id={c.id} value={p.basePriceUsdCents} disabled={!canPrice} onChange={(v) => set("basePriceUsdCents", v)} />}
        </Field>
      </div>
      <Field label="Descripción corta">{(c) => <input {...c} disabled={!canStructure} value={p.tagline} onChange={(e) => set("tagline", e.target.value)} className={inputClasses} />}</Field>
      <Field label="Características" hint="Una por línea; se muestran en el registro.">
        {(c) => <textarea {...c} disabled={!canStructure} rows={3} value={features} onChange={(e) => setFeatures(e.target.value)} className={textareaClasses} />}
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Descuento en módulos" hint="% sobre cada módulo">
          {(c) => <input {...c} type="number" min={0} max={100} disabled={!canPrice} value={p.moduleDiscountPct} onChange={(e) => set("moduleDiscountPct", Number(e.target.value))} className={cn(inputClasses, "font-mono")} />}
        </Field>
        <Field label="Descuento anual" hint="% por pagar el año">
          {(c) => <input {...c} type="number" min={0} max={100} disabled={!canPrice} value={p.annualDiscountPct} onChange={(e) => set("annualDiscountPct", Number(e.target.value))} className={cn(inputClasses, "font-mono")} />}
        </Field>
      </div>
      <div className="grid gap-2.5 rounded-md bg-surface-muted p-3">
        {(
          [
            ["chargesModules", "Permite sumar módulos de pago", "Elite: el cliente elige qué módulos paga."],
            ["includesAllModules", "Incluye todos los módulos del rubro", "Signature: activa todo lo que el rubro ofrece."],
            ["recommended", "Marcar como recomendado", "Se destaca en el registro."],
            ["active", "Visible en el registro", "Si se oculta, nadie nuevo puede elegirlo."],
          ] as const
        ).map(([k, label, hint]) => (
          <label key={k} htmlFor={id(k)} className="flex items-center justify-between gap-3">
            <span>
              <b className="block text-[13.5px] font-medium">{label}</b>
              <small className="text-xs text-muted-foreground">{hint}</small>
            </span>
            <Switch id={id(k)} checked={p[k]} disabled={!canStructure} onCheckedChange={(v) => set(k, v)} />
          </label>
        ))}
      </div>
      <button
        type="button"
        disabled={!dirty || pending}
        onClick={() => save(() => savePlanAction({ ...p, features: features.split("\n").map((f) => f.trim()).filter(Boolean) }), `Plan ${p.name} guardado`)}
        className={buttonVariants({ className: "justify-self-start" })}
      >
        <Check aria-hidden="true" className="size-4" />
        {pending ? "Guardando…" : "Guardar plan"}
      </button>
    </section>
  );
}

/** Los tres planes de NEXUS THRIVE, editables (precios con pricing.edit; textos y reglas con catalog.edit). */
export default function PlansPanel({ plans, canPrice, canStructure }: { plans: PlanConfig[]; canPrice: boolean; canStructure: boolean }) {
  return (
    <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-3">
      {plans.map((p) => (
        <PlanCard key={`${p.key}-${p.basePriceUsdCents}-${p.name}`} plan={p} canPrice={canPrice} canStructure={canStructure} />
      ))}
    </div>
  );
}
