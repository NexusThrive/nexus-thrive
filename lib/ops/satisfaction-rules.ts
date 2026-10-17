/** Satisfacción (pura): CSAT = % de 4 y 5; NPS = % promotores − % detractores. */

export function csat(scores: number[]): number | null {
  const v = scores.filter((s) => s >= 1 && s <= 5);
  return v.length ? Math.round((v.filter((s) => s >= 4).length / v.length) * 100) : null;
}

export function nps(scores: number[]): number | null {
  const v = scores.filter((s) => s >= 0 && s <= 10);
  if (!v.length) return null;
  const pro = v.filter((s) => s >= 9).length;
  const det = v.filter((s) => s <= 6).length;
  return Math.round(((pro - det) / v.length) * 100);
}

export function validateAnswer(raw: { score: unknown; nps?: unknown; comment?: unknown }): { ok: true; value: { score: number; nps: number | null; comment: string | null } } | { ok: false; message: string } {
  const score = Number(raw.score);
  if (!Number.isInteger(score) || score < 1 || score > 5) return { ok: false, message: "Elige una calificación de 1 a 5." };
  const n = raw.nps === "" || raw.nps == null ? null : Number(raw.nps);
  if (n != null && (!Number.isInteger(n) || n < 0 || n > 10)) return { ok: false, message: "La recomendación va de 0 a 10." };
  const comment = typeof raw.comment === "string" ? raw.comment.trim().slice(0, 1000) || null : null;
  return { ok: true, value: { score, nps: n, comment } };
}

export const SCORE_LABELS = ["", "Muy mala", "Mala", "Regular", "Buena", "Excelente"] as const;
