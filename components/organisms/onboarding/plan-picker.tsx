"use client";

import { Check, Lock, Sparkles } from "lucide-react";
import { SegmentedControl } from "@/components/molecules/segmented-control";
import { MODULE_LABELS, VERTICAL_LABELS, VERTICAL_RECIPES, type ModuleValue, type VerticalValue } from "@/lib/admin-catalogs";
import { MODULE_DESCRIPTIONS, MODULE_ICONS } from "@/lib/onboarding/module-meta";
import { INCLUDED_MODULES, PLANS, type Billing, type PlanKey } from "@/lib/plans/catalog";
import { formatUsdCents, moduleMonthlyCents, modulesForVertical, quotePlan } from "@/lib/plans/quote";
import { cn } from "@/lib/utils";

const PLAN_ORDER: PlanKey[] = ["ESSENTIAL", "ELITE", "SIGNATURE"];

export type PlanSelection = { plan: PlanKey; billing: Billing; selected: ModuleValue[] };

/**
 * Paso "Plan y módulos": los tres planes con su precio en vivo (USD) y los
 * módulos que sirven al rubro (lo ajeno no aparece). Tocar un módulo de pago
 * estando en Essential pasa a Elite con ese módulo; en Signature van todos.
 * Pensado para caber sin desplazamiento en escritorio.
 */
