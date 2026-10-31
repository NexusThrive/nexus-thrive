/**
 * Museo (puro): ajustes de taquilla (aforo por franja, horarios, días de
 * cierre), ocupación de cada franja, validación de una venta y el informe de
 * visitantes.
 */

export type MuseumSettings = {
  /** Personas por franja (aforo). */
  capacityPerSlot: number;
  /** Franjas "HH:MM" en orden. */
  slots: string[];
  /** Días de cierre: 0 = domingo … 6 = sábado. */
  closedWeekdays: number[];
  /** Duración de la visita guiada (min), para la agenda. */
  guidedMinutes: number;
};

export const DEFAULT_MUSEUM: MuseumSettings = {
  capacityPerSlot: 40,
  slots: ["09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00"],
  closedWeekdays: [1],
  guidedMinutes: 60,
};

export const WEEKDAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Lee los ajustes guardados en Tenant.settings.museum (con valores por defecto). */
export function museumSettings(raw: unknown): MuseumSettings {
  const m = (raw && typeof raw === "object" ? (raw as Record<string, unknown>).museum : null) as Partial<MuseumSettings> | null;
  if (!m) return DEFAULT_MUSEUM;
  const slots = Array.isArray(m.slots) ? [...new Set(m.slots.filter((s): s is string => typeof s === "string" && HHMM.test(s)))].sort() : [];
  return {
    capacityPerSlot: Number.isInteger(m.capacityPerSlot) && m.capacityPerSlot! > 0 ? m.capacityPerSlot! : DEFAULT_MUSEUM.capacityPerSlot,
    slots: slots.length ? slots : DEFAULT_MUSEUM.slots,
    closedWeekdays: Array.isArray(m.closedWeekdays) ? m.closedWeekdays.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6) : DEFAULT_MUSEUM.closedWeekdays,
    guidedMinutes: Number.isInteger(m.guidedMinutes) && m.guidedMinutes! >= 15 ? m.guidedMinutes! : DEFAULT_MUSEUM.guidedMinutes,
  };
}

/** Valida lo que el dueño escribe en los ajustes ("09:00, 10:30, …"). */
export function parseMuseumSettings(input: { capacityPerSlot: number; slots: string; closedWeekdays: number[]; guidedMinutes: number }): { ok: true; value: MuseumSettings } | { ok: false; message: string } {
  if (!Number.isInteger(input.capacityPerSlot) || input.capacityPerSlot < 1 || input.capacityPerSlot > 5000) return { ok: false, message: "El aforo por franja va de 1 a 5.000 personas." };
  const slots = input.slots.split(/[,\s]+/).map((s) => s.trim()).filter(Boolean).map((s) => (/^\d:\d\d$/.test(s) ? `0${s}` : s));
  const bad = slots.find((s) => !HHMM.test(s));
  if (bad) return { ok: false, message: `La franja "${bad}" no es una hora válida (usa 09:00).` };
  if (!slots.length) return { ok: false, message: "Agrega al menos una franja." };
  if (slots.length > 48) return { ok: false, message: "Máximo 48 franjas por día." };
  if (!Number.isInteger(input.guidedMinutes) || input.guidedMinutes < 15 || input.guidedMinutes > 480) return { ok: false, message: "La visita guiada dura de 15 a 480 minutos." };
  const days = [...new Set(input.closedWeekdays)].filter((d) => Number.isInteger(d) && d >= 0 && d <= 6).sort();
  if (days.length === 7) return { ok: false, message: "El museo no puede estar cerrado todos los días." };
  return { ok: true, value: { capacityPerSlot: input.capacityPerSlot, slots: [...new Set(slots)].sort(), closedWeekdays: days, guidedMinutes: input.guidedMinutes } };
}

/** Día de la semana (0–6) de una fecha YYYY-MM-DD. */
export function weekdayOf(day: string): number {
  return new Date(`${day}T12:00:00Z`).getUTCDay();
}

export type SaleLike = { slot: string; visitors: number; status: string; kind: string; total: number; lines: { productId: string; name: string; qty: number; unitPrice: number }[]; visitDate?: string };

export type SlotLoad = { slot: string; sold: number; reserved: number; left: number; capacity: number };

/** Ocupación de cada franja (vendidas + reservadas; las anuladas no cuentan). */
export function slotLoads(settings: MuseumSettings, sales: SaleLike[]): SlotLoad[] {
  const extra = sales.map((s) => s.slot).filter((s) => !settings.slots.includes(s));
  return [...settings.slots, ...new Set(extra)].map((slot) => {
    const here = sales.filter((s) => s.slot === slot && s.status !== "VOID");
    const sold = here.filter((s) => s.status === "PAID").reduce((a, s) => a + s.visitors, 0);
    const reserved = here.filter((s) => s.status === "RESERVED").reduce((a, s) => a + s.visitors, 0);
    return { slot, sold, reserved, left: Math.max(0, settings.capacityPerSlot - sold - reserved), capacity: settings.capacityPerSlot };
  });
}

export const SALE_KINDS = [
  { value: "TAQUILLA", label: "Taquilla" },
  { value: "GUIADA", label: "Visita guiada" },
  { value: "COLEGIO", label: "Colegio" },
  { value: "GRUPO", label: "Grupo" },
] as const;
export type SaleKind = (typeof SALE_KINDS)[number]["value"];
export const saleKindLabel = (k: string) => SALE_KINDS.find((x) => x.value === k)?.label ?? k;

