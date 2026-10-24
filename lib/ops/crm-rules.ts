/**
 * Reglas del CRM comercial de NEXUS (puras: sirven en el navegador y en el
 * servidor). El embudo tiene 8 etapas; un lead activo (ni ganado ni perdido)
 * siempre tiene responsable y próximo paso con fecha.
 */

export const LEAD_STAGES = [
  { value: "NEW", label: "Lead nuevo", short: "Nuevo", probability: 5 },
  { value: "CONTACTED", label: "Primer contacto", short: "Contacto", probability: 10 },
  { value: "QUALIFIED", label: "Calificado", short: "Calificado", probability: 25 },
  { value: "DEMO", label: "Diagnóstico / demostración", short: "Demo", probability: 40 },
  { value: "PROPOSAL", label: "Propuesta enviada", short: "Propuesta", probability: 60 },
  { value: "NEGOTIATION", label: "Negociación", short: "Negociación", probability: 80 },
  { value: "WON", label: "Ganado / onboarding", short: "Ganado", probability: 100 },
  { value: "LOST", label: "Perdido / aplazado", short: "Perdido", probability: 0 },
] as const;

export type LeadStageValue = (typeof LEAD_STAGES)[number]["value"];

export const LEAD_SOURCES = ["Referido", "Instagram", "WhatsApp", "Página web", "Evento", "Llamada en frío", "Aliado", "Otro"] as const;

export const LEAD_ACTIVITY_KINDS = [
  { value: "note", label: "Nota" },
  { value: "call", label: "Llamada" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Correo" },
  { value: "meeting", label: "Reunión" },
] as const;

export type LeadActivityKind = (typeof LEAD_ACTIVITY_KINDS)[number]["value"] | "stage";

export const LOST_REASONS = ["Precio", "Eligió otra solución", "No es el momento", "Sin respuesta", "No encaja con su rubro", "Otro"] as const;

export function isLeadStage(v: unknown): v is LeadStageValue {
  return typeof v === "string" && LEAD_STAGES.some((s) => s.value === v);
}

export function stageMeta(stage: LeadStageValue) {
  return LEAD_STAGES.find((s) => s.value === stage)!;
}

export function isActiveStage(stage: LeadStageValue) {
  return stage !== "WON" && stage !== "LOST";
}

export type LeadInput = {
  company: string;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  vertical?: string | null;
  city?: string | null;
  source: string;
  stage: LeadStageValue;
  ownerId?: string | null;
  nextStep?: string | null;
  /** YYYY-MM-DD */
  nextStepDate?: string | null;
  valueUsdCents?: number;
  plan?: string | null;
  notes?: string | null;
  lostReason?: string | null;
  tenantId?: string | null;
};

export type LeadValues = Required<{ [K in keyof LeadInput]: Exclude<LeadInput[K], undefined> }>;

type Result = { ok: true; value: LeadValues } | { ok: false; errors: Partial<Record<keyof LeadInput, string>> };

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const opt = (v: unknown, max: number) => str(v, max) || null;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Valida un lead con las reglas del embudo. */
export function validateLead(raw: LeadInput): Result {
  const errors: Partial<Record<keyof LeadInput, string>> = {};
  const company = str(raw.company, 120);
  if (company.length < 2) errors.company = "Escribe el nombre del negocio o prospecto.";
  const email = opt(raw.email, 160);
  if (email && !EMAIL.test(email)) errors.email = "Correo no válido.";
  const phone = opt(raw.phone, 40);
  if (!phone && !email) errors.phone = "Deja al menos un teléfono o un correo.";
  const source = str(raw.source, 40);
  if (!source) errors.source = "Indica de dónde llegó.";
  if (!isLeadStage(raw.stage)) errors.stage = "Etapa no válida.";
  const stage = isLeadStage(raw.stage) ? raw.stage : "NEW";
  const ownerId = opt(raw.ownerId, 64);
  const nextStep = opt(raw.nextStep, 160);
  const nextStepDate = opt(raw.nextStepDate, 10);
  if (nextStepDate && !DATE.test(nextStepDate)) errors.nextStepDate = "Fecha no válida.";
  if (isActiveStage(stage)) {
    if (!ownerId) errors.ownerId = "Un lead activo necesita responsable.";
    if (!nextStep) errors.nextStep = "Define el próximo paso.";
    if (!nextStepDate) errors.nextStepDate = "Ponle fecha al próximo paso.";
  }
  const lostReason = opt(raw.lostReason, 160);
  if (stage === "LOST" && !lostReason) errors.lostReason = "Indica por qué se perdió o aplazó.";
  const value = typeof raw.valueUsdCents === "number" && Number.isFinite(raw.valueUsdCents) ? Math.round(raw.valueUsdCents) : 0;
  if (value < 0) errors.valueUsdCents = "El valor no puede ser negativo.";
  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      company,
      contactName: opt(raw.contactName, 120),
      phone,
      email,
      vertical: opt(raw.vertical, 40),
      city: opt(raw.city, 80),
      source,
      stage,
      ownerId,
      nextStep: isActiveStage(stage) ? nextStep : null,
      nextStepDate: isActiveStage(stage) ? nextStepDate : null,
      valueUsdCents: value,
      plan: opt(raw.plan, 20),
      notes: opt(raw.notes, 2000),
      lostReason: stage === "LOST" ? lostReason : null,
      tenantId: stage === "WON" ? opt(raw.tenantId, 64) : null,
    },
  };
}

export type FollowUp = "overdue" | "today" | "upcoming" | "none";

/** Estado del próximo paso respecto a hoy (fechas YYYY-MM-DD). */
export function followUpState(stage: LeadStageValue, nextStepDate: string | null, today: string): FollowUp {
  if (!isActiveStage(stage) || !nextStepDate) return "none";
  if (nextStepDate < today) return "overdue";
  if (nextStepDate === today) return "today";
  return "upcoming";
}

/** Resumen del embudo: cantidad y valor ponderado por etapa activa. */
export function pipelineSummary(leads: { stage: LeadStageValue; valueUsdCents: number }[]) {
  const by = new Map<LeadStageValue, { count: number; valueCents: number }>();
  for (const s of LEAD_STAGES) by.set(s.value, { count: 0, valueCents: 0 });
  for (const l of leads) {
    const e = by.get(l.stage)!;
    e.count += 1;
    e.valueCents += l.valueUsdCents;
  }
  const active = leads.filter((l) => isActiveStage(l.stage));
  const weightedCents = Math.round(active.reduce((s, l) => s + (l.valueUsdCents * stageMeta(l.stage).probability) / 100, 0));
  const closed = leads.filter((l) => !isActiveStage(l.stage));
  const won = closed.filter((l) => l.stage === "WON").length;
  return { by, activeCount: active.length, weightedCents, winRatePct: closed.length ? Math.round((won / closed.length) * 100) : null };
}

/**
 * ¿Se puede soltar un lead de `from` en `to` desde el tablero? El destino
 * debe ser una etapa activa: ganar o perder pide el negocio vinculado o el motivo, y eso
 * se hace abriendo el lead (misma regla que `moveLeadAction` en el servidor).
 */
export function dropRule(from: LeadStageValue, to: LeadStageValue): { ok: true } | { ok: false; reason: string } {
  if (from === to) return { ok: false, reason: "Ya está en esa etapa." };
  if (!isActiveStage(to)) return { ok: false, reason: "Para ganar o perder un lead, ábrelo: hay que indicar el negocio o el motivo." };
  return { ok: true };
}
