"use client";

import { Check } from "lucide-react";
import { CHANNELS, CONTROLS, OFFERS, TOOLS, type OperationAnswers } from "@/lib/core/tenancy/onboarding/operation";
import { cn } from "@/lib/utils";

type Option<T extends string> = { value: T; label: string; hint?: string };

/** Un grupo de opciones que se pueden marcar varias a la vez (botones con estado, no casillas escondidas). */
function Group<T extends string>({ legend, hint, options, value, onChange }: { legend: string; hint?: string; options: readonly Option<T>[]; value: readonly T[]; onChange: (next: T[]) => void }) {
  const toggle = (v: T) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  return (
    <fieldset className="min-w-0">
      <legend className="text-ui font-medium">{legend}</legend>
      {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {options.map((o) => {
          const on = value.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={on}
              data-press=""
              onClick={() => toggle(o.value)}
              className={cn(
                "flex items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-[border-color,background-color,box-shadow] duration-200 pointer-coarse:min-h-11",
                on ? "border-accent bg-accent-subtle/60 shadow-[0_0_0_3px_rgba(212,175,55,.18)]" : "border-border/60 bg-card hover:border-accent/50",
              )}
            >
              <span aria-hidden="true" className={cn("mt-0.5 grid size-[18px] shrink-0 place-items-center rounded-full border", on ? "border-accent bg-accent text-ink" : "border-border-input")}>{on ? <Check className="size-3" strokeWidth={3} /> : null}</span>
              <span className="min-w-0">
                <span className="block text-ui font-medium leading-tight">{o.label}</span>
                {o.hint ? <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">{o.hint}</span> : null}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/**
 * Paso «Tu operación»: qué vende, cómo vende, qué controla y qué usa hoy. Todo es opcional; lo que marque prepara las capacidades
 * del primer día. Quien está funcionando también cuenta qué herramientas usa (para saber si necesita migrar).
 */
export default function OperationStep({ value, onChange, running }: { value: OperationAnswers; onChange: (next: OperationAnswers) => void; running: boolean }) {
  return (
    <div className="grid gap-6">
      <Group legend="¿Qué vendes o qué ofreces?" options={OFFERS} value={value.offers} onChange={(offers) => onChange({ ...value, offers })} />
      <Group legend="¿Cómo vendes?" hint="Marca todo lo que aplique." options={CHANNELS} value={value.channels} onChange={(channels) => onChange({ ...value, channels })} />
      <Group legend="¿Qué quieres controlar?" options={CONTROLS} value={value.controls} onChange={(controls) => onChange({ ...value, controls })} />
      <Group legend={running ? "¿Qué usas hoy para administrarlo?" : "¿Qué usarías hoy para administrarlo?"} hint={running ? "Nos dice si necesitas traer información de otro lado." : undefined} options={TOOLS} value={value.tools} onChange={(tools) => onChange({ ...value, tools })} />
    </div>
  );
}
