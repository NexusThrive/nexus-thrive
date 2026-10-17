/**
 * Reglas de Soporte de NEXUS (puras). Código SUP-AAAA-NNNNN, SLA por
 * prioridad (primera respuesta y resolución), estados y transiciones.
 * Resolver exige la solución; cerrar solo después de resolver.
 */

export const TICKET_STATUSES = [
  { value: "NEW", label: "Nuevo", tone: "warning" },
  { value: "OPEN", label: "Abierto", tone: "neutral" },
  { value: "IN_PROGRESS", label: "En progreso", tone: "neutral" },
  { value: "WAITING_CUSTOMER", label: "Esperando al cliente", tone: "muted" },
  { value: "ESCALATED", label: "Escalado", tone: "danger" },
  { value: "RESOLVED", label: "Resuelto", tone: "success" },
  { value: "CLOSED", label: "Cerrado", tone: "muted" },
] as const;

export type TicketStatusValue = (typeof TICKET_STATUSES)[number]["value"];

export const TICKET_PRIORITIES = [
  { value: "LOW", label: "Baja", firstResponseHours: 24, resolutionHours: 120 },
  { value: "NORMAL", label: "Normal", firstResponseHours: 8, resolutionHours: 72 },
  { value: "HIGH", label: "Alta", firstResponseHours: 4, resolutionHours: 24 },
  { value: "URGENT", label: "Urgente", firstResponseHours: 1, resolutionHours: 8 },
] as const;

export type TicketPriorityValue = (typeof TICKET_PRIORITIES)[number]["value"];

export const TICKET_CATEGORIES = [
  "Acceso y cuenta",
  "Facturación y pagos",
  "Error técnico",
  "Configuración",
  "Duda o capacitación",
  "Datos e importación",
  "WhatsApp y correo",
  "Solicitud de mejora",
] as const;

export const TICKET_CHANNELS = ["WhatsApp", "Correo", "Llamada", "Chat en la app", "Interno"] as const;

export const isTicketStatus = (v: unknown): v is TicketStatusValue => typeof v === "string" && TICKET_STATUSES.some((s) => s.value === v);
export const isTicketPriority = (v: unknown): v is TicketPriorityValue => typeof v === "string" && TICKET_PRIORITIES.some((s) => s.value === v);
export const statusMeta = (s: TicketStatusValue) => TICKET_STATUSES.find((x) => x.value === s)!;
export const priorityMeta = (p: TicketPriorityValue) => TICKET_PRIORITIES.find((x) => x.value === p)!;

/** SUP-2026-00124 */
export function ticketCode(year: number, seq: number) {
  return `SUP-${year}-${String(seq).padStart(5, "0")}`;
}

export const isOpenStatus = (s: TicketStatusValue) => s !== "RESOLVED" && s !== "CLOSED";

const NEXT: Record<TicketStatusValue, TicketStatusValue[]> = {
  NEW: ["OPEN", "IN_PROGRESS", "WAITING_CUSTOMER", "ESCALATED", "RESOLVED"],
  OPEN: ["IN_PROGRESS", "WAITING_CUSTOMER", "ESCALATED", "RESOLVED"],
  IN_PROGRESS: ["OPEN", "WAITING_CUSTOMER", "ESCALATED", "RESOLVED"],
  WAITING_CUSTOMER: ["OPEN", "IN_PROGRESS", "ESCALATED", "RESOLVED"],
  ESCALATED: ["OPEN", "IN_PROGRESS", "WAITING_CUSTOMER", "RESOLVED"],
  RESOLVED: ["CLOSED", "OPEN"],
  CLOSED: ["OPEN"],
};

export function allowedTransitions(from: TicketStatusValue): TicketStatusValue[] {
  return NEXT[from];
}

export function checkTransition(from: TicketStatusValue, to: TicketStatusValue, solution: string | null | undefined): { ok: true } | { ok: false; message: string } {
  if (from === to) return { ok: false, message: "El ticket ya está en ese estado." };
  if (!NEXT[from].includes(to)) return { ok: false, message: `No se puede pasar de "${statusMeta(from).label}" a "${statusMeta(to).label}".` };
  if (to === "RESOLVED" && !(solution ?? "").trim()) return { ok: false, message: "Escribe la solución antes de resolver." };
  return { ok: true };
}

export type SlaState = "ok" | "at_risk" | "breached" | "met" | "paused";

/**
 * Estado del SLA (milisegundos epoch). Mientras no hay primera respuesta
 * manda el plazo de respuesta; después, el de resolución. Esperando al
 * cliente pausa el reloj. "En riesgo" = queda menos del 25 % del plazo.
 */
export function slaState(t: { priority: TicketPriorityValue; status: TicketStatusValue; createdAt: number; firstResponseAt: number | null; resolvedAt: number | null }, now: number): { state: SlaState; dueAt: number | null; kind: "response" | "resolution" } {
  const p = priorityMeta(t.priority);
  const H = 3_600_000;
  if (!isOpenStatus(t.status)) {
    const due = t.createdAt + p.resolutionHours * H;
    return { state: (t.resolvedAt ?? now) <= due ? "met" : "breached", dueAt: due, kind: "resolution" };
  }
  if (t.status === "WAITING_CUSTOMER") return { state: "paused", dueAt: null, kind: "resolution" };
  const kind = t.firstResponseAt ? "resolution" : "response";
  const total = (kind === "response" ? p.firstResponseHours : p.resolutionHours) * H;
  const due = t.createdAt + total;
  const left = due - now;
  return { state: left < 0 ? "breached" : left < total * 0.25 ? "at_risk" : "ok", dueAt: due, kind };
}

export type TicketInput = {
  tenantId?: string | null;
  subject: string;
  description: string;
  category: string;
  priority: string;
  channel: string;
  requesterName?: string | null;
  requesterContact?: string | null;
  assigneeId?: string | null;
};

export function validateTicket(raw: TicketInput):
  | { ok: true; value: { tenantId: string | null; subject: string; description: string; category: string; priority: TicketPriorityValue; channel: string; requesterName: string | null; requesterContact: string | null; assigneeId: string | null } }
  | { ok: false; errors: Partial<Record<keyof TicketInput, string>> } {
  const errors: Partial<Record<keyof TicketInput, string>> = {};
  const subject = (raw.subject ?? "").trim().slice(0, 140);
  const description = (raw.description ?? "").trim().slice(0, 5000);
  if (subject.length < 4) errors.subject = "Resume el problema en una línea.";
  if (description.length < 4) errors.description = "Describe qué pasa.";
  if (!(TICKET_CATEGORIES as readonly string[]).includes(raw.category)) errors.category = "Elige una categoría.";
  if (!isTicketPriority(raw.priority)) errors.priority = "Elige una prioridad.";
  if (!(TICKET_CHANNELS as readonly string[]).includes(raw.channel)) errors.channel = "Elige el canal.";
  if (Object.keys(errors).length) return { ok: false, errors };
  const o = (v: string | null | undefined, n: number) => (v ?? "").trim().slice(0, n) || null;
  return {
    ok: true,
    value: {
      tenantId: o(raw.tenantId, 64),
      subject,
      description,
      category: raw.category,
      priority: raw.priority as TicketPriorityValue,
      channel: raw.channel,
      requesterName: o(raw.requesterName, 120),
      requesterContact: o(raw.requesterContact, 160),
      assigneeId: o(raw.assigneeId, 64),
    },
  };
}
