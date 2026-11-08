/**
 * Pipeline del CRM, reglas puras (sin base): etapas iniciales, estado de las actividades, el chip y la barra de cada columna, el orden
 * de las tarjetas, el formato corto de dinero y la validación de la creación rápida. Inspirado en el CRM de Odoo (`crm.lead`,
 * `crm.stage`, `mail.activity`): la oportunidad apunta a UN cliente y lee su correo y teléfono de él; la barra de la columna es la
 * de las actividades (planeada, para hoy, vencida); la etapa ganada fija 100 % y perder deja 0 %.
 */

export const DEFAULT_STAGES = [
  { name: "Nuevo", probability: 20, isWon: false },
  { name: "Calificado", probability: 40, isWon: false },
  { name: "Propuesta", probability: 60, isWon: false },
  { name: "Ganado", probability: 100, isWon: true },
] as const;

export const DEFAULT_LOST_REASONS = ["Precio", "Eligió a la competencia", "Sin respuesta", "No era el momento"] as const;

/** Etapas del modelo anterior (`Opportunity.stage`) → posición en las etapas iniciales. */
export const LEGACY_STAGE_INDEX: Record<string, number> = { NEW: 0, CONTACTED: 1, QUOTED: 2, NEGOTIATING: 2 };

export const ACTIVITY_KINDS = ["CALL", "MEETING", "PROPOSAL", "OTHER"] as const;
export type ActivityKind = (typeof ACTIVITY_KINDS)[number];
export const ACTIVITY_LABEL: Record<ActivityKind, string> = { CALL: "Llamar", MEETING: "Reunión", PROPOSAL: "Enviar propuesta", OTHER: "Otro" };
export const isActivityKind = (v: unknown): v is ActivityKind => typeof v === "string" && (ACTIVITY_KINDS as readonly string[]).includes(v);

/** Mes «AAAA-MM» de hoy en Bogotá. */
export const bogotaMonth = () => bogotaDay(Date.now()).slice(0, 7);

/** Día «AAAA-MM-DD» en Bogotá de un instante. */
export const bogotaDay = (ms: number) => new Date(ms - 5 * 3_600_000).toISOString().slice(0, 10);

export type ActivityState = "planned" | "today" | "overdue";

/** Estado de una actividad pendiente según su día en Bogotá: vencida (antes de hoy), para hoy o planeada. */
export function activityState(dueAtMs: number, now = Date.now()): ActivityState {
  const due = bogotaDay(dueAtMs);
  const today = bogotaDay(now);
  return due < today ? "overdue" : due === today ? "today" : "planned";
}

const WEEKDAY = new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", weekday: "short" });

export type ChipTone = "today" | "overdue" | "planned" | "done";
export type CardChip = { text: string; tone: ChipTone };

/**
 * Chip de la tarjeta: «Llamar hoy», «Vencida · 2 d», «Reunión · jue», «Sin actividad»; en las ganadas, «Pedido creado» o «Cobrado».
 */
export function cardChip(card: { won: boolean; orderPaid: boolean | null; orderCanceled?: boolean; next: { kind: ActivityKind; dueAt: string } | null }, now = Date.now()): CardChip {
  if (card.won && card.orderCanceled) return { text: "Pedido cancelado", tone: "planned" };
  if (card.won) return card.orderPaid ? { text: "Cobrado", tone: "done" } : { text: card.orderPaid === false ? "Pedido creado" : "Ganada", tone: "done" };
  if (!card.next) return { text: "Sin actividad", tone: "planned" };
  const due = new Date(card.next.dueAt).getTime();
  const state = activityState(due, now);
  if (state === "overdue") {
    const days = Math.max(1, Math.round((Date.parse(`${bogotaDay(now)}T12:00:00Z`) - Date.parse(`${bogotaDay(due)}T12:00:00Z`)) / 86_400_000));
    return { text: `Vencida · ${days} d`, tone: "overdue" };
  }
  const label = ACTIVITY_LABEL[card.next.kind];
  if (state === "today") return { text: `${label} hoy`, tone: "today" };
  return { text: `${label} · ${WEEKDAY.format(new Date(due)).replace(".", "")}`, tone: "planned" };
}

