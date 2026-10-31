/**
 * Gimnasio (puro): estado de la membresía, control de acceso en la puerta
 * (NFC, QR o manual), congelamientos y el contador de tiempo restante.
 */

const DAY = 86_400_000;

export type MembershipLike = { id: string; start: number; end: number; frozenFrom: number | null; frozenUntil: number | null; cancelledAt: number | null };
export type MembershipState = "active" | "frozen" | "expired" | "cancelled" | "upcoming";

export function membershipState(m: MembershipLike, now: number): MembershipState {
  if (m.cancelledAt && m.cancelledAt <= now) return "cancelled";
  if (m.frozenFrom != null && m.frozenUntil != null && now >= m.frozenFrom && now < m.frozenUntil) return "frozen";
  if (now < m.start) return "upcoming";
  return now <= m.end ? "active" : "expired";
}

export const STATE_LABELS: Record<MembershipState, string> = { active: "Activa", frozen: "Congelada", expired: "Vencida", cancelled: "Cancelada", upcoming: "Por iniciar" };

/** La membresía que cuenta para entrar: la activa que vence más tarde; si no hay, la más reciente. */
export function currentMembership<T extends MembershipLike>(list: T[], now: number): T | null {
  const active = list.filter((m) => membershipState(m, now) === "active").sort((a, b) => b.end - a.end);
  if (active[0]) return active[0];
  return [...list].sort((a, b) => b.end - a.end)[0] ?? null;
}

export type AccessResult = { allowed: boolean; reason: string; daysLeft: number | null; membershipId: string | null };

/** ¿Puede entrar? Explica siempre el motivo. */
export function checkAccess(list: MembershipLike[], now: number): AccessResult {
  const m = currentMembership(list, now);
  if (!m) return { allowed: false, reason: "No tiene membresía.", daysLeft: null, membershipId: null };
  const st = membershipState(m, now);
  const daysLeft = Math.max(0, Math.ceil((m.end - now) / DAY));
  if (st === "active") return { allowed: true, reason: daysLeft <= 3 ? `Bienvenido. Su membresía vence en ${daysLeft} ${daysLeft === 1 ? "día" : "días"}.` : "Bienvenido.", daysLeft, membershipId: m.id };
  const why = { frozen: "Su membresía está congelada.", expired: "Su membresía está vencida: debe renovar.", cancelled: "Su membresía fue cancelada.", upcoming: "Su membresía aún no ha iniciado." }[st];
  return { allowed: false, reason: why, daysLeft: st === "expired" ? 0 : daysLeft, membershipId: m.id };
}

export const MAX_FREEZE_DAYS = 60;

/** Congelar N días desde una fecha: el vencimiento se corre esos mismos días. */
export function freezePlan(m: MembershipLike, fromMs: number, days: number, now: number): { ok: true; frozenFrom: number; frozenUntil: number; newEnd: number } | { ok: false; message: string } {
  if (!Number.isInteger(days) || days < 1 || days > MAX_FREEZE_DAYS) return { ok: false, message: `Se congela de 1 a ${MAX_FREEZE_DAYS} días.` };
  const st = membershipState(m, now);
  if (st !== "active") return { ok: false, message: "Solo se congela una membresía activa." };
  if (fromMs < now - DAY || fromMs > m.end) return { ok: false, message: "La fecha de inicio del congelamiento no es válida." };
  return { ok: true, frozenFrom: fromMs, frozenUntil: fromMs + days * DAY, newEnd: m.end + days * DAY };
}

/** Contador "12 d 04 h 15 min" (o "Vencida"). */
export function countdown(endMs: number, now: number): { text: string; urgent: boolean; expired: boolean } {
  const left = endMs - now;
  if (left <= 0) return { text: "Vencida", urgent: true, expired: true };
  const d = Math.floor(left / DAY);
  const h = Math.floor((left % DAY) / 3_600_000);
  const min = Math.floor((left % 3_600_000) / 60_000);
  return { text: d ? `${d} d ${String(h).padStart(2, "0")} h ${String(min).padStart(2, "0")} min` : `${h} h ${String(min).padStart(2, "0")} min`, urgent: left < 3 * DAY, expired: false };
}

/** Código de acceso legible para el QR (sin 0/O ni 1/I). */
export function accessCode(random: () => number = Math.random): string {
  const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 8 }, () => A[Math.floor(random() * A.length)]).join("");
}
