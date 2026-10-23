"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { CalendarPlus, Pencil, Plus } from "lucide-react";
import { Badge } from "@/components/atoms/badge";
import { buttonVariants } from "@/components/atoms/button-variants";
import { Chip, ChipRow } from "@/components/atoms/chip";
import { inputClasses } from "@/components/atoms/input";
import { EmptyState } from "@/components/molecules/empty-state";
import { KpiCard } from "@/components/molecules/kpi-card";
import { SegmentedControl } from "@/components/molecules/segmented-control";
import { CHARGE_STATUSES, daysBetween, dunningLabel, SUBSCRIPTION_STATUSES, type BillingPolicyValues } from "@/lib/ops/billing-rules";
import type { ChargeRow, SubscriptionRow } from "@/lib/ops/billing";
import { formatUsdCents } from "@/lib/plans/pricing";
import { cn } from "@/lib/utils";
import Panel from "../../_components/panel";
import { generateRenewalAction, savePolicyAction } from "../actions";
import ChargeSheet, { DUNNING_TONE, type BillingPerms } from "./charge-sheet";
import SubscriptionSheet, { type NewSubscription } from "./subscription-sheet";
import { useBilling } from "./use-billing";

type Tab = "resumen" | "cobros" | "renovaciones" | "suscripciones" | "politica";
type Summary = { mrrCents: number; collectedMonthCents: number; pendingCents: number; overdueCents: number; overdueCount: number; toConfirm: number; suspendable: number };

const PLAN = { ESSENTIAL: "Essential", ELITE: "Elite", SIGNATURE: "Signature" } as Record<string, string>;

