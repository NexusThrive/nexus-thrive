/**
 * Oportunidades (HU-leads-01), reglas puras: etapas, validación y qué se muestra primero. Una oportunidad vive ligada a UN contacto;
 * ganarla no crea otra persona. No es el CRM comercial de Nexus (`lib/platform/crm`): es el seguimiento de los interesados del negocio.
 */
export const OPEN_STAGES = ["NEW", "CONTACTED", "QUOTED", "NEGOTIATING"] as const;
export type OpportunityStage = (typeof OPEN_STAGES)[number];
export type OpportunityStatus = "OPEN" | "WON" | "LOST";
export const STAGE_TEXT: Record<OpportunityStage, string> = { NEW: "Nuevo", CONTACTED: "Contactado", QUOTED: "Cotizado", NEGOTIATING: "Negociando" };

export type OpportunityDraft = { interest: string; estimatedValue?: number | null; nextAction?: string | null };

/** Problema legible de una oportunidad nueva, o `null`. El interés dice qué quiere la persona; el valor es opcional pero razonable. */
export function validateOpportunity(d: OpportunityDraft): string | null {
  if (d.interest.trim().length < 3) return "Escribe qué le interesa a la persona.";
  if (d.interest.trim().length > 200) return "El interés es muy largo (máximo 200 caracteres).";
  if (d.estimatedValue != null && (!Number.isFinite(d.estimatedValue) || d.estimatedValue < 0 || d.estimatedValue > 10_000_000_000)) return "El valor estimado no es válido.";
  if (d.nextAction && d.nextAction.trim().length > 200) return "La próxima acción es muy larga (máximo 200 caracteres).";
  return null;
}

/** Perder una oportunidad exige decir por qué (para aprender de qué se pierde). */
export function validateLoss(reason: string): string | null {
  return reason.trim().length >= 3 ? null : "Escribe por qué se perdió.";
}

/** ¿La próxima acción ya venció? Sin fecha no vence. */
export const isOverdue = (nextActionAt: string | null, now = Date.now()) => nextActionAt !== null && new Date(nextActionAt).getTime() < now;

/** Orden de trabajo: primero las que tienen la acción vencida, luego las más cercanas a vencer y al final las que no tienen fecha. */
export function byUrgency<T extends { nextActionAt: string | null; createdAt: string }>(rows: readonly T[], now = Date.now()): T[] {
  return [...rows].sort((a, b) => {
    const A = a.nextActionAt ? new Date(a.nextActionAt).getTime() : Number.POSITIVE_INFINITY;
    const B = b.nextActionAt ? new Date(b.nextActionAt).getTime() : Number.POSITIVE_INFINITY;
    void now;
    return A - B || b.createdAt.localeCompare(a.createdAt);
  });
}