export type TicketLineInput = { productId: string; qty: number };

/** Valida una venta: cantidades, franja abierta y aforo disponible. */
export function validateTicketSale(
  input: { day: string; slot: string; kind: string; lines: TicketLineInput[]; groupName: string | null; customerId: string | null },
  ctx: { settings: MuseumSettings; load: SlotLoad | undefined; todayKey: string; prices: Map<string, { name: string; price: number }> },
): { ok: true; visitors: number; total: number; lines: SaleLike["lines"] } | { ok: false; message: string } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.day)) return { ok: false, message: "Elige la fecha de la visita." };
  if (input.day < ctx.todayKey) return { ok: false, message: "No se venden entradas para días pasados." };
  if (ctx.settings.closedWeekdays.includes(weekdayOf(input.day))) return { ok: false, message: `El museo cierra los ${WEEKDAYS[weekdayOf(input.day)].toLowerCase()}.` };
  if (!ctx.load) return { ok: false, message: "Elige una franja horaria." };
  if (!SALE_KINDS.some((k) => k.value === input.kind)) return { ok: false, message: "Tipo de venta no válido." };
  const lines: SaleLike["lines"] = [];
  for (const l of input.lines) {
    if (!Number.isInteger(l.qty) || l.qty < 0 || l.qty > 1000) return { ok: false, message: "Revisa las cantidades." };
    if (l.qty === 0) continue;
    const p = ctx.prices.get(l.productId);
    if (!p) return { ok: false, message: "Una de las entradas ya no está disponible." };
    lines.push({ productId: l.productId, name: p.name, qty: l.qty, unitPrice: p.price });
  }
  const visitors = lines.reduce((a, l) => a + l.qty, 0);
  if (!visitors) return { ok: false, message: "Agrega al menos una entrada." };
  if (visitors > ctx.load.left) return { ok: false, message: ctx.load.left ? `En la franja de las ${ctx.load.slot} solo quedan ${ctx.load.left} cupos.` : `La franja de las ${ctx.load.slot} está llena.` };
  if (input.kind !== "TAQUILLA" && !(input.groupName ?? "").trim()) return { ok: false, message: "Escribe el nombre del grupo, colegio o visita." };
  if ((input.kind === "GUIADA" || input.kind === "COLEGIO") && !input.customerId) return { ok: false, message: "Elige el cliente responsable (colegio o contacto) para agendar la visita." };
  const total = Math.round(lines.reduce((a, l) => a + l.qty * l.unitPrice, 0) * 100) / 100;
  return { ok: true, visitors, total, lines };
}

export const ticketCode = (n: number) => `T-${String(n).padStart(6, "0")}`;

export type VisitorReport = {
  visitors: number;
  revenue: number;
  sales: number;
  byDay: { day: string; visitors: number; revenue: number }[];
  byType: { name: string; visitors: number; revenue: number }[];
  byKind: { kind: string; label: string; visitors: number }[];
  bySlot: { slot: string; visitors: number }[];
  busiestDay: string | null;
};

/** Informe de visitantes (solo ventas pagadas o reservadas; las anuladas no cuentan). */
export function visitorReport(sales: (SaleLike & { visitDate: string })[], days: string[]): VisitorReport {
  const valid = sales.filter((s) => s.status !== "VOID");
  const sum = <K extends string>(key: (s: SaleLike & { visitDate: string }) => K, val: (s: SaleLike) => number) => {
    const m = new Map<K, number>();
    valid.forEach((s) => m.set(key(s), (m.get(key(s)) ?? 0) + val(s)));
    return m;
  };
  const dayV = sum((s) => s.visitDate, (s) => s.visitors);
  const dayR = sum((s) => s.visitDate, (s) => (s.status === "PAID" ? s.total : 0));
  const types = new Map<string, { visitors: number; revenue: number }>();
  valid.forEach((s) =>
    s.lines.forEach((l) => {
      const t = types.get(l.name) ?? { visitors: 0, revenue: 0 };
      t.visitors += l.qty;
      t.revenue += s.status === "PAID" ? l.qty * l.unitPrice : 0;
      types.set(l.name, t);
    }),
  );
  const kinds = sum((s) => s.kind, (s) => s.visitors);
  const slots = sum((s) => s.slot, (s) => s.visitors);
  const byDay = days.map((day) => ({ day, visitors: dayV.get(day) ?? 0, revenue: dayR.get(day) ?? 0 }));
  const top = [...byDay].sort((a, b) => b.visitors - a.visitors)[0];
  return {
    visitors: valid.reduce((a, s) => a + s.visitors, 0),
    revenue: valid.filter((s) => s.status === "PAID").reduce((a, s) => a + s.total, 0),
    sales: valid.length,
    byDay,
    byType: [...types].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.visitors - a.visitors),
    byKind: [...kinds].map(([kind, visitors]) => ({ kind, label: saleKindLabel(kind), visitors })).sort((a, b) => b.visitors - a.visitors),
    bySlot: [...slots].map(([slot, visitors]) => ({ slot, visitors })).sort((a, b) => a.slot.localeCompare(b.slot)),
    busiestDay: top && top.visitors > 0 ? top.day : null,
  };
}
