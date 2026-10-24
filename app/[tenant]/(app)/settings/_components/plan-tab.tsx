import { Check, Sparkles } from "lucide-react";
import { MODULE_LABELS, type ModuleValue } from "@/lib/admin/catalogs";
import { MODULE_ICONS } from "@/lib/onboarding/module-meta";
import { PLANS, type Billing, type PlanKey } from "@/lib/plans/catalog";
import type { TenantAccess } from "@/lib/benefits/benefits-db";
import { needsAttention, type ConsumptionRow } from "@/lib/usage/consumption";
import { Alert } from "@/components/molecules/alert";

export type PlanInfo = {
  plan: PlanKey;
  billing: Billing;
  monthlyUsdCents: number;
  selectedAt: string | null;
  activeModules: ModuleValue[];
  /** Último acceso (canje): si fue promo o pagado, y hasta cuándo. */
  access?: TenantAccess | null;
  /** Consumo frente a los límites de uso (el plan limita uso, no funciones). */
  usage?: ConsumptionRow[];
};

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Plan del negocio en el piloto: solo se muestra el plan que NEXUS le asignó
 * (sin precios ni comparación de planes, que siguen ocultos hasta que haya
 * cobro automático). El cambio de plan y la vigencia los administra el equipo
 * NEXUS desde el Operations Center.
 */
export default function PlanTab({ info }: { info: PlanInfo }) {
  const current = PLANS[info.plan];
  const access = info.access ?? null;
  const paid = access?.kind === "PAID";
  const accessLabel = access
    ? paid
      ? "Acceso pagado"
      : "Cortesía"
    : "Plan asignado por NEXUS";
  const accessDetail = access
    ? access.expired
      ? `El acceso terminó el ${formatDate(access.endsAt)}.`
      : `Activo hasta el ${formatDate(access.endsAt)}.`
    : "NEXUS administra los planes y la vigencia; escríbenos si quieres cambiarlo.";

  return (
    <div className="grid gap-3.5">
      <section className="relative isolate overflow-hidden rounded-lg bg-black p-[22px] text-[#F7F6F3]">
        <i aria-hidden="true" className="absolute -right-[30px] -top-10 -z-10 h-[260px] w-[150px] -skew-x-[24deg] bg-gradient-to-b from-[rgba(212,175,55,.32)] to-transparent" />
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#A1A1A8]">Tu plan</p>
        <p className="mt-1 font-display text-[28px] font-bold leading-tight">
          Thrive <span className="text-[#D4AF37]">{current.name}</span>
        </p>
        <p className="mt-1 text-[13px] text-[#A1A1A8]">{current.tagline}</p>
        <p className="mt-4 inline-flex items-center gap-1.5 rounded-sm border border-[rgba(212,175,55,.35)] bg-[rgba(212,175,55,.12)] px-2.5 py-1 text-[12px] font-medium text-[#D4AF37]">
          <Sparkles aria-hidden="true" className="size-3.5" /> {accessLabel}
        </p>
        <p className="mt-3 text-xs text-[#A1A1A8]">{accessDetail}</p>
      </section>

      {info.usage?.length ? <UsageSection rows={info.usage} /> : null}

      <section className="rounded-lg border border-border bg-surface">
        <h2 className="border-b border-border px-[18px] py-4 font-display text-[15px] font-semibold">Funciones en uso</h2>
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

      <section className="rounded-lg border border-border bg-surface">
        <h2 className="border-b border-border px-[18px] py-4 font-display text-[15px] font-semibold">
          Qué incluye Thrive {current.name}
        </h2>
        <ul className="grid gap-2 p-[18px] sm:grid-cols-2">
          {current.features.map((feature) => (
            <li key={feature} className="flex gap-1.5 text-[12.5px] text-foreground/80">
              <Check aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-accent-text" />
              {feature}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

const nf = new Intl.NumberFormat("es-CO");
const STATE_TEXT = { ok: "", near: "Cerca del límite", over: "Límite alcanzado", unlimited: "Sin límite acordado" } as const;
const BAR = { ok: "bg-accent", near: "bg-warning-foreground", over: "bg-danger", unlimited: "bg-border" } as const;

/** Consumo del negocio frente a sus límites: barra por cada uno y aviso cuando se acercan. */
function UsageSection({ rows }: { rows: ConsumptionRow[] }) {
  const attention = needsAttention(rows);
  return (
    <section aria-labelledby="plan-usage" className="rounded-lg border border-border bg-surface">
      <div className="border-b border-border px-[18px] py-4">
        <h2 id="plan-usage" className="font-display text-[15px] font-semibold">Consumo</h2>
        <p className="mt-0.5 text-[13px] text-muted-foreground">Tu plan limita cuánto usas, no qué funciones tienes: todas están disponibles.</p>
      </div>
      <div className="grid gap-3 p-[18px]">
        {attention.length ? (
          <Alert tone={attention.some((r) => r.status === "over") ? "danger" : "warning"}>
            {attention.map((r) => `${r.label}: ${STATE_TEXT[r.status].toLowerCase()}`).join(" · ")}. Escríbenos para ampliar tu límite.
          </Alert>
        ) : null}
        <ul className="grid gap-4">
          {rows.map((r) => (
            <li key={r.key} className="grid gap-1.5">
              <div className="flex flex-wrap items-baseline justify-between gap-2 text-[13px]">
                <span className="font-medium">{r.label}{r.period ? <span className="font-normal text-muted-foreground"> · este mes</span> : null}</span>
                <span className="font-mono tabular-nums text-muted-foreground">
                  {nf.format(r.used)}
                  {r.limit === null ? "" : ` de ${nf.format(r.limit)}`}
                  {STATE_TEXT[r.status] ? ` · ${STATE_TEXT[r.status]}` : ""}
                </span>
              </div>
              {r.limit === null ? null : (
                <div role="progressbar" aria-label={`${r.label}: ${r.pct} % del límite`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={r.pct} className="h-1.5 overflow-hidden rounded-full bg-surface-muted">
                  <div className={`h-full ${BAR[r.status]}`} style={{ width: `${r.pct}%` }} />
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
