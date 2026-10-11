/**
 * Motor Lean (construcción) — Last Planner System, Nivel 1.
 *
 * Matemática pura y testeable:
 *  - PPC (Percent Plan Complete) sobre compromisos evaluados.
 *  - Distribución CNC (Causas de No Cumplimiento) sobre compromisos fallidos.
 *  - Helpers de semana/fecha en calendario Bogotá.
 *
 * Este módulo NO depende de la base de datos ni de `Temporal`: puede importarse
 * desde componentes cliente sin arrastrar el driver de Prisma. Las conversiones
 * a/desde `Temporal.Instant` viven en `lib/tenant-db.ts`.
 *
 * Convención de dominio (importante):
 *  - `LookaheadTask.weekNumber` es una semana RELATIVA (1..6) dentro de la
 *    ventana móvil anclada en `ProjectPlan.windowStartDate`.
 *  - `WeeklyCommitment.weekNumber` + `year` es la semana CALENDARIO ISO-8601 y
 *    su año ISO (puede diferir del año natural en los bordes de enero).
 *  No confundir ambos conceptos.
 */

/** Ancho de la ventana Lookahead (semanas). */
export const WINDOW_WEEKS = 6;

/** Meta de PPC por defecto (porcentaje). Configurable por plan. */
export const PPC_TARGET_DEFAULT = 85;

/** Zona horaria operativa. */
export const BOGOTA_TIME_ZONE = "America/Bogota";

// ---------------------------------------------------------------------------
// Catálogos (espejo de los enums del contrato Prisma)
// ---------------------------------------------------------------------------

/** Estados de un compromiso semanal (resultado evaluado). */
export const COMMITMENT_STATUSES = [
  { value: "PENDING", label: "Pendiente" },
  { value: "COMPLETED", label: "Cumplido" },
  { value: "FAILED", label: "No cumplido" },
] as const;
export type CommitmentStatusValue = (typeof COMMITMENT_STATUSES)[number]["value"];

export function commitmentStatusLabel(status: CommitmentStatusValue): string {
  return COMMITMENT_STATUSES.find((o) => o.value === status)?.label ?? status;
}

export function isValidCommitmentStatus(
  raw: string,
): raw is CommitmentStatusValue {
  return COMMITMENT_STATUSES.some((o) => o.value === raw);
}

/** Causas de no cumplimiento (CNC). */
export const NON_COMPLIANCE_CAUSES = [
  { value: "WEATHER", label: "Clima" },
  { value: "MATERIALS", label: "Materiales" },
  { value: "LABOR", label: "Mano de obra" },
  { value: "EQUIPMENT", label: "Equipos" },
  { value: "DESIGN_CHANGE", label: "Cambio de diseño" },
  { value: "PREVIOUS_WORK", label: "Trabajo previo" },
  { value: "OTHER", label: "Otra" },
] as const;
export type NonComplianceCauseValue =
  (typeof NON_COMPLIANCE_CAUSES)[number]["value"];

export function nonComplianceCauseLabel(
  cause: NonComplianceCauseValue | null | undefined,
): string {
  if (!cause) {
    return "Sin causa registrada";
  }
  return NON_COMPLIANCE_CAUSES.find((o) => o.value === cause)?.label ?? cause;
}

export function isValidNonComplianceCause(
  raw: string,
): raw is NonComplianceCauseValue {
  return NON_COMPLIANCE_CAUSES.some((o) => o.value === raw);
}

// ---------------------------------------------------------------------------
// Fechas (día calendario en America/Bogota) — sin Temporal
// ---------------------------------------------------------------------------

/** Día de calendario (sin hora ni zona). */
export type PlainDate = { year: number; month: number; day: number };

const MS_PER_DAY = 86_400_000;

const bogotaDayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: BOGOTA_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Normaliza Date / string ISO (Temporal o JS) a `Date`; null si inválido. */
function toJsDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value !== "string") {
    return null;
  }
  // Temporal.Instant.toString() puede traer 9 dígitos fraccionarios; JS Date
  // solo acepta hasta 3.
  const normalized = value.replace(/(\.\d{3})\d+/, "$1");
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Día de calendario Bogotá de un instante (por defecto, ahora). */
export function bogotaToday(instant?: unknown): PlainDate {
  const date = instant === undefined ? new Date() : toJsDate(instant);
  const safe = date ?? new Date();
  const iso = bogotaDayFormatter.format(safe); // "YYYY-MM-DD"
  const [year, month, day] = iso.split("-").map(Number);
  return { year, month, day };
}

/** "YYYY-MM-DD" */
export function formatPlainDate(date: PlainDate): string {
  const mm = String(date.month).padStart(2, "0");
  const dd = String(date.day).padStart(2, "0");
  return `${date.year}-${mm}-${dd}`;
}

/** Parsea "YYYY-MM-DD"; null si no es una fecha válida. */
export function parsePlainDate(raw: unknown): PlainDate | null {
  if (typeof raw !== "string") {
    return null;
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.trim());
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() + 1 !== month ||
    probe.getUTCDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
}