export function PlanPicker({
  vertical,
  value,
  onChange,
}: {
  vertical: VerticalValue;
  value: PlanSelection;
  onChange: (value: PlanSelection) => void;
}) {
  // Orden de lectura: incluidos, luego los de la receta del rubro, luego los generales.
  const recipe = VERTICAL_RECIPES[vertical].modules as readonly ModuleValue[];
  const rank = (m: ModuleValue) => (INCLUDED_MODULES.includes(m) ? 0 : recipe.includes(m) ? 1 : 2);
  const modules = [...modulesForVertical(vertical)].sort((a, b) => rank(a) - rank(b));
  const quoteFor = (plan: PlanKey) => quotePlan({ plan, vertical, billing: value.billing, selected: value.selected });
  const active = quoteFor(value.plan);
  const activeSet = new Set(active.modules);

  const toggleModule = (module: ModuleValue) => {
    if (INCLUDED_MODULES.includes(module) || value.plan === "SIGNATURE") return;
    if (value.plan === "ESSENTIAL") {
      onChange({ ...value, plan: "ELITE", selected: [...new Set([...value.selected, module])] });
      return;
    }
    const on = value.selected.includes(module);
    onChange({ ...value, selected: on ? value.selected.filter((m) => m !== module) : [...value.selected, module] });
  };

  return (
    <div className="grid grid-cols-1 gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl
          ariaLabel="Ciclo de facturación"
          value={value.billing}
          onChange={(billing) => onChange({ ...value, billing })}
          options={[
            { value: "MONTHLY", label: "Mensual" },
            {
              value: "ANNUAL",
              label: (
                <>
                  Anual <span className="rounded-sm bg-success-subtle px-1.5 py-0.5 text-[10.5px] font-bold text-success">−20 %</span>
                </>
              ),
            },
          ]}
        />
        <p className="text-[12.5px] text-muted-foreground">Precios en USD · sin cobro todavía</p>
      </div>

      <div role="radiogroup" aria-label="Plan" className="grid gap-2.5 sm:grid-cols-3">
        {PLAN_ORDER.map((key) => {
          const plan = PLANS[key];
          const quote = quoteFor(key);
          const selected = value.plan === key;
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={selected}
              data-press="card"
              onClick={() => onChange({ ...value, plan: key })}
              className={cn(
                "relative flex flex-col rounded-lg border p-4 text-left transition-[border-color,box-shadow,background-color] duration-300 max-sm:flex-row max-sm:items-center max-sm:gap-3",
                selected
                  ? "border-accent bg-accent-subtle/60 shadow-[0_0_0_3px_rgba(212,175,55,.22)]"
                  : "border-border-input bg-surface hover:border-border-input-hover",
              )}
            >
              {key === "ELITE" ? (
                <span className="absolute -top-2.5 left-3 inline-flex items-center gap-1 rounded-sm bg-ink px-2 py-0.5 text-[10.5px] font-semibold text-white dark:bg-accent dark:text-ink">
                  <Sparkles aria-hidden="true" className="size-3" /> Recomendado
                </span>
              ) : null}
              <span className="flex items-center gap-2 max-sm:order-2 max-sm:flex-1 max-sm:flex-col max-sm:items-start max-sm:gap-0">
                <span className="font-display text-[15px] font-bold">{plan.name}</span>
                <span className="text-[12px] text-muted-foreground sm:hidden">{plan.tagline}</span>
              </span>
              <span className="mt-2 flex items-baseline gap-1 max-sm:order-3 max-sm:mt-0">
                <span className="font-display text-[26px] font-bold leading-none tabular-nums">{formatUsdCents(quote.monthlyCents)}</span>
                <span className="text-[12px] text-muted-foreground">/mes</span>
              </span>
              <span className="mt-1.5 text-[12.5px] leading-5 text-muted-foreground max-sm:hidden">{plan.tagline}</span>
              <ul className="mt-3 grid gap-1.5 max-sm:hidden [@media(max-height:960px)]:hidden">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-1.5 text-[12px] text-foreground/80">
                    <Check aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-accent-text" />
                    {f}
                  </li>
                ))}
              </ul>
              <span
                aria-hidden="true"
                className={cn(
                  "grid size-5 shrink-0 place-items-center rounded-full border transition-colors sm:absolute sm:right-3 sm:top-4 max-sm:order-1",
                  selected ? "border-accent bg-accent text-ink" : "border-border-input",
                )}
              >
                {selected ? <Check className="size-3" strokeWidth={3} /> : null}
              </span>
            </button>
          );
        })}
      </div>

      <section aria-labelledby="plan-modules" className="min-w-0">
        <div className="mb-2.5 flex items-baseline justify-between gap-3">
          <h2 id="plan-modules" className="font-display text-[15px] font-semibold">
            Módulos para {VERTICAL_LABELS[vertical].toLowerCase()}
          </h2>
          <span className="text-[12px] text-muted-foreground">
            {active.modules.length} de {modules.length} activos
          </span>
        </div>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
          {modules.map((module) => {
            const Icon = MODULE_ICONS[module];
            const included = INCLUDED_MODULES.includes(module);
            const on = activeSet.has(module);
            const locked = value.plan === "ESSENTIAL" && !included;
            const fixed = included || value.plan === "SIGNATURE";
            const price = moduleMonthlyCents(module, vertical, value.plan === "ESSENTIAL" ? "ELITE" : value.plan);
            return (
              <li key={module}>
                <button
                  type="button"
                  aria-pressed={on}
                  aria-disabled={fixed || undefined}
                  title={MODULE_DESCRIPTIONS[module]}
                  onClick={() => toggleModule(module)}
                  data-press=""
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-md border px-3 py-2 text-left transition-colors duration-200",
                    on
                      ? "border-border-input-hover bg-surface-muted"
                      : "border-border-input bg-surface hover:border-border-input-hover",
                    fixed && "cursor-default",
                  )}
                >
                  <Icon aria-hidden="true" className={cn("size-4 shrink-0", on ? "text-accent-text" : "text-muted-foreground")} />
                  <span className="grid min-w-0 flex-1 leading-tight">
                    <span className={cn("truncate text-[13px] font-medium", !on && "text-muted-foreground")}>
                      {MODULE_LABELS[module]}
                    </span>
                    {included ? (
                      <span className="text-[11px] font-medium text-success">Incluido</span>
                    ) : locked ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Lock aria-hidden="true" className="size-3" />
                        {formatUsdCents(price)}/mes con Elite
                      </span>
                    ) : (
                      <span className={cn("font-mono text-[11px] tabular-nums", on ? "text-foreground" : "text-muted-foreground")}>
                        +{formatUsdCents(price)}/mes
                      </span>
                    )}
                  </span>
                  <span
                    aria-hidden="true"
                    className={cn(
                      "grid size-4 shrink-0 place-items-center rounded-[4px] border transition-colors",
                      on ? "border-foreground bg-foreground text-background" : "border-border-input",
                    )}
                  >
                    {on ? <Check className="size-3" strokeWidth={3} /> : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-[12.5px] text-muted-foreground">
          {value.plan === "ESSENTIAL"
            ? "Empiezas gratis con lo esencial. Toca un módulo para sumarlo con Elite."
            : value.plan === "SIGNATURE"
              ? "Signature incluye todos los módulos de tu rubro con 40 % de descuento en cada uno."
              : "Activa solo lo que usas; el precio se ajusta al instante."}
        </p>
      </section>
    </div>
  );
}
