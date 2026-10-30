/**
 * Series diarias de ingresos y gastos en horario de Bogotá, para los
 * minigráficos de las tarjetas y el gráfico de barras. Pura y probada: el
 * servidor trae las filas de la ventana y aquí se agrupan por día.
 */

export type SeriesDay = {
  /** YYYY-MM-DD en Bogotá. */
  day: string;
  income: number;
  expenses: number;
  /** Movimientos del día (cobros + gastos): distingue «sin movimientos» de un día con cifras. */
  count: number;
};

export type SeriesHour = { hour: number; income: number; expenses: number };

export type FinanceSeries = {
  days: SeriesDay[];
  /** Solo con `days: 1`: hoy por hora (Bogotá), de `HOURS_FROM` a `HOURS_TO`. */
  hours?: SeriesHour[];
  /** Totales del periodo pedido (los últimos `days` días, hoy incluido). */
  current: { income: number; expenses: number; balance: number; count: number };
  /** Mismos totales del periodo inmediatamente anterior, para la variación. */
  previous: { income: number; expenses: number; balance: number; count: number };
};

const DAY_MS = 86_400_000;
export const HOURS_FROM = 6;
export const HOURS_TO = 21;
const bogotaHour = new Intl.DateTimeFormat("en-US", { timeZone: "America/Bogota", hour: "numeric", hourCycle: "h23" });
const bogotaDay = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Bogota",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Clave YYYY-MM-DD del día en Bogotá. */
export function bogotaDayKey(at: Date | string | number): string {
  return bogotaDay.format(new Date(at));
}

/** Claves de los últimos `count` días (el último es hoy), en orden. */
export function lastBogotaDays(count: number, now: Date = new Date()): string[] {
  const keys: string[] = [];
  for (let i = count - 1; i >= 0; i--) keys.push(bogotaDayKey(now.getTime() - i * DAY_MS));
  return keys;
}

type Row = { amount: number; at: Date | string | number };

/**
 * Agrupa pagos (ingresos) y gastos por día de Bogotá. `days` define el
 * periodo actual; las filas del periodo anterior (mismo largo) solo suman a
 * `previous`. Lo que caiga fuera de ambos periodos se ignora.
 */
export function buildFinanceSeries(
  input: { payments: Row[]; expenses: Row[]; days: number },
  now: Date = new Date(),
): FinanceSeries {
  const currentKeys = lastBogotaDays(input.days, now);
  const previousKeys = new Set(lastBogotaDays(input.days * 2, now).slice(0, input.days));
  const byDay = new Map(currentKeys.map((day) => [day, { day, income: 0, expenses: 0, count: 0 }]));
  const current = { income: 0, expenses: 0, balance: 0, count: 0 };
  const previous = { income: 0, expenses: 0, balance: 0, count: 0 };

  for (const p of input.payments) {
    const key = bogotaDayKey(p.at);
    const bucket = byDay.get(key);
    if (bucket) {
      bucket.income += p.amount;
      bucket.count += 1;
      current.income += p.amount;
      current.count += 1;
    } else if (previousKeys.has(key)) {
      previous.income += p.amount;
      previous.count += 1;
    }
  }
  for (const e of input.expenses) {
    const key = bogotaDayKey(e.at);
    const bucket = byDay.get(key);
    if (bucket) {
      bucket.expenses += e.amount;
      bucket.count += 1;
      current.expenses += e.amount;
    } else if (previousKeys.has(key)) {
      previous.expenses += e.amount;
    }
  }
  current.balance = current.income - current.expenses;
  previous.balance = previous.income - previous.expenses;
  if (input.days !== 1) return { days: [...byDay.values()], current, previous };

  // Hoy por hora: lo de antes de HOURS_FROM cae en la primera hora y lo de
  // después de HOURS_TO en la última, para no perder nada del día.
  const today = currentKeys[0];
  const hours: SeriesHour[] = [];
  for (let h = HOURS_FROM; h <= HOURS_TO; h++) hours.push({ hour: h, income: 0, expenses: 0 });
  const slot = (at: Row["at"]) => {
    const h = Number(bogotaHour.format(new Date(at)));
    return hours[Math.max(HOURS_FROM, Math.min(HOURS_TO, h)) - HOURS_FROM];
  };
  for (const p of input.payments) if (bogotaDayKey(p.at) === today) slot(p.at).income += p.amount;
  for (const e of input.expenses) if (bogotaDayKey(e.at) === today) slot(e.at).expenses += e.amount;
  return { days: [...byDay.values()], hours, current, previous };
}

/** Saldo acumulado día a día (para la tendencia del balance). */
export function runningBalance(days: SeriesDay[]): number[] {
  let acc = 0;
  return days.map((d) => (acc += d.income - d.expenses));
}

