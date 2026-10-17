import { Check, Sparkles } from "lucide-react";
import { MODULE_LABELS, type ModuleValue } from "@/lib/admin-catalogs";
import { MODULE_ICONS } from "@/lib/onboarding/module-meta";
import { PLANS, type Billing, type PlanKey } from "@/lib/plans/catalog";
import { formatUsdCents } from "@/lib/plans/quote";
import { cn } from "@/lib/utils";

export type PlanInfo = {
  plan: PlanKey;
  billing: Billing;
  monthlyUsdCents: number;
  selectedAt: string | null;
  activeModules: ModuleValue[];
};

const ORDER: PlanKey[] = ["ESSENTIAL", "ELITE", "SIGNATURE"];

/**
 * Plan del negocio (el que se eligió en el onboarding): nombre, precio
 * guardado, ciclo y módulos activos, con los tres planes al lado. El cambio
 * de plan y el cobro llegan cuando se definan los precios finales.
 */
export default function PlanTab({ info }: { info: PlanInfo }) {
  const current = PLANS[info.plan];
  return (
    <div className="grid gap-3.5">
      <section className="relative isolate overflow-hidden rounded-lg bg-black p-[22px] text-[#F7F6F3]">
        <i aria-hidden="true" className="absolute -right-[30px] -top-10 -z-10 h-[260px] w-[150px] -skew-x-[24deg] bg-gradient-to-b from-[rgba(212,175,55,.32)] to-transparent" />
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#A1A1A8]">Tu plan</p>
        <p className="mt-1 font-display text-[28px] font-bold leading-tight">
          Thrive <span className="text-[#D4AF37]">{current.name}</span>
        </p>
        <p className="mt-1 text-[13px] text-[#A1A1A8]">{current.tagline}</p>
        <p className="mt-4 flex items-baseline gap-1.5">
          <span className="font-display text-[34px] font-bold tabular-nums">{formatUsdCents(info.monthlyUsdCents)}</span>
          <span className="text-[13px] text-[#A1A1A8]">USD/mes · {info.billing === "ANNUAL" ? "pago anual" : "pago mensual"}</span>
        </p>
        <p className="mt-3 text-xs text-[#A1A1A8]">Aún no se cobra nada. Muy pronto podrás cambiar de plan y pagarlo desde aquí.</p>
      </section>

      <section className="rounded-lg border border-border bg-surface">
        <h2 className="border-b border-border px-[18px] py-4 font-display text-[15px] font-semibold">Módulos incluidos</h2>
        <ul className="flex flex-wrap gap-1.5 p-[18px]">
          {info.activeModules.map((m) => {
            const Icon = MODULE_ICONS[m];
            return (
              <li key={m} className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-surface-muted px-2.5 py-1 text-[12.5px] font-medium">
                <Icon aria-hidden="true" className="size-3.5 text-accent-text" />
                {MODULE_LABELS[m]}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="grid gap-2.5 sm:grid-cols-3" aria-label="Planes">
        {ORDER.map((key) => {
          const plan = PLANS[key];
          const on = key === info.plan;
          return (
            <div key={key} className={cn("relative rounded-lg border p-4", on ? "border-accent bg-accent-subtle/50" : "border-border bg-surface")}>
              {on ? (
                <span className="absolute -top-2.5 left-3 inline-flex items-center gap-1 rounded-sm bg-primary px-2 py-0.5 text-[10.5px] font-semibold text-primary-foreground">
                  <Sparkles aria-hidden="true" className="size-3" /> Actual
                </span>
              ) : null}
              <p className="font-display text-[15px] font-bold">{plan.name}</p>
              <p className="mt-1 text-[12.5px] text-muted-foreground">{plan.tagline}</p>
              <ul className="mt-3 grid gap-1.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-1.5 text-[12px] text-foreground/80">
                    <Check aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-accent-text" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </section>
    </div>
  );
}
