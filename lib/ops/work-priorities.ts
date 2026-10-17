import type { PriorityItem } from "./accounts";
import { listCharges } from "./billing";
import { dunningLabel } from "./billing-rules";
import { followUpState, stageMeta } from "./crm-rules";
import { listLeads, todayBogota } from "./leads";
import { priorityMeta, slaState } from "./support-rules";
import { listTickets } from "./tickets";

/** Prioridades comerciales: seguimientos vencidos o para hoy. */
export async function leadPriorities(): Promise<PriorityItem[]> {
  const today = todayBogota();
  const leads = await listLeads();
  return leads
    .map((l) => ({ l, f: followUpState(l.stage, l.nextStepDate, today) }))
    .filter(({ f }) => f === "overdue" || f === "today")
    .sort((a, b) => (a.l.nextStepDate ?? "").localeCompare(b.l.nextStepDate ?? ""))
    .map(({ l, f }) => ({
      id: l.id,
      name: l.company,
      slug: l.id,
      vertical: null,
      detail: `${f === "overdue" ? "Vencido" : "Hoy"} · ${l.nextStep} · ${stageMeta(l.stage).short}${l.ownerName ? ` · ${l.ownerName}` : ""}`,
      at: `${l.nextStepDate}T12:00:00Z`,
      href: `/admin/crm/${l.id}`,
    }));
}

/** Prioridades de soporte: SLA vencido o en riesgo, y sin asignar. */
export async function ticketPriorities(now = Date.now()): Promise<PriorityItem[]> {
  const tickets = await listTickets();
  return tickets
    .map((t) => ({ t, s: slaState(t, now) }))
    .filter(({ t, s }) => s.state === "breached" || s.state === "at_risk" || ((s.state === "ok") && !t.assigneeId))
    .sort((a, b) => (a.s.dueAt ?? Infinity) - (b.s.dueAt ?? Infinity))
    .map(({ t, s }) => ({
      id: t.id,
      name: `${t.code} · ${t.subject}`,
      slug: t.code,
      vertical: null,
      detail: `${s.state === "breached" ? "SLA vencido" : s.state === "at_risk" ? "SLA en riesgo" : "Sin asignar"} · ${priorityMeta(t.priority).label} · ${t.tenantName ?? "sin negocio"}`,
      at: new Date(t.createdAt).toISOString(),
      href: `/admin/soporte/${t.id}`,
    }));
}

/** Prioridades de cobro: por confirmar, aviso pendiente o suspendibles. */
export async function billingPriorities(): Promise<PriorityItem[]> {
  const charges = await listCharges();
  const rank = { suspend_eligible: 0, notice_needed: 1 } as Record<string, number>;
  return charges
    .filter((c) => c.status === "PENDING" && ((c.evidence.length > 0 && c.method) || c.dunning.stage === "notice_needed" || c.dunning.stage === "suspend_eligible"))
    .sort((a, b) => (rank[a.dunning.stage] ?? 2) - (rank[b.dunning.stage] ?? 2) || a.dueDate.localeCompare(b.dueDate))
    .map((c) => ({
      id: c.id,
      name: c.tenantName,
      slug: c.id,
      vertical: null,
      detail: c.evidence.length && c.method ? "Pago con comprobante · por confirmar" : dunningLabel(c.dunning),
      at: `${c.dueDate}T12:00:00Z`,
      href: `/admin/facturacion?cobro=${c.id}`,
    }));
}