/** Serie acumulada de altas (clientes) por día, partiendo de `base`. */
export function cumulativeByDay(base: number, createdAt: (string | Date)[], days: string[]): number[] {
  const perDay = new Map(days.map((d) => [d, 0]));
  for (const at of createdAt) {
    const key = bogotaDayKey(at);
    if (perDay.has(key)) perDay.set(key, (perDay.get(key) ?? 0) + 1);
  }
  let acc = base;
  return days.map((d) => (acc += perDay.get(d) ?? 0));
}

/* --- Cubos de la gráfica: día, semana o mes ---------------------------------- */

export type Granularity = "dia" | "semana" | "mes";
export const GRANULARITIES: readonly Granularity[] = ["dia", "semana", "mes"];

/**
 * - `data`: hubo movimientos.
 * - `empty`: el negocio ya existía y no hubo movimientos (una barra en cero es un dato real).
 * - `nodata`: el negocio aún no existía (no se dibuja como un cero: no hay información).
 */
export type BucketState = "data" | "empty" | "nodata";

export type ChartBucket = {
  /** Primer y último día del cubo (YYYY-MM-DD, Bogotá). */
  from: string;
  to: string;
  /** Etiqueta corta del eje y título largo del tooltip. */
  label: string;
  full: string;
  income: number;
  expenses: number;
  count: number;
  state: BucketState;
};

const cap = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
const noon = (day: string) => new Date(`${day}T12:00:00Z`);
const fmt = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("es-CO", { timeZone: "UTC", ...options });
const weekdayShort = fmt({ weekday: "short" });
const dayLong = fmt({ weekday: "long", day: "numeric", month: "short" });
const dayMonth = fmt({ day: "numeric", month: "short" });
const monthShort = fmt({ month: "short" });
const monthLong = fmt({ month: "long", year: "numeric" });

/** Lunes de la semana que contiene `day` (YYYY-MM-DD). */
export function weekStart(day: string): string {
  const date = noon(day);
  const back = (date.getUTCDay() + 6) % 7; // lunes = 0
  return new Date(date.getTime() - back * DAY_MS).toISOString().slice(0, 10);
}

const addDays = (day: string, n: number) => new Date(noon(day).getTime() + n * DAY_MS).toISOString().slice(0, 10);

function stateOf(count: number, lastDay: string, firstDay: string | null): BucketState {
  if (firstDay && lastDay < firstDay) return "nodata";
  return count > 0 ? "data" : "empty";
}

/**
 * Agrupa los días en cubos de la gráfica. `firstDay` (el día en que el negocio
 * empezó a tener datos, p. ej. su creación) separa «sin datos» de «sin
 * movimientos». Los cubos de semana y de mes son los del calendario (lunes a
 * domingo; mes completo), y el primero puede ser parcial.
 */
export function chartBuckets(days: SeriesDay[], granularity: Granularity, firstDay: string | null, weekdayLabels = days.length <= 7): ChartBucket[] {
  if (granularity === "dia") {
    return days.map((d) => ({
      from: d.day,
      to: d.day,
      label: weekdayLabels ? cap(weekdayShort.format(noon(d.day))).replace(".", "") : String(Number(d.day.slice(8))),
      full: cap(dayLong.format(noon(d.day))),
      income: d.income,
      expenses: d.expenses,
      count: d.count,
      state: stateOf(d.count, d.day, firstDay),
    }));
  }
  const groups = new Map<string, SeriesDay[]>();
  for (const d of days) {
    const key = granularity === "semana" ? weekStart(d.day) : d.day.slice(0, 7);
    groups.set(key, [...(groups.get(key) ?? []), d]);
  }
  return [...groups.entries()].map(([key, items]) => {
    const from = items[0]!.day;
    const to = items.at(-1)!.day;
    const count = items.reduce((sum, d) => sum + d.count, 0);
    const label = granularity === "semana" ? dayMonth.format(noon(key)).replace(".", "") : cap(monthShort.format(noon(from))).replace(".", "");
    const full =
      granularity === "semana"
        ? `Semana del ${dayMonth.format(noon(from))} al ${dayMonth.format(noon(to))}`
        : cap(monthLong.format(noon(from)));
    return {
      from,
      to,
      label,
      full,
      income: items.reduce((sum, d) => sum + d.income, 0),
      expenses: items.reduce((sum, d) => sum + d.expenses, 0),
      count,
      state: stateOf(count, to, firstDay),
    };
  });
}

/** Días de historia que pide cada vista (la de día sigue el periodo elegido). */
export const HISTORY_DAYS: Record<Exclude<Granularity, "dia">, number> = { semana: 84, mes: 365 };

/** Inicio (UTC) y fin exclusivo de un rango de días de Bogotá (UTC−5, sin horario de verano). */
export function bogotaRange(from: string, to: string): { start: Date; end: Date } {
  return { start: new Date(`${from}T00:00:00-05:00`), end: new Date(new Date(`${to}T00:00:00-05:00`).getTime() + DAY_MS) };
}

export { addDays };