/** Suma (o resta) días a una fecha de calendario. */
export function addDays(date: PlainDate, days: number): PlainDate {
  const base = Date.UTC(date.year, date.month - 1, date.day);
  const shifted = new Date(base + days * MS_PER_DAY);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

/** Días completos entre dos fechas (b − a). */
export function daysBetween(a: PlainDate, b: PlainDate): number {
  const from = Date.UTC(a.year, a.month - 1, a.day);
  const to = Date.UTC(b.year, b.month - 1, b.day);
  return Math.round((to - from) / MS_PER_DAY);
}

/** Lunes de la semana a la que pertenece `date`. */
export function mondayOf(date: PlainDate): PlainDate {
  const base = Date.UTC(date.year, date.month - 1, date.day);
  const jsDay = new Date(base).getUTCDay(); // 0=domingo .. 6=sábado
  const offset = (jsDay + 6) % 7; // lunes = 0
  return addDays(date, -offset);
}

/**
 * Semana ISO-8601 y año ISO de una fecha. El jueves de la semana determina
 * tanto la semana como el año ISO (por eso existen semanas del año siguiente
 * en los últimos días de diciembre).
 */
export function isoWeekOf(date: PlainDate): { year: number; week: number } {
  const thursday = addDays(mondayOf(date), 3);
  const isoYear = thursday.year;
  const firstThursday = addDays(mondayOf({ year: isoYear, month: 1, day: 4 }), 3);
  const week = 1 + daysBetween(firstThursday, thursday) / 7;
  return { year: isoYear, week };
}

/**
 * Semana RELATIVA de una fecha dentro de la ventana Lookahead anclada en
 * `windowStart` (lunes de la semana relativa 1): puede dar ≤ 0 o > 6.
 */
export function relativeWeekNumber(
  windowStart: PlainDate,
  date: PlainDate,
): number {
  return Math.floor(daysBetween(windowStart, date) / 7) + 1;
}

/** Fechas (lunes inicio, domingo fin) de una semana relativa de la ventana. */
export function weekWindowDates(
  windowStart: PlainDate,
  weekNumber: number,
): { start: PlainDate; end: PlainDate } {
  const start = addDays(windowStart, (weekNumber - 1) * 7);
  return { start, end: addDays(start, 6) };
}

/** Lunes de la semana operativa actual (America/Bogota). */
export function currentWindowStart(now: Date = new Date()): PlainDate {
  return mondayOf(bogotaToday(now));
}

// ---------------------------------------------------------------------------
// Métricas
// ---------------------------------------------------------------------------

/** PPC calculado sobre compromisos evaluados (excluye pendientes). */
export type PpcResult = {
  total: number;
  completed: number;
  failed: number;
  pending: number;
  /** Evaluados = cumplidos + no cumplidos. */
  evaluated: number;
  /** completed / evaluated × 100, entero; 0 si no hay evaluados. */
  ppc: number;
};

/**
 * PPC = (compromisos cumplidos / compromisos evaluados) × 100. Los compromisos
 * `PENDING` NO entran en el cierre semanal (no se evalúan todavía). Para un
 * período sin evaluados, PPC = 0.
 */
export function calculatePpc(
  commitments: ReadonlyArray<{ status: CommitmentStatusValue }>,
): PpcResult {
  let completed = 0;
  let failed = 0;
  for (const c of commitments) {
    if (c.status === "COMPLETED") {
      completed += 1;
    } else if (c.status === "FAILED") {
      failed += 1;
    }
  }
  const total = commitments.length;
  const pending = total - completed - failed;
  const evaluated = completed + failed;
  const ppc = evaluated > 0 ? Math.round((completed / evaluated) * 100) : 0;
  return { total, completed, failed, pending, evaluated, ppc };
}

export type CncEntry = {
  /** `null` agrupa los fallos sin causa registrada. */
  cause: NonComplianceCauseValue | null;
  label: string;
  count: number;
  percentage: number;
};

export type CncBreakdown = {
  total: number;
  entries: CncEntry[];
};

/**
 * Distribución CNC: agrupa los compromisos con `status = FAILED` por causa.
 * Los fallos sin causa se agrupan como "Sin causa registrada" (`cause: null`).
 * Ordenado por cantidad descendente; desempate por orden del catálogo.
 * Un período sin fallos devuelve `{ total: 0, entries: [] }`.
 */
export function getNonComplianceBreakdown(
  commitments: ReadonlyArray<{
    status: CommitmentStatusValue;
    failureCause: NonComplianceCauseValue | null;
  }>,
): CncBreakdown {
  const failed = commitments.filter((c) => c.status === "FAILED");
  const total = failed.length;

  const counts = new Map<string, number>();
  for (const c of failed) {
    const key = c.failureCause ?? "__NONE__";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const orderOf = (key: string): number => {
    if (key === "__NONE__") {
      return NON_COMPLIANCE_CAUSES.length + 1;
    }
    const i = NON_COMPLIANCE_CAUSES.findIndex((o) => o.value === key);
    return i === -1 ? NON_COMPLIANCE_CAUSES.length : i;
  };

  const entries: CncEntry[] = [...counts.entries()]
    .map(([key, count]) => {
      const cause =
        key === "__NONE__" ? null : (key as NonComplianceCauseValue);
      return {
        cause,
        label: nonComplianceCauseLabel(cause),
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      };
    })
    .sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count;
      }
      return orderOf(a.cause ?? "__NONE__") - orderOf(b.cause ?? "__NONE__");
    });

  return { total, entries };
}

/** Resumen para los KPI del Lookahead. */
export function summarizeLookahead(
  tasks: ReadonlyArray<{ isRestricted: boolean; weekNumber: number }>,
  currentWeek = 1,
): { total: number; restricted: number; inCurrentWeek: number } {
  return {
    total: tasks.length,
    restricted: tasks.filter((t) => t.isRestricted).length,
    inCurrentWeek: tasks.filter((t) => t.weekNumber === currentWeek).length,
  };
}

/** Filtra compromisos de una semana calendario ISO concreta. */
export function commitmentsOfWeek<
  T extends { weekNumber: number; year: number },
>(commitments: ReadonlyArray<T>, weekNumber: number, year: number): T[] {
  return commitments.filter(
    (c) => c.weekNumber === weekNumber && c.year === year,
  );
}

/** Etiqueta "W41 · 2026" para una semana ISO. */
export function isoWeekLabel(weekNumber: number, year: number): string {
  return `W${weekNumber} · ${year}`;
}