/** Segmentos de la barra de una columna, en %: planeada, para hoy, vencida y sin actividad (suman 100; vacía = todo 0). */
export function columnBar(cards: readonly { won: boolean; next: { dueAt: string } | null }[], now = Date.now()) {
  const n = cards.length;
  const count = { planned: 0, today: 0, overdue: 0, none: 0 };
  for (const c of cards) {
    if (c.won) count.planned++;
    else if (!c.next) count.none++;
    else count[activityState(new Date(c.next.dueAt).getTime(), now)]++;
  }
  const pct = (k: number) => (n ? Math.round((k / n) * 1000) / 10 : 0);
  return { planned: pct(count.planned), today: pct(count.today), overdue: pct(count.overdue), none: pct(count.none) };
}

/** Orden dentro de una columna: el manual primero (si lo hay); si no, más estrellas y luego la actividad más próxima. */
export function sortCards<T extends { position: number | null; priority: number; next: { dueAt: string } | null; createdAt: string }>(cards: readonly T[]): T[] {
  return [...cards].sort((a, b) => {
    const pa = a.position ?? Number.POSITIVE_INFINITY;
    const pb = b.position ?? Number.POSITIVE_INFINITY;
    if (pa !== pb) return pa - pb;
    if (a.priority !== b.priority) return b.priority - a.priority;
    const da = a.next ? new Date(a.next.dueAt).getTime() : Number.POSITIVE_INFINITY;
    const db = b.next ? new Date(b.next.dueAt).getTime() : Number.POSITIVE_INFINITY;
    return da - db || b.createdAt.localeCompare(a.createdAt);
  });
}

const COMPACT = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1, minimumFractionDigits: 1 });

/** Dinero corto: «$9,6 M», «$850 mil», «$0». */
export function shortMoney(value: number): string {
  if (!value) return "$0";
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}$${COMPACT.format(abs / 1_000_000)} M`;
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)} mil`;
  return `${sign}$${Math.round(abs)}`;
}

/** Iniciales de un nombre (dos letras). */
export const initialsOf = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "?";

export type QuickDraft = { name: string; value: string; email: string; phone: string };

/** Creación rápida: solo el nombre es obligatorio; el valor, si viene, es un número válido; correo y teléfono con forma razonable. */
export function validateQuick(d: QuickDraft): Partial<Record<keyof QuickDraft, string>> {
  const e: Partial<Record<keyof QuickDraft, string>> = {};
  if (d.name.trim().length < 3) e.name = "Escribe el nombre de la oportunidad";
  else if (d.name.trim().length > 200) e.name = "El nombre es muy largo (máximo 200 caracteres)";
  const v = parseMoney(d.value);
  if (d.value.trim() && (v == null || v < 0 || v > 10_000_000_000)) e.value = "El valor no es válido";
  if (d.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim())) e.email = "Revisa el correo";
  const digits = d.phone.replace(/\D/g, "");
  if (d.phone.trim() && (digits.length < 7 || digits.length > 13)) e.phone = "Revisa el teléfono";
  return e;
}

/** «4.800.000», «$ 4,8 M» o «4800000» → 4800000. Vacío o ilegible → null. */
export function parseMoney(text: string): number | null {
  const t = text.trim().toLowerCase().replace(/\$/g, "").replace(/\s/g, "");
  if (!t) return null;
  const m = t.match(/^([\d.,]+)(m|mil|k)?$/);
  if (!m) return null;
  const [, num, unit] = m;
  const n = unit ? Number(num!.replace(/\./g, "").replace(",", ".")) : Number(num!.replace(/[.,]/g, ""));
  if (!Number.isFinite(n)) return null;
  return Math.round(unit === "m" ? n * 1_000_000 : unit === "mil" || unit === "k" ? n * 1_000 : n);
}