function ChargeList({ rows, onOpen, empty }: { rows: ChargeRow[]; onOpen: (c: ChargeRow) => void; empty: string }) {
  if (!rows.length) return <p className="px-[18px] py-6 text-center text-sm text-muted-foreground">{empty}</p>;
  return (
    <ul className="divide-y divide-border">
      {rows.map((c) => (
        <li key={c.id}>
          <button type="button" onClick={() => onOpen(c)} className="grid w-full gap-1 px-[18px] py-3 text-left transition-colors hover:bg-surface-muted sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-4">
            <span className="grid min-w-0">
              <b className="truncate text-[13.5px] font-medium">{c.tenantName}</b>
              <small className="truncate text-xs text-muted-foreground">
                {c.periodStart} → {c.periodEnd} · vence {c.dueDate}
                {c.evidence.length ? ` · ${c.evidence.length} comprobante${c.evidence.length > 1 ? "s" : ""}` : ""}
              </small>
            </span>
            <span className="flex flex-wrap items-center gap-1.5 sm:justify-end">
              <span className="font-mono text-[13px] tabular-nums">{formatUsdCents(c.amountUsdCents)}</span>
              {c.status === "PENDING" ? (
                <Badge tone={c.evidence.length && c.method ? "neutral" : DUNNING_TONE[c.dunning.stage]}>{c.evidence.length && c.method ? "Por confirmar" : dunningLabel(c.dunning)}</Badge>
              ) : (
                <Badge tone={c.status === "PAID" ? "success" : "muted"}>{CHARGE_STATUSES.find((s) => s.value === c.status)?.label}</Badge>
              )}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function PolicyForm({ policy, canEdit }: { policy: BillingPolicyValues; canEdit: boolean }) {
  const { run, pending } = useBilling();
  const [reminders, setReminders] = useState(policy.reminderDays.join(", "));
  const [grace, setGrace] = useState(policy.graceDays);
  const [notice, setNotice] = useState(policy.noticeDays);
  return (
    <Panel title="Política de cobro y suspensión" hint="Nada se suspende solo: la política dice cuándo se puede, y alguien con permiso lo hace.">
      <div className="grid gap-4 p-[18px]">
        <ol className="grid gap-2 text-[13px] sm:grid-cols-4">
          {[
            ["1 · Recordatorios", `${reminders || "—"} días antes del vencimiento`],
            ["2 · Gracia", `${grace} días después del vencimiento`],
            ["3 · Aviso de suspensión", `Se envía al terminar la gracia; corre ${notice} días`],
            ["4 · Suspensión", "Manual, con permiso. Se reactiva sola al confirmar el pago"],
          ].map(([t, d]) => (
            <li key={t} className="rounded-md bg-surface-muted p-3">
              <b className="block text-[12.5px] font-semibold">{t}</b>
              <span className="text-xs text-muted-foreground">{d}</span>
            </li>
          ))}
        </ol>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="grid gap-1.5 text-[13px] font-medium">
            Recordatorios (días antes)
            <input disabled={!canEdit} value={reminders} onChange={(e) => setReminders(e.target.value)} className={cn(inputClasses, "font-mono")} placeholder="7, 3, 1" />
          </label>
          <label className="grid gap-1.5 text-[13px] font-medium">
            Días de gracia
            <input disabled={!canEdit} type="number" min={0} max={60} value={grace} onChange={(e) => setGrace(Number(e.target.value))} className={cn(inputClasses, "font-mono")} />
          </label>
          <label className="grid gap-1.5 text-[13px] font-medium">
            Plazo del aviso (días)
            <input disabled={!canEdit} type="number" min={1} max={30} value={notice} onChange={(e) => setNotice(Number(e.target.value))} className={cn(inputClasses, "font-mono")} />
          </label>
        </div>
        {canEdit ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => savePolicyAction({ reminderDays: reminders.split(/[\s,;]+/).filter(Boolean).map(Number), graceDays: grace, noticeDays: notice }))}
            className={buttonVariants({ className: "justify-self-start" })}
          >
            Guardar política
          </button>
        ) : (
          <p className="text-xs text-muted-foreground">Cambiar la política requiere el permiso de precios.</p>
        )}
      </div>
    </Panel>
  );
}

/** Facturación: suscripciones, cobros con comprobante, renovaciones y cobranza. */
export default function BillingView({
  subs,
  charges,
  missing,
  policy,
  summary,
  perms,
  today,
}: {
  subs: SubscriptionRow[];
  charges: ChargeRow[];
  missing: NewSubscription[];
  policy: BillingPolicyValues;
  summary: Summary;
  perms: BillingPerms;
  today: string;
}) {
  const params = useSearchParams();
  const [tab, setTab] = useState<Tab>((params.get("tab") as Tab) ?? "resumen");
  const [open, setOpen] = useState<string | null>(params.get("cobro"));
  const [creating, setCreating] = useState<NewSubscription | null>(() => {
    const id = params.get("suscribir");
    return missing.find((m) => m.tenantId === id) ?? null;
  });
  const [editing, setEditing] = useState<SubscriptionRow | null>(null);
  const [status, setStatus] = useState<"all" | "PENDING" | "PAID" | "VOID" | "REFUNDED">("all");
  const { run, pending } = useBilling();
  const charge = charges.find((c) => c.id === open) ?? null;

  const collection = charges
    .filter((c) => c.status === "PENDING" && ["grace", "notice_needed", "notice_running", "suspend_eligible", "due_today"].includes(c.dunning.stage))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const toConfirm = charges.filter((c) => c.status === "PENDING" && c.evidence.length > 0 && c.method);
  const upcoming = charges.filter((c) => c.dunning.stage === "upcoming").sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const renewals = subs
    .filter((s) => s.status !== "CANCELLED" && !s.nextChargeExists && daysBetween(today, s.periodEnd) <= 30)
    .sort((a, b) => a.periodEnd.localeCompare(b.periodEnd));

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <KpiCard label="Ingreso mensual (MRR)" value={formatUsdCents(summary.mrrCents)} hint={`${subs.filter((s) => s.status === "ACTIVE").length} suscripciones activas`} index={0} />
        <KpiCard label="Cobrado este mes" value={formatUsdCents(summary.collectedMonthCents)} hint="Pagos confirmados" index={1} />
        <KpiCard label="Por cobrar" value={formatUsdCents(summary.pendingCents)} hint={`${summary.toConfirm} por confirmar`} index={2} />
        <KpiCard label="Vencido" value={formatUsdCents(summary.overdueCents)} hint={`${summary.overdueCount} cobros · ${summary.suspendable} suspendibles`} alert={summary.overdueCount > 0} index={3} />
      </div>

      <div className="overflow-x-auto [scrollbar-width:none]">
        <SegmentedControl
          ariaLabel="Secciones de facturación"
          value={tab}
          onChange={setTab}
          options={[
            { value: "resumen", label: "Cobranza", count: collection.length + toConfirm.length },
            { value: "cobros", label: "Cobros", count: charges.length },
            { value: "renovaciones", label: "Renovaciones", count: renewals.length },
            { value: "suscripciones", label: "Suscripciones", count: subs.length },
            { value: "politica", label: "Política" },
          ]}
        />
      </div>

      <div key={tab} className="nx-rise grid gap-3.5">
        {tab === "resumen" ? (
          <div className="grid grid-cols-1 items-start gap-3.5 lg:grid-cols-2">
            <Panel title="Cobranza" hint="Vencidos y que vencen hoy, del más antiguo al más reciente.">
              <ChargeList rows={collection} onOpen={(c) => setOpen(c.id)} empty="Nadie debe nada. 🎉" />
            </Panel>
            <div className="grid gap-3.5">
              <Panel title="Por confirmar" hint="Pagos con comprobante cargado: revisar y confirmar.">
                <ChargeList rows={toConfirm} onOpen={(c) => setOpen(c.id)} empty="Nada por confirmar." />
              </Panel>
              <Panel title="Próximos vencimientos" hint={`Recordatorios ${policy.reminderDays.join(", ")} días antes.`}>
                <ChargeList rows={upcoming.slice(0, 8)} onOpen={(c) => setOpen(c.id)} empty="Sin cobros próximos." />
              </Panel>
            </div>
          </div>
        ) : null}

        {tab === "cobros" ? (
          <>
            <ChipRow className="flex-wrap">
              {(["all", "PENDING", "PAID", "VOID", "REFUNDED"] as const).map((s) => (
                <Chip key={s} selected={status === s} onClick={() => setStatus(s)}>
                  {s === "all" ? "Todos" : CHARGE_STATUSES.find((x) => x.value === s)?.label}
                </Chip>
              ))}
            </ChipRow>
            <div className="overflow-hidden rounded-lg border border-border bg-surface">
              <ChargeList rows={charges.filter((c) => status === "all" || c.status === status)} onOpen={(c) => setOpen(c.id)} empty="Sin cobros." />
            </div>
          </>
        ) : null}

        {tab === "renovaciones" ? (
          <Panel title="Renovaciones (30 días)" hint="Suscripciones cuyo período termina pronto y aún no tienen el cobro siguiente.">
            {renewals.length ? (
              <ul className="divide-y divide-border">
                {renewals.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center gap-3 px-[18px] py-3">
                    <span className="min-w-0 flex-1">
                      <b className="block truncate text-[13.5px] font-medium">{s.tenantName}</b>
                      <small className="text-xs text-muted-foreground">
                        Thrive {PLAN[s.plan] ?? s.plan} · {s.billingCycle === "ANNUAL" ? "anual" : "mensual"} · termina {s.periodEnd} ({daysBetween(today, s.periodEnd)} d)
                      </small>
                    </span>
                    {perms.record ? (
                      <button type="button" disabled={pending} onClick={() => run(() => generateRenewalAction(s.id))} className={buttonVariants({ size: "sm", variant: "outline" })}>
                        <CalendarPlus aria-hidden="true" className="size-3.5" /> Generar cobro
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-[18px] py-6 text-center text-sm text-muted-foreground">Ninguna renovación pendiente en los próximos 30 días.</p>
            )}
          </Panel>
        ) : null}

        {tab === "suscripciones" ? (
          <div className="grid grid-cols-1 items-start gap-3.5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            <Panel title="Suscripciones">
              {subs.length ? (
                <ul className="divide-y divide-border">
                  {subs.map((s) => {
                    const st = SUBSCRIPTION_STATUSES.find((x) => x.value === s.displayStatus)!;
                    return (
                      <li key={s.id} className="flex flex-wrap items-center gap-3 px-[18px] py-3">
                        <span className="min-w-0 flex-1">
                          <b className="block truncate text-[13.5px] font-medium">{s.tenantName}</b>
                          <small className="text-xs text-muted-foreground">
                            Thrive {PLAN[s.plan] ?? s.plan} · {formatUsdCents(s.priceUsdCents)}/mes · {s.billingCycle === "ANNUAL" ? "anual" : "mensual"} · hasta {s.periodEnd}
                          </small>
                        </span>
                        <Badge tone={st.tone}>{st.label}</Badge>
                        {perms.record ? (
                          <button type="button" aria-label={`Editar ${s.tenantName}`} onClick={() => setEditing(s)} className={buttonVariants({ size: "icon", variant: "ghost" })}>
                            <Pencil aria-hidden="true" className="size-4" />
                          </button>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <EmptyState title="Sin suscripciones" description="Crea la suscripción de cada negocio con el plan que eligió." />
              )}
            </Panel>
            <Panel title="Negocios sin suscripción" hint="Con el plan y precio que eligieron al registrarse.">
              <ul className="divide-y divide-border">
                {missing.map((m) => (
                  <li key={m.tenantId} className="flex items-center gap-3 px-[18px] py-2.5">
                    <span className="min-w-0 flex-1">
                      <b className="block truncate text-[13.5px] font-medium">{m.name}</b>
                      <small className="text-xs text-muted-foreground">
                        {PLAN[m.plan] ?? m.plan} · {formatUsdCents(m.monthlyCents)}/mes
                      </small>
                    </span>
                    {perms.record ? (
                      <button type="button" onClick={() => setCreating(m)} className={buttonVariants({ size: "sm", variant: "outline" })}>
                        <Plus aria-hidden="true" className="size-3.5" /> Crear
                      </button>
                    ) : null}
                  </li>
                ))}
                {missing.length === 0 ? <li className="px-[18px] py-4 text-[13px] text-muted-foreground">Todos tienen suscripción.</li> : null}
              </ul>
            </Panel>
          </div>
        ) : null}

        {tab === "politica" ? <PolicyForm policy={policy} canEdit={perms.pricing} /> : null}
      </div>

      {charge ? <ChargeSheet key={`${charge.id}-${charge.status}-${charge.evidence.length}`} charge={charge} onClose={() => setOpen(null)} perms={perms} today={today} /> : null}
      {creating ? <SubscriptionSheet create={creating} onClose={() => setCreating(null)} today={today} canPrice={perms.pricing} /> : null}
      {editing ? <SubscriptionSheet edit={editing} onClose={() => setEditing(null)} today={today} canPrice={perms.pricing} /> : null}
    </div>
  );
}
