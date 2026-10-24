"use client";

import { Check, Lock, Sparkles, Users } from "lucide-react";
import { SegmentedControl } from "@/components/molecules/segmented-control";
import type { ModuleValue, VerticalValue } from "@/lib/admin/catalogs";
import { MODULE_ICONS } from "@/lib/onboarding/module-meta";
import type { Billing, PlanKey } from "@/lib/plans/catalog";
import { activePlans, modulePriceCents, offeredModules, quote, verticalOf, type PricingConfig, formatUsdCents } from "@/lib/plans/pricing";
import { cn } from "@/lib/utils";

export type PlanSelection = { plan: PlanKey; billing: Billing; selected: ModuleValue[]; tierId: string | null };

/**
 * Paso "Plan y módulos" del onboarding, con el catálogo que se configura en
 * el Operations Center: planes activos con su precio en vivo (USD), los
 * módulos que se ofrecen al rubro (lo planeado o ajeno no aparece), el
 * tramo de clientes y el ciclo de pago. Tocar un módulo de pago estando en
 * un plan sin módulos pasa al plan que sí los permite.
 */
export function PlanPicker({
  config,
  vertical,
  value,
  onChange,
}: {
  config: PricingConfig;
  vertical: VerticalValue;
  value: PlanSelection;
  onChange: (value: PlanSelection) => void;
}) {
  const plans = activePlans(config);
  const modules = offeredModules(config, vertical);
  // Orden lógico por cantidad de clientes (y el `order` como desempate).
  const tiers = [...config.tiers].sort((a, b) => {
    const am = a.maxCustomers ?? Number.POSITIVE_INFINITY;
    const bm = b.maxCustomers ?? Number.POSITIVE_INFINITY;
    return am - bm || a.order - b.order;
  });
  const tierId = value.tierId ?? tiers[0]?.id ?? null;
  const current = plans.find((p) => p.key === value.plan) ?? plans[0];
  const q = (plan: PlanKey) => quote(config, { plan, vertical, billing: value.billing, selected: value.selected, tierId });
  const active = q(current?.key ?? value.plan);
  const activeSet = new Set(active.modules);
  const upgrade = plans.find((p) => p.chargesModules && !p.includesAllModules);
  const recommended = verticalOf(config, vertical)?.recommended ?? [];
  const anyAnnual = plans.some((p) => p.annualDiscountPct > 0);
  const annualPct = Math.max(0, ...plans.map((p) => p.annualDiscountPct));

  const pickPlan = (key: PlanKey) => {
    const p = plans.find((x) => x.key === key);
    const selected = p?.chargesModules && !p.includesAllModules && value.selected.length === 0 ? [...recommended] : value.selected;
    onChange({ ...value, plan: key, selected, tierId });
  };

  const toggleModule = (module: ModuleValue, included: boolean) => {
    if (included || current?.includesAllModules) return;
    if (!current?.chargesModules) {
      if (upgrade) onChange({ ...value, plan: upgrade.key, selected: [...new Set([...value.selected, module])], tierId });
      return;
    }
    const on = value.selected.includes(module);
    onChange({ ...value, tierId, selected: on ? value.selected.filter((m) => m !== module) : [...value.selected, module] });
  };

  return (
    <div className="grid grid-cols-1 gap-5">
      {tiers.length > 1 ? (
        <section aria-labelledby="tier-title">
          <h2 id="tier-title" className="mb-2.5 flex items-center gap-2 font-display text-[15px] font-semibold">
            <Users aria-hidden="true" className="size-4 text-accent-text" /> ¿Cuántos clientes atiendes?
          </h2>
          <div role="radiogroup" aria-label="Cantidad de clientes" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {tiers.map((t) => {
              const selected = t.id === tierId;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  data-press="card"
                  onClick={() => onChange({ ...value, tierId: t.id })}
                  className={cn(
                    "flex flex-col items-center justify-center gap-0.5 rounded-md border px-3 py-2.5 text-center transition-[border-color,background-color,box-shadow] duration-200",
                    selected
                      ? "border-accent bg-accent-subtle/60 shadow-[0_0_0_3px_rgba(212,175,55,.18)]"
                      : "border-border-input bg-surface hover:border-border-input-hover",
                  )}
                >
                  <span className="text-[12.5px] font-medium leading-tight">{t.label}</span>
                  <span className={cn("font-mono text-[11px] tabular-nums", t.priceUsdCents > 0 ? "text-muted-foreground" : "text-success")}>
                    {t.priceUsdCents > 0 ? `+${formatUsdCents(t.priceUsdCents)}/mes` : "Sin costo"}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      <div className="grid gap-3">
        <SegmentedControl
          block
          ariaLabel="Ciclo de facturación"
          value={value.billing}
          onChange={(billing) => onChange({ ...value, billing, tierId })}
          options={[
            { value: "MONTHLY", label: "Mensual" },
            {
              value: "ANNUAL",
              label: anyAnnual ? (
                <>
                  Anual <span className="rounded-sm bg-success-subtle px-1.5 py-0.5 text-[10.5px] font-bold text-success">−{annualPct} %</span>
                </>
              ) : (
                "Anual"
              ),
            },
          ]}
        />
        <p className="text-[12.5px] text-muted-foreground">Precios en USD · sin cobro todavía</p>
      </div>

      <div role="radiogroup" aria-label="Plan" className={cn("grid gap-2.5", plans.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
        {plans.map((plan) => {
          const selected = current?.key === plan.key;
          const price = q(plan.key).monthlyCents;
          return (
            <button
              key={plan.key}
              type="button"
              role="radio"
              aria-checked={selected}
              data-press="card"
              onClick={() => pickPlan(plan.key)}
              className={cn(
                "relative flex flex-col rounded-lg border p-4 text-left transition-[border-color,box-shadow,background-color] duration-300 max-sm:flex-row max-sm:items-center max-sm:gap-3",
                selected ? "border-accent bg-accent-subtle/60 shadow-[0_0_0_3px_rgba(212,175,55,.22)]" : "border-border-input bg-surface hover:border-border-input-hover",
              )}
            >
              {plan.recommended ? (
                <span className="absolute -top-2.5 left-3 inline-flex items-center gap-1 rounded-sm bg-ink px-2 py-0.5 text-[10.5px] font-semibold text-white dark:bg-accent dark:text-ink">
                  <Sparkles aria-hidden="true" className="size-3" /> Recomendado
                </span>
              ) : null}
              <span className="flex items-center gap-2 max-sm:order-2 max-sm:flex-1 max-sm:flex-col max-sm:items-start max-sm:gap-0">
                <span className="font-display text-[15px] font-bold">{plan.name}</span>
                <span className="text-[12px] text-muted-foreground sm:hidden">{plan.tagline}</span>
              </span>
              <span className="mt-2 flex items-baseline gap-1 max-sm:order-3 max-sm:mt-0">
                <span className="font-display text-[26px] font-bold leading-none tabular-nums">{formatUsdCents(price)}</span>
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
            Módulos para {verticalOf(config, vertical)?.label.toLowerCase() ?? "tu negocio"}
          </h2>
          <span className="text-[12px] text-muted-foreground">
            {active.modules.filter((m) => m !== "dashboard").length} de {modules.length} activos
          </span>
        </div>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
          {modules.map((m) => {
            const Icon = MODULE_ICONS[m.module];
            const on = activeSet.has(m.module);
            const locked = !current?.chargesModules && !current?.includesAllModules && !m.included;
            const fixed = m.included || !!current?.includesAllModules;
            const price = modulePriceCents(config, m.module, vertical, current?.chargesModules || current?.includesAllModules ? current.key : (upgrade?.key ?? current?.key ?? value.plan));
            return (
              <li key={m.module}>
                <button
                  type="button"
                  aria-pressed={on}
                  aria-disabled={fixed || undefined}
                  title={m.description}
                  onClick={() => toggleModule(m.module, m.included)}
                  data-press=""
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-md border px-3 py-2 text-left transition-colors duration-200",
                    on ? "border-border-input-hover bg-surface-muted" : "border-border-input bg-surface hover:border-border-input-hover",
                    fixed && "cursor-default",
                  )}
                >
                  <Icon aria-hidden="true" className={cn("size-4 shrink-0", on ? "text-accent-text" : "text-muted-foreground")} />
                  <span className="grid min-w-0 flex-1 leading-tight">
                    <span className={cn("truncate text-[13px] font-medium", !on && "text-muted-foreground")}>
                      {m.label}
                      {m.status === "BETA" ? <span className="ml-1 font-mono text-[10px] text-accent-text">beta</span> : null}
                    </span>
                    {m.included || price === 0 ? (
                      <span className="text-[11px] font-medium text-success">Incluido</span>
                    ) : locked ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Lock aria-hidden="true" className="size-3" />
                        {formatUsdCents(price)}/mes con {upgrade?.name ?? "un plan de pago"}
                      </span>
                    ) : (
                      <span className={cn("font-mono text-[11px] tabular-nums", on ? "text-foreground" : "text-muted-foreground")}>+{formatUsdCents(price)}/mes</span>
                    )}
                  </span>
                  <span
                    aria-hidden="true"
                    className={cn("grid size-4 shrink-0 place-items-center rounded-[4px] border transition-colors", on ? "border-foreground bg-foreground text-background" : "border-border-input")}
                  >
                    {on ? <Check className="size-3" strokeWidth={3} /> : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-[12.5px] text-muted-foreground">
          {!current?.chargesModules && !current?.includesAllModules
            ? `Empiezas con lo esencial. Toca un módulo para sumarlo con ${upgrade?.name ?? "un plan de pago"}.`
            : current?.includesAllModules
              ? `${current.name} incluye todos los módulos de tu rubro${current.moduleDiscountPct ? ` con ${current.moduleDiscountPct} % de descuento en cada uno` : ""}.`
              : "Activa solo lo que usas; el precio se ajusta al instante."}
        </p>
      </section>
    </div>
  );
}
