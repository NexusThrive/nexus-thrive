import { and, or } from "@prisma/orm-postgres/orm-client";
import { db } from "@/prisma/db";
import { formatDateShort, formatDateTime, toNumber } from "@/lib/format";
import {
  DEFAULT_MODULES_BY_VERTICAL,
  type VerticalValue,
} from "@/lib/admin-catalogs";
import { paymentMethodLabel, paymentStatusLabel } from "@/lib/finance";
import type {
  PaymentMethodValue,
  PaymentStatusValue,
} from "@/lib/finance";
import {
  EXPIRING_WINDOW_DAYS,
  MEMBERSHIP_STATUSES,
  computeMembershipStatus,
  plusDays,
  typeLabel,
} from "@/lib/memberships";
import type {
  MembershipPaymentEntry,
  MembershipStatusValue,
  MembershipTypeValue,
} from "@/lib/memberships";
import {
  AIU_DEFAULTS,
  activityUnitCost,
  apuItemCategoryToResourceType,
  buildApuSnapshot,
  calculateBudgetTotals,
  calculateItemTotal,
  calculateQuoteTotals,
  componentCost,
  currentYearBogota,
  decimalToMicro,
  isStrictlyPositive,
  isValidPercent,
  lineTotal,
  moneyToString,
  resourceLineCostMicro,
  RESOURCE_TYPES,
  type ApuItemCategoryValue,
  type ApuSnapshot,
  type QuoteStatusValue,
  type QuoteTotals,
  type ResourceTypeValue,
} from "@/lib/apu-engine";
import {
  canTransitionProjectStatus,
  type ProjectStatusValue,
} from "@/lib/projects";
import {
  isUnchangedAiu,
  isUnchangedChapter,
  isUnchangedItem,
} from "@/lib/budget-guards";
import {
  addDays,
  bogotaToday,
  currentWindowStart,
  daysBetween,
  formatPlainDate,
  isoWeekOf,
  relativeWeekNumber,
  WINDOW_WEEKS,
  type CommitmentStatusValue,
  type NonComplianceCauseValue,
} from "@/lib/lean-engine";
import {
  normalizePhotoUrls,
  type FieldNoteTypeValue,
  type WeatherConditionValue,
} from "@/lib/field-log-engine";
import {
  type InformeCeroData,
  type WeeklyReportData,
  type BomResource,
} from "@/lib/report-engine";

/** Escapa los comodines de LIKE para que la búsqueda sea literal. */
function escapeLike(input: string): string {
  return input.replace(/[\\%_]/g, (char) => `\\${char}`);
}

export type CustomerSearchInput = {
  /** Texto libre (nombre, email o teléfono). */
  q?: string;
  /** `active` = clientes vigentes; `archived` = dados de baja. */
  status?: "active" | "archived";
  sort?: "recent" | "name_asc" | "name_desc";
  page?: number;
  pageSize?: number;
};

export type FinanceMetrics = {
  income: number;
  expenses: number;
  balance: number;
  byMethod: { method: PaymentMethodValue; total: number }[];
};

export type PaymentListInput = {
  q?: string;
  method?: PaymentMethodValue;
  status?: PaymentStatusValue;
  page?: number;
  limit?: number;
};

/** Fila serializable de pago (Decimal → number, Temporal → ISO string). */
export type PaymentRow = {
  id: string;
  customerId: string | null;
  customerName: string | null;
  customerEmail: string | null;
  amount: number;
  provider: PaymentMethodValue;
  status: PaymentStatusValue;
  providerRefId: string | null;
  description: string | null;
  createdAt: string;
};

export type ExpenseListInput = {
  q?: string;
  category?: string;
  page?: number;
  limit?: number;
};

/** Fila serializable de gasto. */
export type ExpenseRow = {
  id: string;
  description: string;
  category: string;
  amount: number;
  date: string;
  createdAt: string;
};

export type RecentActivityRow = {
  id: string;
  type: "payment" | "expense";
  title: string;
  description: string;
  amount: number;
  date: string;
};

export type MembershipListInput = {
  /** Texto libre contra nombre/teléfono/email del cliente. */
  q?: string;
  /** Estado DINÁMICO (calculado desde `endDate`), no el persistido. */
  status?: MembershipStatusValue;
  type?: MembershipTypeValue;
  page?: number;
  limit?: number;
};

/** Fila serializable de membresía (Decimal → number, Temporal → ISO). */
export type MembershipRow = {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  type: MembershipTypeValue;
  status: MembershipStatusValue;
  price: number;
  startDate: string;
  endDate: string;
  createdAt: string;
};

/** Detalle de membresía con historial de cobros (Json). */
export type MembershipDetail = MembershipRow & {
  payments: MembershipPaymentEntry[];
};

export type MembershipMetrics = {
  activeCount: number;
  expiringCount: number;
  expiredCount: number;
  /** Suma de precios de membresías que vencen en el mes (Bogotá). */
  renewalRevenueProjection: number;
};

/** Estado general de la cuenta del cliente (Ficha 360°). */
export type CustomerAccountStatus =
  | "al_dia"
  | "pendiente"
  | "vencido"
  | "sin_actividad"
  | "sin_datos";

/** Información general del cliente, serializada para la UI. */
export type Customer360Profile = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

/** Fila serializable de pago dentro de la ficha 360°. */
export type Customer360Payment = {
  id: string;
  amount: number;
  status: PaymentStatusValue;
  provider: PaymentMethodValue;
  providerRefId: string | null;
  description: string | null;
  createdAt: string;
};

/** Fila serializable de membresía (estado DINÁMICO desde `endDate`). */
export type Customer360Membership = {
  id: string;
  type: MembershipTypeValue;
  status: MembershipStatusValue;
  price: number;
  startDate: string;
  endDate: string;
  createdAt: string;
};

/** Nota interna serializable (autor resuelto en el servidor). */
export type Customer360Note = {
  id: string;
  content: string;
  authorName: string | null;
  createdAt: string;
};

/**
 * Evento tipado del timeline unificado de la ficha 360°.
 * Adaptado al schema real: solo existen Payment, Membership y CustomerNote
 * (no hay modelos Order/Booking en el contrato).
 */
export type CustomerTimelineEvent = {
  id: string;
  type: "payment" | "membership" | "note";
  /** ISO (Temporal.Instant serializado); la UI formatea en America/Bogota. */
  date: string;
  title: string;
  description?: string;
  amount?: number;
  status?: string;
};

/** Métricas calculadas con datos reales del tenant + cliente. */
export type Customer360Metrics = {
  /** SUM de pagos APPROVED del cliente (LTV). */
  ltv: number;
  approvedCount: number;
  avgTicket: number;
  favoriteMethod: PaymentMethodValue | null;
  lastActivityDate: string | null;
  accountStatus: CustomerAccountStatus;
};

/** Todo lo que necesita la vista 360° (serializable, scoped al tenant). */
export type Customer360Details = {
  customer: Customer360Profile;
  /** Últimos 200 pagos, descendente por fecha. */
  payments: Customer360Payment[];
  paymentsTotal: number;
  /** Últimas 100 membresías, descendente por inicio. */
  memberships: Customer360Membership[];
  /** Últimas 100 notas, descendente por fecha. */
  notes: Customer360Note[];
  timeline: CustomerTimelineEvent[];
  metrics: Customer360Metrics;
};

/* ------------------------------------------------------------------ */
/* Módulo Construcción & APU                                           */
/* ------------------------------------------------------------------ */

export type ApuListInput = {
  q?: string;
  category?: ApuItemCategoryValue;
  /** Filtro por unidad exacta (p. ej. "M2"). */
  unit?: string;
  /** `true` = vigentes; `false` = archivados; omitido = todos. */
  active?: boolean;
  page?: number;
  limit?: number;
};

/** Entrada del listado paginado de actividades. */
export type ApuActivityListInput = {
  q?: string;
  /** Filtro por unidad exacta (p. ej. "M2"). */
  unit?: string;
  /** `true` = vigentes; `false` = archivadas; omitido = todas. */
  active?: boolean;
  page?: number;
  limit?: number;
};

/** Fila serializable del banco de insumos (Decimal → string, Temporal → ISO). */
export type ApuItemRow = {
  id: string;
  code: string | null;
  name: string;
  unit: string;
  category: ApuItemCategoryValue;
  unitPrice: string;
  active: boolean;
  imageUrl: string | null;
  updatedAt: string;
};

/** Actividad APU con costo unitario calculado en el servidor. */
export type ApuActivityRow = {
  id: string;
  code: string | null;
  name: string;
  unit: string;
  description: string | null;
  /** Σ componentes (precios + rendimientos actuales del banco). */
  unitCost: string;
  itemCount: number;
  active: boolean;
  updatedAt: string;
};

/** Insumo dentro de la composición de una actividad (con su costo). */
export type ApuCompositionRow = {
  id: string;
  itemId: string;
  itemCode: string | null;
  itemName: string;
  itemUnit: string;
  category: ApuItemCategoryValue;
  unitPrice: string;
  consumption: string;
  wastePercent: string;
  /** Precio × consumo × (1 + desperdicio/100) — motor Decimal del servidor. */
  cost: string;
};

/** Detalle completo de una actividad (para consulta de composición). */
export type ApuActivityDetail = ApuActivityRow & {
  compositions: ApuCompositionRow[];
};

export type QuoteListInput = {
  q?: string;
  status?: QuoteStatusValue;
  page?: number;
  limit?: number;
};

/** Fila serializable de presupuesto (lista). */
export type QuoteRow = {
  id: string;
  code: string;
  title: string;
  customerId: string | null;
  customerName: string | null;
  status: QuoteStatusValue;
  directCost: string;
  totalAmount: string;
  createdAt: string;
};

/** Métricas de la portada del módulo (datos reales de PostgreSQL). */
export type QuoteMetrics = {
  total: number;
  approved: number;
  draft: number;
  /** Suma de totales de todos los presupuestos del tenant. */
  totalAmount: number;
};

/** Actividad dentro de un presupuesto (congelada al cotizar). */
export type QuoteItemRow = {
  id: string;
  activityId: string | null;
  name: string;
  unit: string;
  quantity: string;
  unitCost: string;
  totalCost: string;
  apuSnapshot: ApuSnapshot | null;
};

/** Detalle completo de un presupuesto (AIU re-derivado del servidor). */
export type QuoteDetail = {
  id: string;
  code: string;
  title: string;
  customerId: string | null;
  customerName: string | null;
  status: QuoteStatusValue;
  adminPercent: string;
  imprevPercent: string;
  utilPercent: string;
  taxPercent: string;
  directCost: string;
  administration: string;
  contingency: string;
  utility: string;
  subtotal: string;
  tax: string;
  totalAmount: string;
  createdAt: string;
  updatedAt: string;
  items: QuoteItemRow[];
};

/** Fila serializable de proyecto (lista). */
export type ProjectRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  customerId: string;
  customerName: string;
  status: ProjectStatusValue;
  createdAt: string;
  updatedAt: string;
};

/** Métricas de la portada del módulo Proyectos (datos reales). */
export type ProjectMetrics = {
  total: number;
  inExecution: number;
  approved: number;
  completed: number;
};

/** Forma serializable del ProjectHeader (ficha del proyecto). */
export type ProjectHeaderData = {
  clientTaxName: string | null;
  clientTaxId: string | null;
  clientTaxDv: string | null;
  clientAddress: string | null;
  clientCity: string | null;
  clientBillingEmail: string | null;
  legalRepName: string | null;
  siteAddress: string | null;
  siteCity: string | null;
  siteDepartment: string | null;
  projectType: string | null;
  siteAccessNotes: string | null;
  technicalContact: string | null;
  technicalPhone: string | null;
  projectLeaderName: string | null;
  projectLeaderProfessionalId: string | null;
  supervisorName: string | null;
};

/** Payload de actualización de la ficha (todos los campos opcionales). */
export type ProjectHeaderInput = Partial<ProjectHeaderData>;

/** Detalle de proyecto: cabecera + ficha (ProjectHeader). */
export type ProjectDetail = ProjectRow & {
  header: ProjectHeaderData | null;
};

export type ProjectListInput = {
  q?: string;
  status?: ProjectStatusValue;
  page?: number;
  limit?: number;
};

/**
 * Actualización del proyecto (Etapa 1, ajuste C). `name`/`description` son
 * última-escritura-gana; el cambio de estado usa compare-and-set: solo se
 * aplica si el estado en BD sigue siendo `expectedStatus`.
 */
export type UpdateProjectInput = {
  name?: string;
  description?: string | null;
  /** Estado que el usuario vio al pedir la transición (token CAS). */
  expectedStatus?: ProjectStatusValue;
  /** Estado destino. */
  status?: ProjectStatusValue;
};

/* ------------------------------------------------------------------ */
/* Presupuesto de proyecto (FASE 2 — Tab 2)                            */
/* ------------------------------------------------------------------ */

export type BudgetResourceData = {
  id: string;
  type: ResourceTypeValue;
  name: string;
  unit: string;
  performance: string;
  unitPrice: string;
  totalPrice: string;
  imageUrl: string | null;
  /** Porcentaje de desperdicio de esta línea (micro, 1_000_000 = 100%). Default 0. */
  wastePct: string;
};

export type BudgetItemData = {
  id: string;
  order: number;
  code: string;
  description: string;
  unit: string;
  quantity: string;
  unitCostDirect: string;
  totalCostDirect: string;
  /** Porcentaje de desperdicio (micro, 1_000_000 = 100%). Default 0. */
  wastePct: string;
  resources: BudgetResourceData[];
};

export type BudgetChapterData = {
  id: string;
  order: number;
  name: string;
  description: string | null;
  subtotal: string;
  items: BudgetItemData[];
};

export type ProjectBudgetData = {
  id: string;
  projectId: string;
  code: string;
  name: string;
  aiuAdminPct: string;
  aiuImprevPct: string;
  aiuUtilidadPct: string;
  ivaUtilidadPct: string;
  directCostTotal: string;
  adminTotal: string;
  imprevTotal: string;
  utilidadTotal: string;
  ivaUtilidadTotal: string;
  grandTotal: string;
  isLocked: boolean;
  revision: number;
  chapters: BudgetChapterData[];
};

/** Discrepancia entre un total persistido y el recalculado por el servidor. */
export type BudgetTotalsMismatch = {
  field: string;
  expected: string;
  found: string;
};

/** Resultado de `budgets.verifyTotals` (auditoría de integridad, solo lectura). */
export type BudgetTotalsCheck = {
  ok: boolean;
  directCostTotal: string;
  grandTotal: string;
  mismatches: BudgetTotalsMismatch[];
};

/** Línea base aprobada del presupuesto, serializada para el cliente. */
export type BudgetBaselineData = {
  id: string;
  version: number;
  budgetRevision: number;
  directCostTotal: string;
  adminTotal: string;
  imprevTotal: string;
  utilidadTotal: string;
  ivaUtilidadTotal: string;
  grandTotal: string;
  chapterCount: number;
  itemCount: number;
  note: string | null;
  approvedById: string;
  approvedByName: string;
  createdAt: string;
};

/** Porcentajes AIU ya convertidos a micro-fracción (100_000 = 10 %). */
export type AiuConfigInput = {
  adminPct: bigint;
  imprevPct: bigint;
  utilidadPct: bigint;
  ivaUtilidadPct: bigint;
};

export type CreateChapterInput = {
  name: string;
  description?: string;
};

export type CreateBudgetItemInput = {
  chapterId: string;
  code: string;
  description: string;
  unit: string;
  /** Cantidad en micro-unidades (1_000_000 = 1.000000). */
  quantity: bigint;
  /** Costo unitario directo en micro-pesos. */
  unitCostDirect: bigint;
};

export type UpdateChapterInput = {
  name: string;
  description?: string | null;
};

export type UpdateBudgetItemInput = {
  code: string;
  description: string;
  unit: string;
  /** Cantidad en micro-unidades (1_000_000 = 1.000000). */
  quantity: bigint;
  /** Costo unitario directo en micro-pesos. */
  unitCostDirect: bigint;
};

export type UpdateResourceInput = {
  /** Rendimiento en micro-unidades (1_000_000 = 1.000000). */
  performance: bigint;
  /** Desperdicio como fracción en micro (100_000 = 10 %). */
  wastePct: bigint;
};

/**
 * Fila de composición APU leída con su insumo mediante `include("item")`.
 * El driver de Prisma materializa los `Decimal` como strings y el insumo
 * puede faltar (`null`) si la fila quedó huérfana; el importador lo omite.
 */
type ImportCompositionRow = {
  activityId: string;
  item: {
    id: string;
    tenantId: string;
    name: string;
    unit: string;
    category: ApuItemCategoryValue;
    unitPrice: string;
    imageUrl: string | null;
  } | null;
  consumption: string;
  wastePercent: string;
};

/* ------------------------------------------------------------------ */
/* Planificador Lean — Last Planner System (FASE 3 — Tab 3)            */
/* ------------------------------------------------------------------ */

/** Tarea del Lookahead serializada (fechas como día calendario Bogotá). */
export type LookaheadTaskData = {
  id: string;
  code: string;
  description: string;
  /** Semana relativa dentro de la ventana (1..6). */
  weekNumber: number;
  /** "YYYY-MM-DD" (America/Bogota). */
  startDate: string;
  /** "YYYY-MM-DD" (America/Bogota). */
  endDate: string;
  responsible: string;
  isRestricted: boolean;
  notes: string | null;
};

/** Compromiso del plan de trabajo semanal serializado. */
export type WeeklyCommitmentData = {
  id: string;
  /** Semana calendario ISO-8601 (1..53). */
  weekNumber: number;
  /** Año ISO-8601. */
  year: number;
  description: string;
  responsible: string;
  status: CommitmentStatusValue;
  failureCause: NonComplianceCauseValue | null;
  failureNotes: string | null;
};

/** Plan Lean serializado: cabecera + tareas del Lookahead + compromisos. */
export type ProjectPlanData = {
  id: string;
  projectId: string;
  name: string;
  targetPpc: number;
  /** Lunes (día calendario Bogotá) de la semana relativa 1 de la ventana. */
  windowStart: string;
  lookaheadTasks: LookaheadTaskData[];
  commitments: WeeklyCommitmentData[];
};

export type CreateLookaheadTaskInput = {
  code: string;
  description: string;
  weekNumber: number;
  /** Día calendario Bogotá "YYYY-MM-DD". */
  startDate: string;
  endDate: string;
  responsible: string;
  isRestricted: boolean;
  notes?: string | null;
};

export type CreateCommitmentInput = {
  description: string;
  responsible: string;
  /** Lunes de la semana operativa a la que pertenece ("YYYY-MM-DD"). */
  weekStartDate: string;
};

export type UpdateCommitmentStatusInput = {
  status: CommitmentStatusValue;
  failureCause?: NonComplianceCauseValue | null;
  failureNotes?: string | null;
};

/* ------------------------------------------------------------------ */
/* Bitácora de Campo — FASE 4 (Tab 4)                                  */
/* ------------------------------------------------------------------ */

/** Anotación de bitácora serializada (fechas como día calendario Bogotá). */
export type FieldLogEntryData = {
  id: string;
  type: FieldNoteTypeValue;
  title: string;
  description: string;
  weather: WeatherConditionValue;
  laborCount: number;
  authorName: string;
  authorRole: string;
  photoUrls: string[];
  entryDate: string; // "YYYY-MM-DD" Bogotá
};

/** Bitácora serializada: cabecera + entradas. */
export type FieldLogData = {
  id: string;
  projectId: string;
  name: string;
  entries: FieldLogEntryData[];
};

export type CreateFieldLogEntryInput = {
  type: FieldNoteTypeValue;
  entryDate: string; // "YYYY-MM-DD" Bogotá
  title: string;
  description: string;
  weather: WeatherConditionValue;
  laborCount: number;
  authorName: string;
  authorRole: string;
  photoUrls: string[];
};

/** Fila mínima de `FieldLog` que necesita la serialización. */
type FieldLogRow = {
  id: string;
  projectId: string;
  name: string;
};

/** Fila mínima de `FieldLogEntry` que necesita la serialización. */
type FieldLogEntryRow = {
  id: string;
  type: FieldNoteTypeValue;
  entryDate: unknown;
  title: string;
  description: string;
  weather: WeatherConditionValue;
  laborCount: number;
  authorName: string;
  authorRole: string;
  photoUrls: string[];
};

async function loadFieldLog(log: FieldLogRow, tenantId: string): Promise<FieldLogData> {
  const entries = await db.orm.public.FieldLogEntry
    .where({ logId: log.id, tenantId })
    .orderBy((entry) => entry.entryDate.desc())
    .all();

  return {
    id: log.id,
    projectId: log.projectId,
    name: log.name,
    entries: entries.map((entry) => ({
      id: entry.id,
      type: entry.type as FieldNoteTypeValue,
      entryDate: instantToBogotaIsoDate(entry.entryDate),
      title: entry.title,
      description: entry.description,
      weather: entry.weather as WeatherConditionValue,
      laborCount: entry.laborCount,
      authorName: entry.authorName,
      authorRole: entry.authorRole,
      photoUrls: normalizePhotoUrls(entry.photoUrls),
    })),
  };
}

/** "YYYY-MM-DD" → Temporal.Instant 00:00 Bogotá. */
function bogotaInstantFromEntryDate(iso: string): Temporal.Instant {
  const [year, month, day] = iso.split("-").map(Number);
  return Temporal.Instant.fromEpochMilliseconds(
    Date.UTC(year, month - 1, day, 5, 0, 0),
  );
}

/** Fila mínima de `ProjectPlan` que necesita la serialización. */
type ProjectPlanRow = {
  id: string;
  projectId: string;
  name: string;
  targetPpc: number;
  windowStartDate: unknown;
};

/**
 * Convierte "YYYY-MM-DD" al `Temporal.Instant` de las 00:00 en America/Bogota
 * (UTC-5 fijo, sin horario de verano) — formato que exige el codec temporal de
 * Prisma 8 para escribir `timestamptz`.
 */
function bogotaInstantFromIsoDate(iso: string): Temporal.Instant {
  const [year, month, day] = iso.split("-").map(Number);
  return Temporal.Instant.fromEpochMilliseconds(
    Date.UTC(year, month - 1, day, 5, 0, 0),
  );
}

/** `Temporal.Instant` (o ISO) → día calendario "YYYY-MM-DD" en Bogotá. */
function instantToBogotaIsoDate(value: unknown): string {
  return formatPlainDate(bogotaToday(String(value)));
}

async function loadLeanPlan(plan: ProjectPlanRow): Promise<ProjectPlanData> {
  const [tasks, commitments] = await Promise.all([
    db.orm.public.LookaheadTask
      .where({ planId: plan.id })
      .orderBy((task) => task.weekNumber.asc())
      .all(),
    db.orm.public.WeeklyCommitment
      .where({ planId: plan.id })
      .orderBy((commitment) => commitment.weekNumber.asc())
      .all(),
  ]);

  commitments.sort((a, b) => {
    if (a.year !== b.year) {
      return b.year - a.year;
    }
    return a.weekNumber - b.weekNumber;
  });

  return {
    id: plan.id,
    projectId: plan.projectId,
    name: plan.name,
    targetPpc: plan.targetPpc,
    windowStart: instantToBogotaIsoDate(plan.windowStartDate),
    lookaheadTasks: tasks.map((task) => ({
      id: task.id,
      code: task.code,
      description: task.description,
      weekNumber: task.weekNumber,
      startDate: instantToBogotaIsoDate(task.startDate),
      endDate: instantToBogotaIsoDate(task.endDate),
      responsible: task.responsible,
      isRestricted: task.isRestricted,
      notes: task.notes,
    })),
    commitments: commitments.map((commitment) => ({
      id: commitment.id,
      weekNumber: commitment.weekNumber,
      year: commitment.year,
      description: commitment.description,
      responsible: commitment.responsible,
      status: commitment.status as CommitmentStatusValue,
      failureCause: commitment.failureCause as NonComplianceCauseValue | null,
      failureNotes: commitment.failureNotes,
    })),
  };
}

/** Fila mínima de `ProjectBudget` que necesita la capa de lectura/escritura. */
type BudgetRow = {
  id: string;
  tenantId: string;
  projectId: string;
  code: string;
  name: string;
  aiuAdminPct: bigint;
  aiuImprevPct: bigint;
  aiuUtilidadPct: bigint;
  ivaUtilidadPct: bigint;
  directCostTotal: bigint;
  adminTotal: bigint;
  imprevTotal: bigint;
  utilidadTotal: bigint;
  ivaUtilidadTotal: bigint;
  grandTotal: bigint;
  isLocked: boolean;
  revision: number;
};

/**
 * Concurrencia optimista: si el llamador aporta la revisión que vio, la
 * mutación se rechaza cuando el presupuesto ya cambió (`STALE_REVISION`).
 */
function assertRevision(
  budget: BudgetRow,
  expectedRevision?: number,
): void {
  if (expectedRevision !== undefined && budget.revision !== expectedRevision) {
    throw new Error("STALE_REVISION");
  }
}

/**
 * Avanza `revision` con compare-and-set DENTRO de la transacción de la
 * mutación: el WHERE exige la revisión leída al inicio. Si otro request
 * escribió el presupuesto entretanto (otra edición, un bloqueo), no se toca
 * la fila, se lanza `STALE_REVISION` y la transacción entera se revierte.
 * `assertRevision` solo compara contra lo que vio el cliente; esto cierra la
 * ventana entre esa lectura y la escritura. Devuelve la nueva revisión.
 */
async function bumpRevision(
  tx: TenantTx,
  budget: BudgetRow,
  patch: {
    isLocked?: boolean;
    aiuAdminPct?: bigint;
    aiuImprevPct?: bigint;
    aiuUtilidadPct?: bigint;
    ivaUtilidadPct?: bigint;
  } = {},
): Promise<number> {
  const next = budget.revision + 1;
  const updated = await tx.orm.public.ProjectBudget
    .where({ id: budget.id, revision: budget.revision })
    .updateAndCount({ ...patch, revision: next });
  if (updated !== 1) {
    throw new Error("STALE_REVISION");
  }
  return next;
}

/**
 * Fija la revisión leída sin avanzarla: un UPDATE no-op con la revisión en el
 * WHERE toma el lock de la fila, así que ninguna mutación concurrente puede
 * avanzarla hasta que esta transacción termine (y si ya lo hizo, falla con
 * `STALE_REVISION`). Para lecturas que deben ser una foto consistente de una
 * revisión concreta, como la línea base.
 */
async function lockRevision(tx: TenantTx, budget: BudgetRow): Promise<void> {
  const locked = await tx.orm.public.ProjectBudget
    .where({ id: budget.id, revision: budget.revision })
    .updateAndCount({ revision: budget.revision });
  if (locked !== 1) {
    throw new Error("STALE_REVISION");
  }
}

/* ------------------------------------------------------------------ */
/* Guardados sin cambios (Etapa 1)                                     */
/* ------------------------------------------------------------------ */

// Las guardas no-op viven en un módulo puro (lib/budget-guards.ts) para poder
// probarlas sin abrir conexión a base de datos.

/** Transacción de Prisma 8 (misma forma que el `db` pero ligada a la tx). */
type TenantTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Lee el presupuesto con su estructura completa (capítulos → ítems →
 * recursos), ordenada, con montos serializados a string (los `BigInt` no
 * cruzan el límite server/client de React).
 */
async function loadBudgetTree(budget: BudgetRow): Promise<ProjectBudgetData> {
  const chapters = await db.orm.public.BudgetChapter
    .where({ budgetId: budget.id })
    .orderBy((chapter) => chapter.order.asc())
    .all();
  const chapterIds = chapters.map((chapter) => chapter.id);

  const items = chapterIds.length
    ? await db.orm.public.BudgetItem
        .where((item) => item.chapterId.in(chapterIds))
        .orderBy((item) => item.order.asc())
        .all()
    : [];
  const itemIds = items.map((item) => item.id);

  const resources = itemIds.length
    ? await db.orm.public.BudgetItemResource
        .where((resource) => resource.itemId.in(itemIds))
        .select("id", "itemId", "type", "name", "unit", "performance", "unitPrice", "totalPrice", "imageUrl", "wastePct")
        .all()
    : [];

  const resourcesByItem = new Map<string, BudgetResourceData[]>();
  for (const resource of resources) {
    const list = resourcesByItem.get(resource.itemId) ?? [];
    list.push({
      id: resource.id,
      type: resource.type as ResourceTypeValue,
      name: resource.name,
      unit: resource.unit,
      performance: String(resource.performance),
      unitPrice: String(resource.unitPrice),
      totalPrice: String(resource.totalPrice),
      imageUrl: resource.imageUrl,
      wastePct: String(resource.wastePct),
    });
    resourcesByItem.set(resource.itemId, list);
  }
  // La tabla no guarda orden: se fija uno estable (tipo según RESOURCE_TYPES,
  // luego nombre) para que el APU no cambie de orden entre cargas.
  const typeRank = new Map<string, number>(
    RESOURCE_TYPES.map((option, index) => [option.value, index]),
  );
  for (const list of resourcesByItem.values()) {
    list.sort(
      (a, b) =>
        (typeRank.get(a.type) ?? 99) - (typeRank.get(b.type) ?? 99) ||
        a.name.localeCompare(b.name, "es"),
    );
  }

  const itemsByChapter = new Map<string, BudgetItemData[]>();
  for (const item of items) {
    const list = itemsByChapter.get(item.chapterId) ?? [];
    list.push({
      id: item.id,
      order: item.order,
      code: item.code,
      description: item.description,
      unit: item.unit,
      quantity: String(item.quantity),
      unitCostDirect: String(item.unitCostDirect),
      totalCostDirect: String(item.totalCostDirect),
      wastePct: String(item.wastePct),
      resources: resourcesByItem.get(item.id) ?? [],
    });
    itemsByChapter.set(item.chapterId, list);
  }

  const chapterData: BudgetChapterData[] = chapters.map((chapter) => {
    const chapterItems = itemsByChapter.get(chapter.id) ?? [];
    let subtotal = BigInt(0);
    for (const item of chapterItems) {
      subtotal += BigInt(item.totalCostDirect);
    }
    return {
      id: chapter.id,
      order: chapter.order,
      name: chapter.name,
      description: chapter.description,
      subtotal: subtotal.toString(),
      items: chapterItems,
    };
  });

  return {
    id: budget.id,
    projectId: budget.projectId,
    code: budget.code,
    name: budget.name,
    aiuAdminPct: budget.aiuAdminPct.toString(),
    aiuImprevPct: budget.aiuImprevPct.toString(),
    aiuUtilidadPct: budget.aiuUtilidadPct.toString(),
    ivaUtilidadPct: budget.ivaUtilidadPct.toString(),
    directCostTotal: budget.directCostTotal.toString(),
    adminTotal: budget.adminTotal.toString(),
    imprevTotal: budget.imprevTotal.toString(),
    utilidadTotal: budget.utilidadTotal.toString(),
    ivaUtilidadTotal: budget.ivaUtilidadTotal.toString(),
    grandTotal: budget.grandTotal.toString(),
    isLocked: budget.isLocked,
    revision: budget.revision,
    chapters: chapterData,
  };
}

/** Lector de filas: sirve tanto el cliente `db` como una transacción activa. */
type TenantReader = Pick<TenantTx, "orm">;

/** Suma de los costos directos de todas las partidas del presupuesto. */
async function sumBudgetDirect(
  tx: TenantReader,
  budgetId: string,
): Promise<bigint> {
  const chapters = await tx.orm.public.BudgetChapter
    .where({ budgetId })
    .select("id")
    .all();
  const chapterIds = chapters.map((chapter) => chapter.id);
  if (chapterIds.length === 0) {
    return BigInt(0);
  }
  const items = await tx.orm.public.BudgetItem
    .where((item) => item.chapterId.in(chapterIds))
    .select("totalCostDirect")
    .all();
  let total = BigInt(0);
  for (const item of items) {
    total += BigInt(item.totalCostDirect);
  }
  return total;
}

/**
 * Recalcula el costo directo desde las partidas reales y toda la cascada AIU
 * del presupuesto. El servidor NUNCA confía en totales del navegador.
 */
async function recalcBudgetTotals(
  tx: TenantTx,
  budgetId: string,
  pcts: { admin: bigint; imprev: bigint; utilidad: bigint; iva: bigint },
): Promise<void> {
  const direct = await sumBudgetDirect(tx, budgetId);
  const totals = calculateBudgetTotals(
    direct,
    pcts.admin,
    pcts.imprev,
    pcts.utilidad,
    pcts.iva,
  );
  await tx.orm.public.ProjectBudget.where({ id: budgetId }).update({
    directCostTotal: direct,
    adminTotal: totals.adminTotal,
    imprevTotal: totals.imprevTotal,
    utilidadTotal: totals.utilidadTotal,
    ivaUtilidadTotal: totals.ivaUtilidadTotal,
    grandTotal: totals.grandTotal,
  });
}

/** Subconjunto de columnas del ProjectHeader que serializamos. */
type ProjectHeaderRow = {
  clientTaxName: string | null;
  clientTaxId: string | null;
  clientTaxDv: string | null;
  clientAddress: string | null;
  clientCity: string | null;
  clientBillingEmail: string | null;
  legalRepName: string | null;
  siteAddress: string | null;
  siteCity: string | null;
  siteDepartment: string | null;
  projectType: string | null;
  siteAccessNotes: string | null;
  technicalContact: string | null;
  technicalPhone: string | null;
  projectLeaderName: string | null;
  projectLeaderProfessionalId: string | null;
  supervisorName: string | null;
};

function serializeProjectHeader(header: ProjectHeaderRow): ProjectHeaderData {
  return {
    clientTaxName: header.clientTaxName,
    clientTaxId: header.clientTaxId,
    clientTaxDv: header.clientTaxDv,
    clientAddress: header.clientAddress,
    clientCity: header.clientCity,
    clientBillingEmail: header.clientBillingEmail,
    legalRepName: header.legalRepName,
    siteAddress: header.siteAddress,
    siteCity: header.siteCity,
    siteDepartment: header.siteDepartment,
    projectType: header.projectType,
    siteAccessNotes: header.siteAccessNotes,
    technicalContact: header.technicalContact,
    technicalPhone: header.technicalPhone,
    projectLeaderName: header.projectLeaderName,
    projectLeaderProfessionalId: header.projectLeaderProfessionalId,
    supervisorName: header.supervisorName,
  };
}

/** Último ISO mayor (fecha ISO-8601 de ancho fijo: orden lexicográfico = cronológico). */
function maxIso(a: string | null, b: string | null): string | null {
  if (!a) {
    return b;
  }
  if (!b) {
    return a;
  }
  return a > b ? a : b;
}

const PAYMENT_METHOD_VALUES: PaymentMethodValue[] = [
  "CASH",
  "NEQUI",
  "WOMPI",
  "TRANSFER",
];

/**
 * Rango del mes en horario de Bogotá (UTC−5): inicio del mes y del
 * siguiente, como `Temporal.Instant` (codec obligatorio del driver).
 * Los registros se comparan con `>= start` y `< end`.
 */
function monthRangeBogota(year: number, month: number): {
  start: Temporal.Instant;
  end: Temporal.Instant;
} {
  // 05:00 UTC del día 1 = 00:00 en Bogotá (UTC−5). JS normaliza el
  // overflow: mes 12 → enero del año siguiente.
  const start = Temporal.Instant.fromEpochMilliseconds(
    Date.UTC(year, month - 1, 1, 5, 0, 0),
  );
  const end = Temporal.Instant.fromEpochMilliseconds(
    Date.UTC(year, month, 1, 5, 0, 0),
  );
  return { start, end };
}

/** Valida y normaliza un mes/año; por defecto usa el mes actual (Bogotá). */
function resolveMonthYear(month?: number, year?: number) {
  const now = new Date();
  // El día actual en Bogotá: DateTimeFormat con timeZone para no depender
  // de la zona horaria del servidor.
  const bogotaParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Bogota",
    month: "numeric",
    year: "numeric",
  }).formatToParts(now);
  const bogotaMonth = Number(
    bogotaParts.find((part) => part.type === "month")?.value,
  );
  const bogotaYear = Number(
    bogotaParts.find((part) => part.type === "year")?.value,
  );

  const resolvedMonth = month ?? bogotaMonth;
  const resolvedYear = year ?? bogotaYear;

  if (
    !Number.isInteger(resolvedMonth) ||
    resolvedMonth < 1 ||
    resolvedMonth > 12
  ) {
    throw new Error("Mes inválido para las métricas financieras.");
  }
  if (!Number.isInteger(resolvedYear) || resolvedYear < 2000 || resolvedYear > 2100) {
    throw new Error("Año inválido para las métricas financieras.");
  }

  return { month: resolvedMonth, year: resolvedYear };
}

/**
 * Notas de un cliente (serializadas, autor resuelto vía include).
 * Siempre scoped por `tenantId`; usado por la ficha 360° y por el
 * namespace `customerNotes`.
 */
async function listCustomerNotes(
  tenantId: string,
  customerId: string,
  limit = 100,
): Promise<Customer360Note[]> {
  const safeLimit = Math.min(200, Math.max(1, Math.trunc(limit)));
  const rows = await db.orm.public.CustomerNote
    .where({ tenantId, customerId })
    .orderBy((note) => note.createdAt.desc())
    .include("author", (author) => author.select("name"))
    .limit(safeLimit)
    .all();

  return rows.map((row) => ({
    id: row.id,
    content: row.content,
    authorName: row.author?.name ?? null,
    createdAt: String(row.createdAt),
  }));
}

/**
 * Detalle completo de una actividad APU (con composición y costos).
 * Helper de módulo: no depende del namespace, así `apu.createActivity`
 * y `apu.updateActivity` pueden re-leer el detalle tras su transacción.
 */
async function getApuActivityDetail(
  tenantId: string,
  activityId: string,
): Promise<ApuActivityDetail | null> {
  const activity = await db.orm.public.ApuActivity
    .where({ id: activityId, tenantId })
    .first();
  if (!activity) {
    return null;
  }

  const compositions = await db.orm.public.ApuActivityComposition
    .where({ activityId })
    .include("item", (item) =>
      item.select("id", "code", "name", "unit", "category", "unitPrice"),
    )
    .all();

  const rows: ApuCompositionRow[] = compositions.map((composition) => {
    const item = composition.item!;
    return {
      id: composition.id,
      itemId: item.id,
      itemCode: item.code,
      itemName: item.name,
      itemUnit: item.unit,
      category: item.category,
      unitPrice: String(item.unitPrice),
      consumption: String(composition.consumption),
      wastePercent: String(composition.wastePercent),
      cost: moneyToString(
        componentCost({
          unitPrice: String(item.unitPrice),
          consumption: String(composition.consumption),
          wastePercent: String(composition.wastePercent),
        }),
      ),
    };
  });

  return {
    id: activity.id,
    code: activity.code,
    name: activity.name,
    unit: activity.unit,
    description: activity.description,
    unitCost: activityUnitCost(rows),
    itemCount: rows.length,
    active: activity.active,
    updatedAt: String(activity.updatedAt),
    compositions: rows,
  };
}

/**
 * ¿Cuántas composiciones de actividades usan este insumo? La FK
 * `ApuActivityComposition.itemId` es `onDelete: Cascade`, así que un borrado
 * ciego alteraría silenciosamente las actividades: lo usamos para bloquearlo.
 */
async function countItemCompositionUsage(itemId: string): Promise<number> {
  const { total } = await db.orm.public.ApuActivityComposition
    .where({ itemId })
    .aggregate((aggregate) => ({ total: aggregate.count() }));
  return total;
}

/**
 * ¿Cuántas partidas de presupuesto referencian esta actividad? La FK
 * `QuoteItem.activityId` es `onDelete: SetNull`, así que borrar dejaría
 * partidas históricas sin su actividad: lo usamos para bloquearlo.
 */
async function countActivityQuoteUsage(activityId: string): Promise<number> {
  const { total } = await db.orm.public.QuoteItem
    .where({ activityId })
    .aggregate((aggregate) => ({ total: aggregate.count() }));
  return total;
}

export function createTenantDb(tenantId: string) {
  if (!tenantId || tenantId.trim() === "") {
    throw new Error(
      "Se requiere un tenantId válido para inicializar la capa de base de datos."
    );
  }

  // --- APU p99 cache (closure-scoped, avoids 'this') ---
  let _p99Cache: { ts: number; data: { activityUnitCost: Record<string, string>; itemConsumption: Record<string, string>; activityUnitCostMedian: Record<string, string>; itemConsumptionMedian: Record<string, string>; activityUnitCostP99: Record<string, string>; itemConsumptionP99: Record<string, string> } } | null = null;
  const _p99CacheTtlMs = 60_000;
  function invalidateP99(): void {
    _p99Cache = null;
  }

  return {
    customers: {
      list: () => db.orm.public.Customer.where({ tenantId }).all(),

      get: (id: string) =>
        db.orm.public.Customer.where({ id, tenantId }).first(),

      create: (data: Omit<Parameters<typeof db.orm.public.Customer.create>[0], "tenantId">) =>
        db.orm.public.Customer.create({
          ...data,
          tenantId,
        }),

      update: (id: string, data: Record<string, unknown>) =>
        db.orm.public.Customer
          .where({ id, tenantId })
          .update(data),
        

      delete: (id: string) =>
        db.orm.public.Customer
          .where({ id, tenantId })
          .delete(),

      /**
       * Búsqueda paginada para el CRM: filtra siempre por `tenantId`,
       * por estado (activo/archivado), texto libre y orden.
       * Devuelve la página actual y el total para paginar.
       */
      search: ({
        q,
        status = "active",
        sort = "recent",
        page = 1,
        pageSize = 20,
      }: CustomerSearchInput) => {
        const text = (q ?? "").trim();
        const pattern = `%${escapeLike(text)}%`;

        // Las cláusulas encadenadas de .where() componen con AND.
        const byTenantAndStatus = db.orm.public.Customer
          .where({ tenantId })
          .where((customer) => customer.active.eq(status === "active"));

        const filtered =
          text
            ? byTenantAndStatus.where((customer) =>
                or(
                  customer.name.ilike(pattern),
                  customer.email.ilike(pattern),
                  customer.phone.ilike(pattern),
                ),
              )
            : byTenantAndStatus;

        const ordered =
          sort === "name_asc"
            ? filtered.orderBy((customer) => customer.name.asc())
            : sort === "name_desc"
              ? filtered.orderBy((customer) => customer.name.desc())
              : filtered.orderBy((customer) => customer.createdAt.desc());

        const safePage = Math.max(1, Math.trunc(page));
        const safePageSize = Math.min(100, Math.max(1, Math.trunc(pageSize)));

        const rowsPromise = ordered
          .limit(safePageSize)
          .offset((safePage - 1) * safePageSize)
          .all();

        const countPromise = filtered.aggregate((aggregate) => ({
          total: aggregate.count(),
        }));

        return Promise.all([rowsPromise, countPromise]).then(
          ([rows, { total }]) => ({ rows, total }),
        );
      },

      /** Baja lógica: conserva el histórico de pagos del cliente. */
      archive: (id: string) =>
        db.orm.public.Customer
          .where({ id, tenantId })
          .update({ active: false }),

      /** Revierte una archivación. */
      restore: (id: string) =>
        db.orm.public.Customer
          .where({ id, tenantId })
          .update({ active: true }),

      /**
       * Borrado definitivo — SOLO de clientes ya archivados (la condición
       * `active: false` se aplica aquí, no se confía en el cliente).
       * `Payment.customerId` usa `onDelete: SetNull`, así que los pagos
       * se conservan y quedan sin cliente vinculado.
       *
       * El `.delete()` del ORM borra UNA fila por llamada; para borrar en
       * lote se usa la SQL lane, cuyo `execute` resuelve `affectedRows`.
       */
      deleteManyArchived: async (ids: string[]) => {
        const uniqueIds = [...new Set(ids)];

        if (uniqueIds.length === 0) {
          return 0;
        }

        const plan = db.sql.public.Customer
          .delete()
          .where((field, fns) =>
            fns.and(
              fns.eq(field.tenantId, tenantId),
              fns.eq(field.active, false),
              fns.in(field.id, uniqueIds),
            ),
          )
          .build();

        const { affectedRows } = await db.runtime().execute(plan);
        return affectedRows;
      },

      /** Cantidad de clientes activos (para el dashboard). */
      countActive: () =>
        db.orm.public.Customer
          .where({ tenantId })
          .where((customer) => customer.active.eq(true))
          .aggregate((aggregate) => ({ total: aggregate.count() }))
          .then(({ total }) => total),

      /**
       * Ficha 360°: información general, pagos, membresías, notas, timeline
       * y métricas del cliente en un solo punto. Devuelve `null` si el
       * cliente no existe o no pertenece a este tenant (nunca se confía en
       * un customerId de URL sin verificar `tenantId`).
       *
       * Serialización: Decimal → number, Temporal → ISO string.
       * El LTV se calcula por agregación EXACTA (no depende del límite de
       * filas); los listados van acotados para no cargar historiales grandes.
       */
      get360Details: async (
        customerId: string,
      ): Promise<Customer360Details | null> => {
        const customer = await db.orm.public.Customer
          .select("id", "name", "email", "phone", "active", "createdAt", "updatedAt")
          .where({ id: customerId, tenantId })
          .first();
        if (!customer) {
          return null;
        }

        const PAYMENTS_CAP = 200;
        const MEMBERSHIPS_CAP = 100;
        const TIMELINE_CAP = 30;

        const [payments, paymentsTotalAgg, approvedAgg, pendingCountAgg, memberships] =
          await Promise.all([
            db.orm.public.Payment
              .select("id", "amount", "status", "provider", "providerRefId", "description", "createdAt")
              .where({ tenantId, customerId })
              .orderBy((payment) => payment.createdAt.desc())
              .limit(PAYMENTS_CAP)
              .all(),
            db.orm.public.Payment
              .where({ tenantId, customerId })
              .aggregate((aggregate) => ({ total: aggregate.count() })),
            db.orm.public.Payment
              .where({ tenantId, customerId })
              .where((payment) => payment.status.eq("APPROVED"))
              .aggregate((aggregate) => ({
                total: aggregate.sum("amount"),
                count: aggregate.count(),
              })),
            db.orm.public.Payment
              .where({ tenantId, customerId })
              .where((payment) => payment.status.eq("PENDING"))
              .aggregate((aggregate) => ({ total: aggregate.count() })),
            db.orm.public.Membership
              .select("id", "type", "startDate", "endDate", "price", "createdAt")
              .where({ tenantId, customerId })
              .orderBy((membership) => membership.startDate.desc())
              .limit(MEMBERSHIPS_CAP)
              .all(),
          ]);

        const notes = await listCustomerNotes(tenantId, customerId, 100);

        const serializedPayments: Customer360Payment[] = payments.map((payment) => ({
          id: payment.id,
          amount: toNumber(payment.amount),
          status: payment.status,
          provider: payment.provider,
          providerRefId: payment.providerRefId,
          description: payment.description,
          createdAt: String(payment.createdAt),
        }));

        const serializedMemberships: Customer360Membership[] = memberships.map(
          (membership) => ({
            id: membership.id,
            type: membership.type,
            status: computeMembershipStatus(membership.endDate),
            price: toNumber(membership.price),
            startDate: String(membership.startDate),
            endDate: String(membership.endDate),
            createdAt: String(membership.createdAt),
          }),
        );

        // --- Métricas -------------------------------------------------------
        const ltv = toNumber(approvedAgg.total);
        const approvedCount = approvedAgg.count;
        const avgTicket = approvedCount > 0 ? ltv / approvedCount : 0;

        // Método más frecuente entre pagos aprobados (lista desc: ante empate,
        // gana el más reciente).
        const methodFrequency = new Map<PaymentMethodValue, number>();
        for (const payment of payments) {
          if (payment.status !== "APPROVED") {
            continue;
          }
          methodFrequency.set(
            payment.provider,
            (methodFrequency.get(payment.provider) ?? 0) + 1,
          );
        }
        let favoriteMethod: PaymentMethodValue | null = null;
        let favoriteCount = 0;
        for (const [method, count] of methodFrequency) {
          if (count > favoriteCount) {
            favoriteCount = count;
            favoriteMethod = method;
          }
        }

        // Última actividad: pago, nota o membresía más reciente (real).
        // Pagos y notas vienen desc: basta el primero; membresías se recorren.
        let lastActivityDate: string | null = null;
        if (payments.length > 0) {
          lastActivityDate = String(payments[0].createdAt);
        }
        if (notes.length > 0) {
          lastActivityDate = maxIso(lastActivityDate, notes[0].createdAt);
        }
        for (const membership of memberships) {
          lastActivityDate = maxIso(lastActivityDate, String(membership.createdAt));
        }

        // Estado de cuenta basado en datos reales, nunca inventado:
        // 1. sin pagos/membresías/notas → sin actividad
        // 2. membresía más reciente vencida → vencido
        // 3. pagos PENDING → pendiente
        // 4. membresía activa o pagos aprobados → al día
        // 5. (solo notas / pagos no aprobados) → sin datos
        const latestByEnd = serializedMemberships.reduce<Customer360Membership | null>(
          (latest, membership) =>
            !latest || membership.endDate > latest.endDate ? membership : latest,
          null,
        );
        let accountStatus: CustomerAccountStatus;
        if (
          payments.length === 0 &&
          serializedMemberships.length === 0 &&
          notes.length === 0
        ) {
          accountStatus = "sin_actividad";
        } else if (latestByEnd && latestByEnd.status === "expired") {
          accountStatus = "vencido";
        } else if (pendingCountAgg.total > 0) {
          accountStatus = "pendiente";
        } else if (latestByEnd || approvedCount > 0) {
          accountStatus = "al_dia";
        } else {
          accountStatus = "sin_datos";
        }

        // --- Timeline unificado ---------------------------------------------
        const membershipStatusLabel = (status: MembershipStatusValue): string =>
          MEMBERSHIP_STATUSES.find((option) => option.value === status)?.label ??
          status;

        const timeline: CustomerTimelineEvent[] = [
          ...serializedPayments.map(
            (payment): CustomerTimelineEvent => ({
              id: `payment-${payment.id}`,
              type: "payment",
              date: payment.createdAt,
              title: "Pago",
              description: payment.description
                ? `${paymentMethodLabel(payment.provider)} · ${payment.description}`
                : paymentMethodLabel(payment.provider),
              amount: payment.amount,
              status: paymentStatusLabel(payment.status),
            }),
          ),
          ...serializedMemberships.map(
            (membership): CustomerTimelineEvent => ({
              id: `membership-${membership.id}`,
              type: "membership",
              date: membership.createdAt,
              title: `Membresía ${typeLabel(membership.type)}`,
              description: `${formatDateShort(membership.startDate)} → ${formatDateShort(membership.endDate)}`,
              status: membershipStatusLabel(membership.status),
            }),
          ),
          ...notes.map(
            (note): CustomerTimelineEvent => ({
              id: `note-${note.id}`,
              type: "note",
              date: note.createdAt,
              title: note.authorName ? `Nota de ${note.authorName}` : "Nota interna",
              description:
                note.content.length > 140
                  ? `${note.content.slice(0, 140)}…`
                  : note.content,
            }),
          ),
        ]
          .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
          .slice(0, TIMELINE_CAP);

        return {
          customer: {
            id: customer.id,
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            active: customer.active,
            createdAt: String(customer.createdAt),
            updatedAt: String(customer.updatedAt),
          },
          payments: serializedPayments,
          paymentsTotal: paymentsTotalAgg.total,
          memberships: serializedMemberships,
          notes,
          timeline,
          metrics: {
            ltv,
            approvedCount,
            avgTicket,
            favoriteMethod,
            lastActivityDate,
            accountStatus,
          },
        };
      },
    },

    /**
     * Notas internas de clientes (Ficha 360°). Creación scoped al tenant;
     * el autor se resuelve con el User autenticado en la Server Action.
     */
    customerNotes: {
      create: (
        data: Omit<
          Parameters<typeof db.orm.public.CustomerNote.create>[0],
          "tenantId"
        >,
      ) =>
        db.orm.public.CustomerNote.create({
          ...data,
          tenantId,
        }),

      /** Últimas notas del cliente, descendente por fecha. */
      listByCustomer: (customerId: string, limit = 100) =>
        listCustomerNotes(tenantId, customerId, limit),
    },

    /* -------------------------------------------------------------- */
    /* Módulo Construcción & APU — banco de insumos                    */
    /* -------------------------------------------------------------- */

    apu: {
      listItems: async ({
        q,
        category,
        unit,
        active,
        page = 1,
        limit = 10,
      }: ApuListInput = {}): Promise<{ rows: ApuItemRow[]; total: number }> => {
        const text = (q ?? "").trim();
        const pattern = text ? `%${escapeLike(text)}%` : null;
        const safePage = Math.max(1, Math.trunc(page));
        const safeLimit = Math.min(100, Math.max(1, Math.trunc(limit)));

        let filtered = db.orm.public.ApuItem.where({ tenantId });
        if (text) {
          filtered = filtered.where((item) =>
            or(item.name.ilike(pattern!), item.code.ilike(pattern!)),
          );
        }
        if (category) {
          filtered = filtered.where((item) => item.category.eq(category));
        }
        if (unit) {
          filtered = filtered.where((item) => item.unit.eq(unit));
        }
        if (typeof active === "boolean") {
          filtered = filtered.where((item) => item.active.eq(active));
        }

        const [rows, { total }] = await Promise.all([
          filtered
            .orderBy((item) => item.name.asc())
            .limit(safeLimit)
            .offset((safePage - 1) * safeLimit)
            .all(),
          filtered.aggregate((aggregate) => ({ total: aggregate.count() })),
        ]);

        return {
          rows: rows.map((row) => ({
            id: row.id,
            code: row.code,
            name: row.name,
            unit: row.unit,
            category: row.category,
            unitPrice: String(row.unitPrice),
            active: row.active,
            imageUrl: row.imageUrl,
            updatedAt: String(row.updatedAt),
          })),
          total,
        };
      },

      /** Unidades distintas presentes en el banco (para el filtro de la UI). */
      listUnits: async (): Promise<string[]> => {
        const rows = await db.orm.public.ApuItem
          .where({ tenantId })
          .distinct("unit")
          .all();
        return rows
          .map((row) => row.unit)
          .filter((unit): unit is string => Boolean(unit))
          .sort((a, b) => a.localeCompare(b));
      },

      getItem: (id: string) =>
        db.orm.public.ApuItem.where({ id, tenantId }).first(),

      createItem: async function(
        data: Omit<
          Parameters<typeof db.orm.public.ApuItem.create>[0],
          "tenantId"
        >,
      ) {
        const res = await db.orm.public.ApuItem.create({
          ...data,
          tenantId,
        });
        invalidateP99();
        return res;
      },

      updateItem: async function(id: string, data: Record<string, unknown>) {
        const res = await db.orm.public.ApuItem.where({ id, tenantId }).update(data);
        invalidateP99();
        return res;
      },

      /** Actividades con costo unitario calculado (precios actuales). */
      listActivities: async ({
        q,
        unit,
        active,
        page = 1,
        limit = 200,
      }: ApuActivityListInput = {}): Promise<{
        rows: ApuActivityRow[];
        total: number;
      }> => {
        const text = (q ?? "").trim();
        const pattern = text ? `%${escapeLike(text)}%` : null;
        const safePage = Math.max(1, Math.trunc(page));
        const safeLimit = Math.min(500, Math.max(1, Math.trunc(limit)));

        let filtered = db.orm.public.ApuActivity.where({ tenantId });
        if (text) {
          filtered = filtered.where((activity) =>
            or(
              activity.name.ilike(pattern!),
              activity.code.ilike(pattern!),
            ),
          );
        }
        if (unit) {
          filtered = filtered.where((activity) => activity.unit.eq(unit));
        }
        if (typeof active === "boolean") {
          filtered = filtered.where((activity) => activity.active.eq(active));
        }

        const [rows, { total }] = await Promise.all([
          filtered
            .orderBy((activity) => activity.name.asc())
            .limit(safeLimit)
            .offset((safePage - 1) * safeLimit)
            .all(),
          filtered.aggregate((aggregate) => ({ total: aggregate.count() })),
        ]);

        const activityIds = rows.map((row) => row.id);
        const compositions =
          activityIds.length === 0
            ? []
            : await db.orm.public.ApuActivityComposition
                .where((composition) => composition.activityId.in(activityIds))
                .include("item", (item) =>
                  item.select(
                    "id",
                    "code",
                    "name",
                    "unit",
                    "category",
                    "unitPrice",
                  ),
                )
                .all();
        const byActivity = new Map<string, typeof compositions>();
        for (const composition of compositions) {
          const list = byActivity.get(composition.activityId) ?? [];
          list.push(composition);
          byActivity.set(composition.activityId, list);
        }

        return {
          rows: rows.map((row) => {
            const activityCompositions = byActivity.get(row.id) ?? [];
            return {
              id: row.id,
              code: row.code,
              name: row.name,
              unit: row.unit,
              description: row.description,
              unitCost: activityUnitCost(
                activityCompositions.map((composition) => ({
                  unitPrice: String(composition.item!.unitPrice),
                  consumption: String(composition.consumption),
                  wastePercent: String(composition.wastePercent),
                })),
              ),
              itemCount: activityCompositions.length,
              active: row.active,
              updatedAt: String(row.updatedAt),
            };
          }),
          total,
        };
      },

      /** Detalle de una actividad con su composición (costos unitarios). */
      getActivity: (id: string) => getApuActivityDetail(tenantId, id),

      /**
       * Crea actividad + composición en una transacción. `compositions`
       * llega ya validada por la Server Action (insumos del mismo tenant).
       */
      createActivity: async (data: {
        code?: string;
        name: string;
        unit: string;
        description?: string;
        compositions: { itemId: string; consumption: string; wastePercent: string }[];
      }): Promise<ApuActivityDetail | null> => {
        const { compositions, ...fields } = data;
        const created = await db.transaction(async (tx) => {
          const activity = await tx.orm.public.ApuActivity.create({
            ...fields,
            tenantId,
          });
          for (const composition of compositions) {
            await tx.orm.public.ApuActivityComposition.create({
              activityId: activity.id,
              itemId: composition.itemId,
              consumption: composition.consumption,
              wastePercent: composition.wastePercent,
            });
          }
          return activity;
        });
        return getApuActivityDetail(tenantId, created.id);
      },

      /** Reemplaza actividad + composición completa (idempotente). */
      updateActivity: async (
        id: string,
        data: {
          code?: string;
          name: string;
          unit: string;
          description?: string;
          compositions: { itemId: string; consumption: string; wastePercent: string }[];
        },
      ): Promise<ApuActivityDetail | null> => {
        const { compositions, ...fields } = data;
        const updated = await db.transaction(async (tx) => {
          const activity = await tx.orm.public.ApuActivity
            .where({ id, tenantId })
            .update(fields);
          if (!activity) {
            throw new Error("No se encontró la actividad en este negocio.");
          }
          await tx.orm.public.ApuActivityComposition.where({
            activityId: id,
          }).deleteAll();
          for (const composition of compositions) {
            await tx.orm.public.ApuActivityComposition.create({
              activityId: id,
              itemId: composition.itemId,
              consumption: composition.consumption,
              wastePercent: composition.wastePercent,
            });
          }
          return activity;
        });
        return getApuActivityDetail(tenantId, updated.id);
      },

      /* --- Insumos: archivado y borrado seguro ---------------------- */

      /** Archiva un insumo (soft delete): deja de ofrecerse para composiciones. */
      archiveItem: async function(id: string) {
        await db.orm.public.ApuItem.where({ id, tenantId }).update({ active: false });
        invalidateP99();
      },

      /** Revierte la archivación de un insumo. */
      restoreItem: async function(id: string) {
        await db.orm.public.ApuItem.where({ id, tenantId }).update({ active: true });
        invalidateP99();
      },

      /** Cuántas composiciones de actividades usan este insumo. */
      countItemUsage: (id: string) => countItemCompositionUsage(id),

      /**
       * Borrado definitivo de un insumo. Se bloquea si está EN USO (alguna
       * composición lo referencia): `ApuActivityComposition.itemId` es
       * `onDelete: Cascade` y un borrado ciego alteraría las actividades.
       * El caller debe preferir `archiveItem`.
       */
      deleteItem: async function(id: string): Promise<void> {
        const item = await db.orm.public.ApuItem.where({ id, tenantId }).first();
        if (!item) {
          throw new Error("APU_NOT_FOUND");
        }
        if ((await countItemCompositionUsage(id)) > 0) {
          throw new Error("APU_IN_USE");
        }
        await db.orm.public.ApuItem.where({ id, tenantId }).delete();
        invalidateP99();
      },

      /* --- Actividades: archivado y borrado seguro ------------------ */

      /** Archiva una actividad (soft delete). */
      archiveActivity: async function(id: string) {
        await db.orm.public.ApuActivity.where({ id, tenantId }).update({ active: false });
        invalidateP99();
      },

      /** Revierte la archivación de una actividad. */
      restoreActivity: async function(id: string) {
        await db.orm.public.ApuActivity.where({ id, tenantId }).update({ active: true });
        invalidateP99();
      },

      /** Cuántas partidas de presupuesto referencian esta actividad. */
      countActivityUsage: (id: string) => countActivityQuoteUsage(id),

      /**
       * Borrado definitivo de una actividad. Se bloquea si está EN USO (alguna
       * partida la referencia): `QuoteItem.activityId` es `onDelete: SetNull`
       * y borrar dejaría presupuestos históricos sin su actividad.
       */
      deleteActivity: async (id: string): Promise<void> => {
        const activity = await db.orm.public.ApuActivity
          .where({ id, tenantId })
          .first();
        if (!activity) {
          throw new Error("APU_NOT_FOUND");
        }
        if ((await countActivityQuoteUsage(id)) > 0) {
          throw new Error("APU_IN_USE");
        }
        await db.orm.public.ApuActivity.where({ id, tenantId }).delete();
      },

      /* --- Composición: agregar / quitar insumo --------------------- */

      /**
       * Agrega un insumo a la composición de una actividad. Verifica que la
       * actividad y el insumo pertenezcan al MISMO tenant, que no se repita el
       * par (activityId, itemId) y que el rendimiento/desperdicio sean válidos
       * (defensa en profundidad: la Server Action ya validó, pero la capa de
       * datos no confía en el caller).
       */
      addComposition: async function(
        activityId: string,
        data: { itemId: string; consumption: string; wastePercent: string },
      ): Promise<{ id: string }> {
        const activity = await db.orm.public.ApuActivity
          .where({ id: activityId, tenantId })
          .first();
        if (!activity) {
          throw new Error("APU_NOT_FOUND");
        }
        const item = await db.orm.public.ApuItem
          .where({ id: data.itemId, tenantId })
          .first();
        if (!item) {
          throw new Error("APU_FOREIGN_ITEM");
        }
        if (activity.active === false || item.active === false) {
          throw new Error("APU_INVALID");
        }
        if (!isStrictlyPositive(data.consumption)) {
          throw new Error("APU_INVALID_CONSUMPTION");
        }
        if (!isValidPercent(data.wastePercent, 50)) {
          throw new Error("APU_INVALID_WASTE");
        }
        const existing = await db.orm.public.ApuActivityComposition
          .where({ activityId, itemId: data.itemId })
          .first();
        if (existing) {
          throw new Error("APU_DUPLICATE");
        }
        const created = await db.orm.public.ApuActivityComposition.create({
          activityId,
          itemId: data.itemId,
          consumption: data.consumption,
          wastePercent: data.wastePercent,
        });
        // No invalidar caché aquí: TTL 60s maneja la expiración natural
        return { id: created.id };
      },

      /**
       * Quita un insumo de la composición de una actividad (idempotente).
       * Devuelve cuántas filas se eliminaron.
       */
      removeComposition: async function(
        activityId: string,
        itemId: string,
      ): Promise<number> {
        const activity = await db.orm.public.ApuActivity
          .where({ id: activityId, tenantId })
          .first();
        if (!activity) {
          throw new Error("APU_NOT_FOUND");
        }
        const plan = db.sql.public.ApuActivityComposition
          .delete()
          .where((field, fns) =>
            fns.and(
              fns.eq(field.activityId, activityId),
              fns.eq(field.itemId, itemId),
            ),
          )
          .build();
        const { affectedRows } = await db.runtime().execute(plan);
        // No invalidar caché aquí: TTL 60s maneja la expiración natural
        return affectedRows;
      },

      /**
       * Calcula umbrales p99 (atípicos) sobre TODO el catálogo (no por página):
       * - p99 del costo unitario de actividades, agrupado por unidad de actividad
       * - p99 del consumo por insumo, agrupado por unidad del insumo
       * No modifica datos; se usa para badges "revisar" en la UI.
       */
      getP99Thresholds: async function (): Promise<{
        activityUnitCost: Record<string, string>;
        itemConsumption: Record<string, string>;
        activityUnitCostMedian?: Record<string, string>;
        itemConsumptionMedian?: Record<string, string>;
        activityUnitCostP99?: Record<string, string>;
        itemConsumptionP99?: Record<string, string>;
      }> {
        const now = Date.now();
        if (_p99Cache && now - _p99Cache.ts < _p99CacheTtlMs) {
          return _p99Cache.data;
        }
        // p99 costo unitario de actividades por unidad
        const allActivities = await db.orm.public.ApuActivity
          .where({ tenantId })
          .all();
        const activityIds = allActivities.map((a) => a.id);
        const activityComps = await db.orm.public.ApuActivityComposition
          .where((comp) => comp.activityId.in(activityIds))
          .include("item", (item) =>
            item.select("id", "unitPrice", "unit"),
          )
          .all();

        const compsByActivity = new Map<string, typeof activityComps>();
        for (const comp of activityComps) {
          const list = compsByActivity.get(comp.activityId) ?? [];
          list.push(comp);
          compsByActivity.set(comp.activityId, list);
        }

        const costByUnit: Map<string, number[]> = new Map();
        for (const activity of allActivities) {
          const comps = compsByActivity.get(activity.id) ?? [];
          const costStr = activityUnitCost(
            comps.map((c) => ({
              unitPrice: String(c.item!.unitPrice),
              consumption: String(c.consumption),
              wastePercent: String(c.wastePercent),
            })),
          );
          const cost = parseFloat(costStr);
          if (!isNaN(cost)) {
            const arr = costByUnit.get(activity.unit) ?? [];
            arr.push(cost);
            costByUnit.set(activity.unit, arr);
          }
        }

        const p99ActivityUnitCost: Record<string, string> = {};
        for (const [unit, values] of costByUnit) {
          if (values.length >= 2) {
            const sorted = values.sort((a, b) => a - b);
            const idx = Math.min(sorted.length - 1, Math.ceil(0.99 * sorted.length) - 1);
            p99ActivityUnitCost[unit] = sorted[Math.max(0, idx)].toFixed(2);
          } else if (values.length === 1) {
            p99ActivityUnitCost[unit] = values[0].toFixed(2);
          }
        }

        // p99 consumo por insumo agrupado por unidad del insumo
        const consumptionByItemUnit: Map<string, number[]> = new Map();
        for (const comp of activityComps) {
          const consumption = parseFloat(String(comp.consumption));
          if (!isNaN(consumption) && comp.item?.unit) {
            const arr = consumptionByItemUnit.get(comp.item.unit) ?? [];
            arr.push(consumption);
            consumptionByItemUnit.set(comp.item.unit, arr);
          }
        }

        const p99ItemConsumption: Record<string, string> = {};
        for (const [unit, values] of consumptionByItemUnit) {
          if (values.length >= 2) {
            const sorted = values.sort((a, b) => a - b);
            const idx = Math.min(sorted.length - 1, Math.ceil(0.99 * sorted.length) - 1);
            p99ItemConsumption[unit] = sorted[Math.max(0, idx)].toFixed(4);
          } else if (values.length === 1) {
            p99ItemConsumption[unit] = values[0].toFixed(4);
          }
        }
        const median = (vals: number[]): number => {
          if (vals.length === 0) return 0;
          const sorted = [...vals].sort((a,b)=>a-b);
          const mid = Math.floor(sorted.length/2);
          if (sorted.length % 2 === 1) return sorted[mid];
          return (sorted[mid-1] + sorted[mid]) / 2;
        };
        const p99ActivityUnitCostMedian: Record<string, string> = {};
        for (const [unit, values] of costByUnit) {
          if (values.length > 0) {
            p99ActivityUnitCostMedian[unit] = median(values).toFixed(2);
          }
        }
        const p99ItemConsumptionMedian: Record<string, string> = {};
        for (const [unit, values] of consumptionByItemUnit) {
          if (values.length > 0) {
            p99ItemConsumptionMedian[unit] = median(values).toFixed(4);
          }
        }


        const data = {
          activityUnitCost: p99ActivityUnitCost,
          itemConsumption: p99ItemConsumption,
          activityUnitCostMedian: p99ActivityUnitCostMedian,
          itemConsumptionMedian: p99ItemConsumptionMedian,
          activityUnitCostP99: p99ActivityUnitCost,
          itemConsumptionP99: p99ItemConsumption,
        };
        _p99Cache = { ts: Date.now(), data };
        return data;
      },

      invalidateP99: function () {
        _p99Cache = null;
      },

      /**
       * Informe de salud del catálogo APU (solo lectura, no modifica datos).
       * Devuelve métricas y listas para auditoría:
       * - actividades sin composición
       * - actividades con costo unitario 0
       * - insumos sin uso en ninguna actividad
       * - antigüedad de precios (días desde última actualización)
       * - estado de apu-importer (archivos recientes) y APU_UNITS configuradas
       */
      getCatalogHealthReport: async (): Promise<{
        activitiesWithoutComposition: { id: string; code: string | null; name: string; unit: string }[];
        activitiesWithZeroUnitCost: { id: string; code: string | null; name: string; unit: string }[];
        unusedItems: { id: string; code: string | null; name: string; unit: string; updatedAt: string }[];
        priceAgeDays: { id: string; code: string | null; name: string; unit: string; ageDays: number }[];
        apuImporterStatus: { recentFiles: number; lastImport: string | null };
        apuUnitsConfigured: string[];
      }> => {
        // Actividades sin composición
        const allActivities = await db.orm.public.ApuActivity
          .where({ tenantId })
          .all();
        const activityIds = allActivities.map((a) => a.id);
        const allCompositions = await db.orm.public.ApuActivityComposition
          .where((comp) => comp.activityId.in(activityIds))
          .select("activityId")
          .all();
        const activitiesWithComposition = new Set(allCompositions.map((c) => c.activityId));
        const activitiesWithoutComposition = allActivities
          .filter((a) => !activitiesWithComposition.has(a.id))
          .map((a) => ({ id: a.id, code: a.code, name: a.name, unit: a.unit }));

        // Costo unitario 0 (recalcula con precios actuales)
        const activityComps = await db.orm.public.ApuActivityComposition
          .where((comp) => comp.activityId.in(activityIds))
          .include("item", (item) => item.select("id", "unitPrice", "unit"))
          .all();
        const compsByActivity = new Map<string, typeof activityComps>();
        for (const comp of activityComps) {
          const list = compsByActivity.get(comp.activityId) ?? [];
          list.push(comp);
          compsByActivity.set(comp.activityId, list);
        }
        const activitiesWithZeroUnitCost: { id: string; code: string | null; name: string; unit: string }[] = [];
        for (const activity of allActivities) {
          const comps = compsByActivity.get(activity.id) ?? [];
          if (comps.length > 0) {
            const costStr = activityUnitCost(
              comps.map((c) => ({
                unitPrice: String(c.item!.unitPrice),
                consumption: String(c.consumption),
                wastePercent: String(c.wastePercent),
              })),
            );
            if (parseFloat(costStr) === 0) {
              activitiesWithZeroUnitCost.push({ id: activity.id, code: activity.code, name: activity.name, unit: activity.unit });
            }
          }
        }

        // Insumos sin uso
        const allItems = await db.orm.public.ApuItem.where({ tenantId }).all();
        const usedItemIds = new Set(activityComps.map((c) => c.itemId));
        const unusedItems = allItems
          .filter((item) => !usedItemIds.has(item.id))
          .map((item) => ({ id: item.id, code: item.code, name: item.name, unit: item.unit, updatedAt: String(item.updatedAt) }));

        // Antigüedad de precios (días desde updatedAt)
        const now = new Date();
        const priceAgeDays = allItems.map((item) => {
          const updated = new Date(String(item.updatedAt));
          const ageDays = Math.floor((now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24));
          return { id: item.id, code: item.code, name: item.name, unit: item.unit, ageDays };
        });

        // Estado apu-importer: busca archivos en importaciones recientes
        // Nota: no hay tabla de logs de importación; se devuelve placeholder
        const apuImporterStatus = { recentFiles: 0, lastImport: null as string | null };

        // APU_UNITS configuradas (del motor)
        const { APU_UNITS } = await import("@/lib/apu-engine");

        return {
          activitiesWithoutComposition,
          activitiesWithZeroUnitCost,
          unusedItems,
          priceAgeDays,
          apuImporterStatus,
          apuUnitsConfigured: [...APU_UNITS],
        };
      },
    },

    /* -------------------------------------------------------------- */
    /* Módulo Construcción & APU — presupuestos                        */
    /* -------------------------------------------------------------- */

    quotes: {
      list: async ({
        q,
        status,
        page = 1,
        limit = 10,
      }: QuoteListInput = {}): Promise<{ rows: QuoteRow[]; total: number }> => {
        const text = (q ?? "").trim();
        const pattern = text ? `%${escapeLike(text)}%` : null;
        const safePage = Math.max(1, Math.trunc(page));
        const safeLimit = Math.min(100, Math.max(1, Math.trunc(limit)));

        let filtered = db.orm.public.Quote.where({ tenantId });
        if (text) {
          filtered = filtered.where((quote) =>
            or(quote.code.ilike(pattern!), quote.title.ilike(pattern!)),
          );
        }
        if (status) {
          filtered = filtered.where((quote) => quote.status.eq(status));
        }

        const [rows, { total }] = await Promise.all([
          filtered
            .orderBy((quote) => quote.createdAt.desc())
            .limit(safeLimit)
            .offset((safePage - 1) * safeLimit)
            .all(),
          filtered.aggregate((aggregate) => ({ total: aggregate.count() })),
        ]);

        const customerIds = [
          ...new Set(
            rows
              .map((row) => row.customerId)
              .filter((id): id is string => Boolean(id)),
          ),
        ];
        const customers =
          customerIds.length === 0
            ? []
            : await db.orm.public.Customer
                .where({ tenantId })
                .where((customer) => customer.id.in(customerIds))
                .all();
        const customerById = new Map(
          customers.map((customer) => [customer.id, customer]),
        );

        return {
          rows: rows.map((row) => ({
            id: row.id,
            code: row.code,
            title: row.title,
            customerId: row.customerId,
            customerName: row.customerId
              ? customerById.get(row.customerId)?.name ?? "Cliente eliminado"
              : null,
            status: row.status,
            directCost: String(row.directCost),
            totalAmount: String(row.totalAmount),
            createdAt: String(row.createdAt),
          })),
          total,
        };
      },

      /** Métricas de portada (datos reales, no mock). */
      getMetrics: async (): Promise<QuoteMetrics> => {
        const [countAgg, approvedAgg, draftAgg, totalAgg] = await Promise.all([
          db.orm.public.Quote
            .where({ tenantId })
            .aggregate((aggregate) => ({ total: aggregate.count() })),
          db.orm.public.Quote
            .where({ tenantId })
            .where((quote) => quote.status.eq("APPROVED"))
            .aggregate((aggregate) => ({ total: aggregate.count() })),
          db.orm.public.Quote
            .where({ tenantId })
            .where((quote) => quote.status.eq("DRAFT"))
            .aggregate((aggregate) => ({ total: aggregate.count() })),
          db.orm.public.Quote
            .where({ tenantId })
            .aggregate((aggregate) => ({ total: aggregate.sum("totalAmount") })),
        ]);

        return {
          total: countAgg.total,
          approved: approvedAgg.total,
          draft: draftAgg.total,
          totalAmount: toNumber(totalAgg.total),
        };
      },

      /**
       * Presupuesto completo. El desglose AIU se RECALCULA con el motor
       * desde los porcentajes guardados — nunca se confía en los totales
       * que haya enviado el navegador.
       */
      get: async (id: string): Promise<QuoteDetail | null> => {
        const quote = await db.orm.public.Quote
          .where({ id, tenantId })
          .first();
        if (!quote) {
          return null;
        }

        const [items, customer] = await Promise.all([
          db.orm.public.QuoteItem.where({ quoteId: id }).all(),
          quote.customerId
            ? db.orm.public.Customer
                .where({ id: quote.customerId, tenantId })
                .select("name")
                .first()
            : null,
        ]);

        const breakdown = calculateQuoteTotals(
          items.map((item) => ({
            quantity: String(item.quantity),
            unitCost: String(item.unitCost),
          })),
          {
            adminPercent: String(quote.adminPercent),
            imprevPercent: String(quote.imprevPercent),
            utilPercent: String(quote.utilPercent),
            taxPercent: String(quote.taxPercent),
          },
        );

        return {
          id: quote.id,
          code: quote.code,
          title: quote.title,
          customerId: quote.customerId,
          customerName: quote.customerId
            ? customer?.name ?? "Cliente eliminado"
            : null,
          status: quote.status,
          adminPercent: String(quote.adminPercent),
          imprevPercent: String(quote.imprevPercent),
          utilPercent: String(quote.utilPercent),
          taxPercent: String(quote.taxPercent),
          directCost: String(quote.directCost),
          administration: breakdown.administration,
          contingency: breakdown.contingency,
          utility: breakdown.utility,
          subtotal: breakdown.subtotal,
          tax: breakdown.tax,
          totalAmount: String(quote.totalAmount),
          createdAt: String(quote.createdAt),
          updatedAt: String(quote.updatedAt),
          items: items.map((item) => ({
            id: item.id,
            activityId: item.activityId,
            name: item.name,
            unit: item.unit,
            quantity: String(item.quantity),
            unitCost: String(item.unitCost),
            totalCost: String(item.totalCost),
            apuSnapshot: (item.apuSnapshot as ApuSnapshot | null) ?? null,
          })),
        };
      },

      /**
       * Crea un presupuesto DRAFT con snapshot inmutable de cada APU.
       * Precios y costos se recalculan SIEMPRE en el servidor con el motor
       * (el navegador solo manda activityId + cantidad + % AIU). Todo en
       * una transacción; código correlativo PRES-<año>-NNN por tenant.
       */
      create: async (data: {
        customerId: string | null;
        title: string;
        items: { activityId: string; quantity: string }[];
        aiuConfig: {
          adminPercent: string;
          imprevPercent: string;
          utilPercent: string;
          taxPercent: string;
        };
      }): Promise<QuoteDetail> => {
        const activityIds = [
          ...new Set(data.items.map((item) => item.activityId)),
        ];

        const [activities, allCompositions] = await Promise.all([
          db.orm.public.ApuActivity
            .where({ tenantId })
            .where((activity) => activity.id.in(activityIds))
            .all(),
          db.orm.public.ApuActivityComposition.where((composition) =>
            composition.activityId.in(activityIds),
          )
            .include("item", (item) =>
              item.select(
                "id",
                "code",
                "name",
                "unit",
                "category",
                "unitPrice",
              ),
            )
            .all(),
        ]);
        if (activities.length !== activityIds.length) {
          throw new Error(
            "Alguna de las actividades no existe en este negocio.",
          );
        }

        const activityById = new Map(
          activities.map((activity) => [activity.id, activity]),
        );
        const compositionsByActivity = new Map<
          string,
          typeof allCompositions
        >();
        for (const composition of allCompositions) {
          const list =
            compositionsByActivity.get(composition.activityId) ?? [];
          list.push(composition);
          compositionsByActivity.set(composition.activityId, list);
        }

        // Líneas con snapshot inmutable + costo unitario congelado.
        const quoteItems = data.items.map(({ activityId, quantity }) => {
          const activity = activityById.get(activityId);
          if (!activity) {
            throw new Error("Actividad no encontrada.");
          }
          const components = (
            compositionsByActivity.get(activityId) ?? []
          ).map((composition) => {
            const item = composition.item!;
            return {
              itemId: item.id,
              code: item.code,
              name: item.name,
              unit: item.unit,
              category: item.category,
              unitPrice: String(item.unitPrice),
              consumption: String(composition.consumption),
              wastePercent: String(composition.wastePercent),
            };
          });
          const snapshot = buildApuSnapshot({
            activity: {
              id: activity.id,
              code: activity.code,
              name: activity.name,
              unit: activity.unit,
            },
            components,
          });
          return {
            activityId,
            quantity,
            name: activity.name,
            unit: activity.unit,
            unitCost: snapshot.unitCost,
            totalCost: moneyToString(lineTotal(quantity, snapshot.unitCost)),
            apuSnapshot: snapshot,
          };
        });

        const totals = calculateQuoteTotals(
          quoteItems.map((item) => ({
            quantity: item.quantity,
            unitCost: item.unitCost,
          })),
          data.aiuConfig,
        );

        // Código correlativo por tenant y año (solo lectura previa).
        const year = currentYearBogota();
        const prefix = `PRES-${year}-`;
        const latest = await db.orm.public.Quote
          .where({ tenantId })
          .where((quote) => quote.code.like(`${prefix}%`))
          .orderBy((quote) => quote.code.desc())
          .first();
        const sequence = latest
          ? Number(latest.code.slice(prefix.length)) + 1
          : 1;
        const code = `${prefix}${String(sequence).padStart(3, "0")}`;

        const created = await db.transaction(async (tx) => {
          const quote = await tx.orm.public.Quote.create({
            tenantId,
            customerId: data.customerId,
            title: data.title,
            code,
            status: "DRAFT",
            adminPercent: data.aiuConfig.adminPercent,
            imprevPercent: data.aiuConfig.imprevPercent,
            utilPercent: data.aiuConfig.utilPercent,
            taxPercent: data.aiuConfig.taxPercent,
            directCost: totals.directCost,
            totalAmount: totals.totalAmount,
          });
          const createdItems: Awaited<
            ReturnType<typeof tx.orm.public.QuoteItem.create>
          >[] = [];
          for (const item of quoteItems) {
            createdItems.push(
              await tx.orm.public.QuoteItem.create({
                quoteId: quote.id,
                activityId: item.activityId,
                name: item.name,
                unit: item.unit,
                quantity: item.quantity,
                unitCost: item.unitCost,
                totalCost: item.totalCost,
                apuSnapshot: item.apuSnapshot,
              }),
            );
          }
          return { quote, createdItems };
        });

        const customer = created.quote.customerId
          ? await db.orm.public.Customer
              .where({ id: created.quote.customerId, tenantId })
              .select("name")
              .first()
          : null;

        return {
          id: created.quote.id,
          code: created.quote.code,
          title: created.quote.title,
          customerId: created.quote.customerId,
          customerName: created.quote.customerId
            ? customer?.name ?? "Cliente eliminado"
            : null,
          status: created.quote.status as QuoteStatusValue,
          adminPercent: String(created.quote.adminPercent),
          imprevPercent: String(created.quote.imprevPercent),
          utilPercent: String(created.quote.utilPercent),
          taxPercent: String(created.quote.taxPercent),
          directCost: String(created.quote.directCost),
          administration: totals.administration,
          contingency: totals.contingency,
          utility: totals.utility,
          subtotal: totals.subtotal,
          tax: totals.tax,
          totalAmount: String(created.quote.totalAmount),
          createdAt: String(created.quote.createdAt),
          updatedAt: String(created.quote.updatedAt),
          items: created.createdItems.map((item) => ({
            id: item.id,
            activityId: item.activityId,
            name: item.name,
            unit: item.unit,
            quantity: String(item.quantity),
            unitCost: String(item.unitCost),
            totalCost: String(item.totalCost),
            apuSnapshot: (item.apuSnapshot as ApuSnapshot | null) ?? null,
          })),
        };
      },
    },

    projects: {
      list: async ({
        q,
        status,
        page = 1,
        limit = 10,
      }: ProjectListInput = {}): Promise<{ rows: ProjectRow[]; total: number }> => {
        const text = (q ?? "").trim();
        const pattern = text ? `%${escapeLike(text)}%` : null;
        const safePage = Math.max(1, Math.trunc(page));
        const safeLimit = Math.min(100, Math.max(1, Math.trunc(limit)));

        let filtered = db.orm.public.Project.where({ tenantId });
        if (text) {
          filtered = filtered.where((project) =>
            or(project.code.ilike(pattern!), project.name.ilike(pattern!)),
          );
        }
        if (status) {
          filtered = filtered.where((project) => project.status.eq(status));
        }

        const [rows, { total }] = await Promise.all([
          filtered
            .orderBy((project) => project.createdAt.desc())
            .limit(safeLimit)
            .offset((safePage - 1) * safeLimit)
            .all(),
          filtered.aggregate((aggregate) => ({ total: aggregate.count() })),
        ]);

        const customerIds = [...new Set(rows.map((row) => row.customerId))];
        const customers =
          customerIds.length === 0
            ? []
            : await db.orm.public.Customer
                .where({ tenantId })
                .where((customer) => customer.id.in(customerIds))
                .all();
        const customerById = new Map(
          customers.map((customer) => [customer.id, customer]),
        );

        return {
          rows: rows.map((row) => ({
            id: row.id,
            code: row.code,
            name: row.name,
            description: row.description,
            customerId: row.customerId,
            customerName:
              customerById.get(row.customerId)?.name ?? "Cliente eliminado",
            status: row.status as ProjectStatusValue,
            createdAt: String(row.createdAt),
            updatedAt: String(row.updatedAt),
          })),
          total,
        };
      },

      /** Métricas de portada (datos reales, no mock). */
      getMetrics: async (): Promise<ProjectMetrics> => {
        const [totalAgg, inExecutionAgg, approvedAgg, completedAgg] =
          await Promise.all([
            db.orm.public.Project
              .where({ tenantId })
              .aggregate((aggregate) => ({ total: aggregate.count() })),
            db.orm.public.Project
              .where({ tenantId })
              .where((project) => project.status.eq("IN_EXECUTION"))
              .aggregate((aggregate) => ({ total: aggregate.count() })),
            db.orm.public.Project
              .where({ tenantId })
              .where((project) => project.status.eq("APPROVED"))
              .aggregate((aggregate) => ({ total: aggregate.count() })),
            db.orm.public.Project
              .where({ tenantId })
              .where((project) => project.status.eq("COMPLETED"))
              .aggregate((aggregate) => ({ total: aggregate.count() })),
          ]);

        return {
          total: totalAgg.total,
          inExecution: inExecutionAgg.total,
          approved: approvedAgg.total,
          completed: completedAgg.total,
        };
      },

      /** Detalle completo: proyecto + ficha (ProjectHeader). */
      get: async (id: string): Promise<ProjectDetail | null> => {
        const project = await db.orm.public.Project
          .where({ id, tenantId })
          .first();
        if (!project) {
          return null;
        }

        const [header, customer] = await Promise.all([
          db.orm.public.ProjectHeader.where({ projectId: id }).first(),
          db.orm.public.Customer
            .where({ id: project.customerId, tenantId })
            .select("name")
            .first(),
        ]);

        return {
          id: project.id,
          code: project.code,
          name: project.name,
          description: project.description,
          customerId: project.customerId,
          customerName: customer?.name ?? "Cliente eliminado",
          status: project.status as ProjectStatusValue,
          createdAt: String(project.createdAt),
          updatedAt: String(project.updatedAt),
          header: header ? serializeProjectHeader(header) : null,
        };
      },

      /**
       * Crea un proyecto DRAFT + su ficha (ProjectHeader) en una transacción.
       * El cliente se resuelve DENTRO del tenant (aislamiento multi-tenant):
       * si no existe en este negocio, error. El header arranca como snapshot
       * fiscal del Customer del CRM (maestro — no es segunda fuente maestra).
       * Código correlativo PROY-<año>-NNN por tenant.
       */
      create: async (data: {
        customerId: string;
        name: string;
        description?: string;
      }): Promise<ProjectDetail> => {
        const customer = await db.orm.public.Customer
          .where({ id: data.customerId, tenantId })
          .first();
        if (!customer) {
          throw new Error("Cliente no encontrado en este negocio.");
        }

        const year = currentYearBogota();
        const prefix = `PROY-${year}-`;
        const latest = await db.orm.public.Project
          .where({ tenantId })
          .where((project) => project.code.like(`${prefix}%`))
          .orderBy((project) => project.code.desc())
          .first();
        const sequence = latest
          ? Number(latest.code.slice(prefix.length)) + 1
          : 1;
        const code = `${prefix}${String(sequence).padStart(3, "0")}`;

        const created = await db.transaction(async (tx) => {
          const project = await tx.orm.public.Project.create({
            tenantId,
            customerId: data.customerId,
            code,
            name: data.name,
            description: data.description ?? null,
            status: "DRAFT",
          });
          const header = await tx.orm.public.ProjectHeader.create({
            projectId: project.id,
            clientTaxName: customer.name,
          });
          return { project, header };
        });

        return {
          id: created.project.id,
          code: created.project.code,
          name: created.project.name,
          description: created.project.description,
          customerId: created.project.customerId,
          customerName: customer.name,
          status: "DRAFT",
          createdAt: String(created.project.createdAt),
          updatedAt: String(created.project.updatedAt),
          header: serializeProjectHeader(created.header),
        };
      },

      /**
       * Actualiza el proyecto (nombre/descripción: última escritura gana) y/o
       * cambia su estado con compare-and-set, sin migración: el token de
       * concurrencia es el propio estado, no una revisión.
       *
       * Reglas: la transición se valida contra el grafo del dominio
       * (`canTransitionProjectStatus`); el UPDATE lleva `status =
       * expectedStatus` en su WHERE, así que si otro request cambió el estado
       * entretanto no toca la fila y se responde `STALE_STATUS`. Los estados
       * terminales (COMPLETED/CANCELLED) no admiten salida. Un guardado sin
       * cambios no escribe nada.
       *
       * Errores tipados: `NOT_FOUND`, `MISSING_EXPECTED_STATUS`,
       * `INVALID_TRANSITION`, `STALE_STATUS`.
       */
      updateProject: async (
        id: string,
        input: UpdateProjectInput,
      ): Promise<ProjectStatusValue> => {
        const project = await db.orm.public.Project
          .where({ id, tenantId })
          .select("id", "status")
          .first();
        if (!project) {
          throw new Error("NOT_FOUND");
        }
        const current = project.status as ProjectStatusValue;

        const patch: {
          name?: string;
          description?: string | null;
          status?: ProjectStatusValue;
        } = {};
        if (input.name !== undefined) {
          patch.name = input.name;
        }
        if (input.description !== undefined) {
          patch.description = input.description;
        }

        if (input.status !== undefined && input.status !== current) {
          if (!input.expectedStatus) {
            throw new Error("MISSING_EXPECTED_STATUS");
          }
          if (input.expectedStatus !== current) {
            throw new Error("STALE_STATUS");
          }
          if (!canTransitionProjectStatus(current, input.status)) {
            throw new Error("INVALID_TRANSITION");
          }
          patch.status = input.status;
        }

        // Sin cambios: no escribe.
        if (Object.keys(patch).length === 0) {
          return current;
        }

        await db.transaction(async (tx) => {
          if (patch.status === undefined) {
            await tx.orm.public.Project.where({ id, tenantId }).update(patch);
            return;
          }
          // Compare-and-set: el WHERE incluye el estado esperado.
          await tx.orm.public.Project
            .where({ id, tenantId, status: input.expectedStatus })
            .update(patch);
          const after = await tx.orm.public.Project
            .where({ id, tenantId })
            .select("status")
            .first();
          if (
            !after ||
            (after.status as ProjectStatusValue) !== patch.status
          ) {
            throw new Error("STALE_STATUS");
          }
        });

        return patch.status ?? current;
      },

      /** Elimina el proyecto (la ficha se borra en cascada). */
      delete: (id: string) =>
        db.orm.public.Project.where({ id, tenantId }).delete(),
    },

    projectHeaders: {
      /** Lee la ficha solo si el proyecto pertenece a este tenant. */
      get: async (projectId: string): Promise<ProjectHeaderData | null> => {
        const project = await db.orm.public.Project
          .where({ id: projectId, tenantId })
          .select("id")
          .first();
        if (!project) {
          return null;
        }
        const header = await db.orm.public.ProjectHeader
          .where({ projectId })
          .first();
        return header ? serializeProjectHeader(header) : null;
      },

      /** Actualiza la ficha validando el tenant del proyecto. */
      update: async (
        projectId: string,
        data: ProjectHeaderInput,
      ): Promise<ProjectHeaderData | null> => {
        const project = await db.orm.public.Project
          .where({ id: projectId, tenantId })
          .select("id")
          .first();
        if (!project) {
          return null;
        }
        await db.orm.public.ProjectHeader.where({ projectId }).update(data);
        const header = await db.orm.public.ProjectHeader
          .where({ projectId })
          .first();
        return header ? serializeProjectHeader(header) : null;
      },
    },

    budgets: {
      /** Presupuesto del proyecto (con árbol completo) o `null` si no existe. */
      get: async (projectId: string): Promise<ProjectBudgetData | null> => {
        const budget = await db.orm.public.ProjectBudget
          .where({ projectId, tenantId })
          .first();
        return budget ? loadBudgetTree(budget) : null;
      },

      /**
       * Devuelve el presupuesto del proyecto creándolo si no existe (1:1 con
       * Project). Idempotente ante concurrencia: si otro request lo creó
       * primero, la restricción única por `projectId` aborta el INSERT y se
       * relee la fila ganadora.
       */
      getOrCreate: async (projectId: string): Promise<ProjectBudgetData> => {
        const existing = await db.orm.public.ProjectBudget
          .where({ projectId, tenantId })
          .first();
        if (existing) {
          return loadBudgetTree(existing);
        }

        const project = await db.orm.public.Project
          .where({ id: projectId, tenantId })
          .first();
        if (!project) {
          throw new Error("Proyecto no encontrado en este negocio.");
        }

        const prefix = `PRES-${currentYearBogota()}-`;
        const sequenceFrom = (code?: string | null): number => {
          if (!code || !code.startsWith(prefix)) {
            return 0;
          }
          const digits = Number(code.slice(prefix.length));
          return Number.isFinite(digits) ? digits : 0;
        };

        // El código humano PRES-AAAA-NNN es único en TODO el tenant: Quote y
        // ProjectBudget comparten la numeración (etapa 1, ajuste F). Se toma el
        // máximo de ambas tablas y se reintenta si una carrera lo ocupa.
        let lastError: unknown = null;
        for (let attempt = 0; attempt < 3; attempt += 1) {
          const [latestBudget, latestQuote] = await Promise.all([
            db.orm.public.ProjectBudget
              .where({ tenantId })
              .where((budget) => budget.code.like(`${prefix}%`))
              .orderBy((budget) => budget.code.desc())
              .first(),
            db.orm.public.Quote
              .where({ tenantId })
              .where((quote) => quote.code.like(`${prefix}%`))
              .orderBy((quote) => quote.code.desc())
              .first(),
          ]);
          const sequence =
            Math.max(
              sequenceFrom(latestBudget?.code),
              sequenceFrom(latestQuote?.code),
            ) + 1;
          const code = `${prefix}${String(sequence).padStart(3, "0")}`;
          try {
            const created = await db.orm.public.ProjectBudget.create({
              tenantId,
              projectId,
              code,
              name: `Presupuesto — ${project.name}`,
              aiuAdminPct: AIU_DEFAULTS.adminPct,
              aiuImprevPct: AIU_DEFAULTS.imprevPct,
              aiuUtilidadPct: AIU_DEFAULTS.utilidadPct,
              ivaUtilidadPct: AIU_DEFAULTS.ivaUtilidadPct,
            });
            return loadBudgetTree(created);
          } catch (error) {
            lastError = error;
            const raced = await db.orm.public.ProjectBudget
              .where({ projectId, tenantId })
              .first();
            if (raced) {
              return loadBudgetTree(raced);
            }
          }
        }
        throw lastError ?? new Error("No se pudo crear el presupuesto.");
      },

      /** Crea un capítulo al final del presupuesto. Rechaza si está bloqueado. */
      createChapter: async (
        projectId: string,
        input: CreateChapterInput,
        expectedRevision?: number,
      ): Promise<{ id: string }> => {
        const budget = await db.orm.public.ProjectBudget
          .where({ projectId, tenantId })
          .first();
        if (!budget) {
          throw new Error("Presupuesto no encontrado en este negocio.");
        }
        if (budget.isLocked) {
          throw new Error("El presupuesto está bloqueado.");
        }
        assertRevision(budget, expectedRevision);
        const chapter = await db.transaction(async (tx) => {
          const last = await tx.orm.public.BudgetChapter
            .where({ budgetId: budget.id })
            .orderBy((chapter) => chapter.order.desc())
            .first();
          const order = last ? last.order + 1 : 1;
          const created = await tx.orm.public.BudgetChapter.create({
            tenantId,
            budgetId: budget.id,
            order,
            name: input.name,
            description: input.description ?? null,
          });
          await bumpRevision(tx, budget);
          return created;
        });
        return { id: chapter.id };
      },

      /**
       * Crea una partida bajo un capítulo y recalcula los totales del
       * presupuesto en la misma transacción. El costo total lo computa el
       * servidor (nunca se confía en el cliente).
       */
      createItem: async (
        projectId: string,
        input: CreateBudgetItemInput,
        expectedRevision?: number,
      ): Promise<{ id: string }> => {
        const budget = await db.orm.public.ProjectBudget
          .where({ projectId, tenantId })
          .first();
        if (!budget) {
          throw new Error("Presupuesto no encontrado en este negocio.");
        }
        if (budget.isLocked) {
          throw new Error("El presupuesto está bloqueado.");
        }
        assertRevision(budget, expectedRevision);
        const chapter = await db.orm.public.BudgetChapter
          .where({ id: input.chapterId, budgetId: budget.id })
          .select("id")
          .first();
        if (!chapter) {
          throw new Error("Capítulo no encontrado en este presupuesto.");
        }

        const totalCostDirect = calculateItemTotal(
          input.quantity,
          input.unitCostDirect,
        );

        const created = await db.transaction(async (tx) => {
          const last = await tx.orm.public.BudgetItem
            .where({ chapterId: input.chapterId })
            .orderBy((item) => item.order.desc())
            .first();
          const order = last ? last.order + 1 : 1;
          const item = await tx.orm.public.BudgetItem.create({
            tenantId,
            chapterId: input.chapterId,
            order,
            code: input.code,
            description: input.description,
            unit: input.unit,
            quantity: input.quantity,
            unitCostDirect: input.unitCostDirect,
            totalCostDirect,
          });
          await recalcBudgetTotals(tx, budget.id, {
            admin: budget.aiuAdminPct,
            imprev: budget.aiuImprevPct,
            utilidad: budget.aiuUtilidadPct,
            iva: budget.ivaUtilidadPct,
          });
          await bumpRevision(tx, budget);
          return item;
        });
        return { id: created.id };
      },

      /**
       * Importa una actividad de la Biblioteca Maestra APU (`ApuActivity`)
       * como una NUEVA partida (`BudgetItem`) del presupuesto del proyecto,
       * con sus recursos congelados como snapshot inmutable.
       *
       * Congelado de precios: se COPIAN nombre, unidad, rendimiento, precio y
       * desperdicio de cada insumo, más el costo unitario resultante. La
       * partida NO depende del catálogo: si la actividad o sus insumos cambian
       * después, la partida importada no se altera. La trazabilidad se conserva
       * con `sourceActivityId` / `sourceItemId`.
       *
       * Aritmética de punto fijo `BigInt` (6 decimales), idéntica al motor y a
       * `updateResource`:
       *   totalPrice_línea = performance × (SCALE + wastePct) × unitPrice / SCALE²
       * con redondeo half-up y `wastePct` como fracción (1_000_000 = 100 %).
       * El desperdicio del catálogo es un porcentaje (10 = 10 %) y se convierte
       * a la fracción almacenada dividiendo por 100.
       */
      importActivityFromCatalog: async (
        projectId: string,
        chapterId: string,
        activityId: string,
        quantity: bigint = BigInt(1_000_000),
        expectedRevision?: number,
      ): Promise<{ id: string }> => {
        const budget = await db.orm.public.ProjectBudget
          .where({ projectId, tenantId })
          .first();
        if (!budget) {
          throw new Error("Presupuesto no encontrado en este negocio.");
        }
        if (budget.isLocked) {
          throw new Error("El presupuesto está bloqueado.");
        }
        assertRevision(budget, expectedRevision);

        const chapter = await db.orm.public.BudgetChapter
          .where({ id: chapterId, budgetId: budget.id })
          .select("id")
          .first();
        if (!chapter) {
          throw new Error("Capítulo no encontrado en este presupuesto.");
        }

        const activity = await db.orm.public.ApuActivity
          .where({ id: activityId, tenantId })
          .first();
        if (!activity) {
          throw new Error("Actividad del catálogo no encontrada.");
        }

        const compositions = (await db.orm.public.ApuActivityComposition
          .where({ activityId })
          .include("item", (item) =>
            item.select(
              "id",
              "tenantId",
              "name",
              "unit",
              "category",
              "unitPrice",
              "imageUrl",
            ),
          )
          .all()) as unknown as ImportCompositionRow[];

        if (compositions.length === 0) {
          throw new Error("La actividad no tiene composición APU para importar.");
        }

        const resources: {
          type: ResourceTypeValue;
          name: string;
          unit: string;
          performance: bigint;
          unitPrice: bigint;
          totalPrice: bigint;
          wastePct: bigint;
          imageUrl: string | null;
          sourceItemId: string;
        }[] = [];
        let unitCostDirect = BigInt(0);

        for (const composition of compositions) {
          const item = composition.item;
          // Defensa en profundidad: un insumo de otro tenant jamás entra.
          if (!item || item.tenantId !== tenantId) {
            continue;
          }
          const unitPrice = decimalToMicro(String(item.unitPrice));
          const performance = decimalToMicro(String(composition.consumption));
          const wastePercentMicro = decimalToMicro(
            String(composition.wastePercent),
          );
          if (
            unitPrice === null ||
            performance === null ||
            wastePercentMicro === null
          ) {
            throw new Error(`Insumo con valores decimales inválidos: ${item.name}.`);
          }
          // Porcentaje del catálogo (10 = 10 %) → fracción almacenada (100_000 = 10 %).
          const wastePct = wastePercentMicro / BigInt(100);
          const lineCost = resourceLineCostMicro({
            performance,
            wastePct,
            unitPrice,
          });
          unitCostDirect += lineCost;
          resources.push({
            type: apuItemCategoryToResourceType(item.category),
            name: item.name,
            unit: item.unit,
            performance,
            unitPrice,
            totalPrice: lineCost,
            wastePct,
            imageUrl: item.imageUrl ?? null,
            sourceItemId: item.id,
          });
        }

        if (resources.length === 0) {
          throw new Error("La actividad no tiene insumos válidos para importar.");
        }

        const totalCostDirect = calculateItemTotal(quantity, unitCostDirect);

        const created = await db.transaction(async (tx) => {
          const last = await tx.orm.public.BudgetItem
            .where({ chapterId })
            .orderBy((item) => item.order.desc())
            .first();
          const order = last ? last.order + 1 : 1;
          const item = await tx.orm.public.BudgetItem.create({
            tenantId,
            chapterId,
            order,
            code: activity.code ?? activity.name,
            description: activity.name,
            unit: activity.unit,
            quantity,
            unitCostDirect,
            totalCostDirect,
            sourceActivityId: activity.id,
          });
          for (const resource of resources) {
            await tx.orm.public.BudgetItemResource.create({
              tenantId,
              itemId: item.id,
              type: resource.type,
              name: resource.name,
              unit: resource.unit,
              performance: resource.performance,
              unitPrice: resource.unitPrice,
              totalPrice: resource.totalPrice,
              imageUrl: resource.imageUrl,
              wastePct: resource.wastePct,
              sourceItemId: resource.sourceItemId,
            });
          }
          await recalcBudgetTotals(tx, budget.id, {
            admin: budget.aiuAdminPct,
            imprev: budget.aiuImprevPct,
            utilidad: budget.aiuUtilidadPct,
            iva: budget.ivaUtilidadPct,
          });
          await bumpRevision(tx, budget);
          return item;
        });
        return { id: created.id };
      },

      /**
       * Actualiza la configuración AIU y recalcula toda la cascada en la
       * misma transacción.
       */
      updateAiu: async (
        projectId: string,
        config: AiuConfigInput,
        expectedRevision?: number,
      ): Promise<void> => {
        const budget = await db.orm.public.ProjectBudget
          .where({ projectId, tenantId })
          .first();
        if (!budget) {
          throw new Error("Presupuesto no encontrado en este negocio.");
        }
        if (budget.isLocked) {
          throw new Error("El presupuesto está bloqueado.");
        }
        assertRevision(budget, expectedRevision);
        // Sin cambios: no se escribe ni se avanza la revisión.
        if (isUnchangedAiu(budget, config)) {
          return;
        }
        await db.transaction(async (tx) => {
          await bumpRevision(tx, budget, {
            aiuAdminPct: config.adminPct,
            aiuImprevPct: config.imprevPct,
            aiuUtilidadPct: config.utilidadPct,
            ivaUtilidadPct: config.ivaUtilidadPct,
          });
          await recalcBudgetTotals(tx, budget.id, {
            admin: config.adminPct,
            imprev: config.imprevPct,
            utilidad: config.utilidadPct,
            iva: config.ivaUtilidadPct,
          });
        });
      },

      /** Bloquea / desbloquea el presupuesto (impide crear capítulos/ítems). */
      setLocked: async (
        projectId: string,
        isLocked: boolean,
        expectedRevision?: number,
        reason?: string,
        userId?: string,
      ): Promise<void> => {
        const budget = await db.orm.public.ProjectBudget
          .where({ projectId, tenantId })
          .first();
        if (!budget) {
          throw new Error("Presupuesto no encontrado en este negocio.");
        }
        if (!isLocked && (reason === undefined || reason.trim() === "")) {
          throw new Error("Desbloqueo requiere un motivo.");
        }
        assertRevision(budget, expectedRevision);
        const action = isLocked ? "LOCK" : "UNLOCK";
        await db.transaction(async (tx) => {
          await bumpRevision(tx, budget, { isLocked });
          await tx.orm.public.BudgetLockEvent.create({
            tenantId,
            budgetId: budget.id,
            action,
            reason: reason?.trim() || null,
            userId: userId ?? "system",
          });
        });
      },

      /**
       * Elimina un capítulo (y sus partidas, en cascada). Rechaza si el
       * presupuesto está bloqueado. Recalcula los totales en la transacción.
       */
      deleteChapter: async (
        projectId: string,
        chapterId: string,
        expectedRevision?: number,
      ): Promise<void> => {
        const budget = await db.orm.public.ProjectBudget
          .where({ projectId, tenantId })
          .first();
        if (!budget) {
          throw new Error("Presupuesto no encontrado en este negocio.");
        }
        if (budget.isLocked) {
          throw new Error("El presupuesto está bloqueado.");
        }
        assertRevision(budget, expectedRevision);
        const chapter = await db.orm.public.BudgetChapter
          .where({ id: chapterId, budgetId: budget.id })
          .select("id")
          .first();
        if (!chapter) {
          throw new Error("Capítulo no encontrado en este presupuesto.");
        }
        await db.transaction(async (tx) => {
          await tx.orm.public.BudgetChapter
            .where({ id: chapterId, budgetId: budget.id })
            .delete();
          await recalcBudgetTotals(tx, budget.id, {
            admin: budget.aiuAdminPct,
            imprev: budget.aiuImprevPct,
            utilidad: budget.aiuUtilidadPct,
            iva: budget.ivaUtilidadPct,
          });
          await bumpRevision(tx, budget);
        });
      },

      /**
       * Elimina una partida (y sus recursos, en cascada). Valida pertenencia
       * capítulo→presupuesto. Rechaza si el presupuesto está bloqueado.
       */
      deleteItem: async (
        projectId: string,
        itemId: string,
        expectedRevision?: number,
      ): Promise<void> => {
        const budget = await db.orm.public.ProjectBudget
          .where({ projectId, tenantId })
          .first();
        if (!budget) {
          throw new Error("Presupuesto no encontrado en este negocio.");
        }
        if (budget.isLocked) {
          throw new Error("El presupuesto está bloqueado.");
        }
        assertRevision(budget, expectedRevision);
        const item = await db.orm.public.BudgetItem
          .where({ id: itemId, tenantId })
          .first();
        if (!item) {
          throw new Error("Partida no encontrada en este presupuesto.");
        }
        const chapter = await db.orm.public.BudgetChapter
          .where({ id: item.chapterId, budgetId: budget.id })
          .select("id")
          .first();
        if (!chapter) {
          throw new Error("Partida no encontrada en este presupuesto.");
        }
        await db.transaction(async (tx) => {
          await tx.orm.public.BudgetItem
            .where({ id: itemId, tenantId })
            .delete();
          await recalcBudgetTotals(tx, budget.id, {
            admin: budget.aiuAdminPct,
            imprev: budget.aiuImprevPct,
            utilidad: budget.aiuUtilidadPct,
            iva: budget.ivaUtilidadPct,
          });
          await bumpRevision(tx, budget);
        });
      },

      /**
       * Renombra o re-describe un capítulo. Valida capítulo→presupuesto,
       * rechaza si está bloqueado y avanza la revisión del presupuesto.
       */
      updateChapter: async (
        projectId: string,
        chapterId: string,
        input: UpdateChapterInput,
        expectedRevision?: number,
      ): Promise<void> => {
        const budget = await db.orm.public.ProjectBudget
          .where({ projectId, tenantId })
          .first();
        if (!budget) {
          throw new Error("Presupuesto no encontrado en este negocio.");
        }
        if (budget.isLocked) {
          throw new Error("El presupuesto está bloqueado.");
        }
        assertRevision(budget, expectedRevision);
        const chapter = await db.orm.public.BudgetChapter
          .where({ id: chapterId, budgetId: budget.id })
          .select("id", "name", "description")
          .first();
        if (!chapter) {
          throw new Error("Capítulo no encontrado en este presupuesto.");
        }
        // Sin cambios: no se escribe ni se avanza la revisión.
        if (isUnchangedChapter(chapter, input)) {
          return;
        }
        await db.transaction(async (tx) => {
          await tx.orm.public.BudgetChapter
            .where({ id: chapterId, budgetId: budget.id })
            .update({
              name: input.name,
              description: input.description ?? null,
            });
          await bumpRevision(tx, budget);
        });
      },

      /**
       * Edita una partida: el servidor recalcula su total directo y toda la
       * cascada AIU en la misma transacción. Valida pertenencia
       * partida→capítulo→presupuesto. Rechaza si está bloqueado.
       */
      updateItem: async (
        projectId: string,
        itemId: string,
        input: UpdateBudgetItemInput,
        expectedRevision?: number,
      ): Promise<void> => {
        const budget = await db.orm.public.ProjectBudget
          .where({ projectId, tenantId })
          .first();
        if (!budget) {
          throw new Error("Presupuesto no encontrado en este negocio.");
        }
        if (budget.isLocked) {
          throw new Error("El presupuesto está bloqueado.");
        }
        assertRevision(budget, expectedRevision);
        const item = await db.orm.public.BudgetItem
          .where({ id: itemId, tenantId })
          .first();
        if (!item) {
          throw new Error("Partida no encontrada en este presupuesto.");
        }
        const chapter = await db.orm.public.BudgetChapter
          .where({ id: item.chapterId, budgetId: budget.id })
          .select("id")
          .first();
        if (!chapter) {
          throw new Error("Partida no encontrada en este presupuesto.");
        }
        // Sin cambios: no se escribe ni se avanza la revisión.
        if (isUnchangedItem(item, input)) {
          return;
        }
        const totalCostDirect = calculateItemTotal(
          input.quantity,
          input.unitCostDirect,
        );
        await db.transaction(async (tx) => {
          await tx.orm.public.BudgetItem
            .where({ id: itemId, tenantId })
            .update({
              code: input.code,
              description: input.description,
              unit: input.unit,
              quantity: input.quantity,
              unitCostDirect: input.unitCostDirect,
              totalCostDirect,
            });
          await recalcBudgetTotals(tx, budget.id, {
            admin: budget.aiuAdminPct,
            imprev: budget.aiuImprevPct,
            utilidad: budget.aiuUtilidadPct,
            iva: budget.ivaUtilidadPct,
          });
          await bumpRevision(tx, budget);
        });
      },

      /**
       * Auditoría de integridad (solo lectura): recalcula la cascada AIU
       * desde las partidas reales y la compara con los totales persistidos.
       * No escribe nada; sirve para detectar deriva de datos (Etapa 1).
       */
      verifyTotals: async (projectId: string): Promise<BudgetTotalsCheck> => {
        const budget = await db.orm.public.ProjectBudget
          .where({ projectId, tenantId })
          .first();
        if (!budget) {
          throw new Error("Presupuesto no encontrado en este negocio.");
        }
        const direct = await sumBudgetDirect(db, budget.id);
        const computed = calculateBudgetTotals(
          direct,
          budget.aiuAdminPct,
          budget.aiuImprevPct,
          budget.aiuUtilidadPct,
          budget.ivaUtilidadPct,
        );
        const pairs: Array<{
          field: string;
          expected: bigint;
          found: bigint;
        }> = [
          {
            field: "directCostTotal",
            expected: direct,
            found: budget.directCostTotal,
          },
          {
            field: "adminTotal",
            expected: computed.adminTotal,
            found: budget.adminTotal,
          },
          {
            field: "imprevTotal",
            expected: computed.imprevTotal,
            found: budget.imprevTotal,
          },
          {
            field: "utilidadTotal",
            expected: computed.utilidadTotal,
            found: budget.utilidadTotal,
          },
          {
            field: "ivaUtilidadTotal",
            expected: computed.ivaUtilidadTotal,
            found: budget.ivaUtilidadTotal,
          },
          {
            field: "grandTotal",
            expected: computed.grandTotal,
            found: budget.grandTotal,
          },
        ];
        const mismatches = pairs
          .filter((pair) => pair.expected !== pair.found)
          .map((pair) => ({
            field: pair.field,
            expected: pair.expected.toString(),
            found: pair.found.toString(),
          }));
        return {
          ok: mismatches.length === 0,
          directCostTotal: direct.toString(),
          grandTotal: computed.grandTotal.toString(),
          mismatches,
        };
      },

      /** Líneas base aprobadas del presupuesto, de la más reciente a la más vieja. */
      listBaselines: async (
        projectId: string,
      ): Promise<BudgetBaselineData[]> => {
        const budget = await db.orm.public.ProjectBudget
          .where({ projectId, tenantId })
          .first();
        if (!budget) {
          return [];
        }
        const rows = await db.orm.public.BudgetBaseline
          .where({ budgetId: budget.id, tenantId })
          .orderBy((baseline) => baseline.version.desc())
          .all();
        return rows.map((row) => ({
          id: row.id,
          version: row.version,
          budgetRevision: row.budgetRevision,
          directCostTotal: row.directCostTotal.toString(),
          adminTotal: row.adminTotal.toString(),
          imprevTotal: row.imprevTotal.toString(),
          utilidadTotal: row.utilidadTotal.toString(),
          ivaUtilidadTotal: row.ivaUtilidadTotal.toString(),
          grandTotal: row.grandTotal.toString(),
          chapterCount: row.chapterCount,
          itemCount: row.itemCount,
          note: row.note,
          approvedById: row.approvedById,
          approvedByName: row.approvedByName,
          createdAt: formatDateTime(row.createdAt),
        }));
      },

      /**
       * Aprueba una línea base: congela la revisión, los totales recalculados y
       * los conteos actuales del presupuesto. Permitido aunque esté bloqueado
       * (aprobar no muta el contenido); el rol D7 lo exige la action.
       */
      approveBaseline: async (
        projectId: string,
        input: { userId: string; userName: string; note?: string },
      ): Promise<{ id: string; version: number }> => {
        const budget = await db.orm.public.ProjectBudget
          .where({ projectId, tenantId })
          .first();
        if (!budget) {
          throw new Error("Presupuesto no encontrado en este negocio.");
        }
        const created = await db.transaction(async (tx) => {
          await lockRevision(tx, budget);
          const direct = await sumBudgetDirect(tx, budget.id);
          const totals = calculateBudgetTotals(
            direct,
            budget.aiuAdminPct,
            budget.aiuImprevPct,
            budget.aiuUtilidadPct,
            budget.ivaUtilidadPct,
          );
          const chapters = await tx.orm.public.BudgetChapter
            .where({ budgetId: budget.id })
            .orderBy((chapter) => chapter.order.asc())
            .select("id", "order", "name")
            .all();
          const chapterIds = chapters.map((chapter) => chapter.id);
          const items = chapterIds.length
            ? await tx.orm.public.BudgetItem
                .where((item) => item.chapterId.in(chapterIds))
                .select("chapterId", "totalCostDirect")
                .all()
            : [];
          const subtotalByChapter = new Map<string, bigint>();
          for (const item of items) {
            subtotalByChapter.set(
              item.chapterId,
              (subtotalByChapter.get(item.chapterId) ?? BigInt(0)) +
                BigInt(item.totalCostDirect),
            );
          }
          const snapshot = chapters.map((chapter) => ({
            order: chapter.order,
            name: chapter.name,
            subtotal: (
              subtotalByChapter.get(chapter.id) ?? BigInt(0)
            ).toString(),
          }));
          const last = await tx.orm.public.BudgetBaseline
            .where({ budgetId: budget.id })
            .orderBy((baseline) => baseline.version.desc())
            .first();
          const version = last ? last.version + 1 : 1;
          const baseline = await tx.orm.public.BudgetBaseline.create({
            tenantId,
            budgetId: budget.id,
            budgetRevision: budget.revision,
            version,
            directCostTotal: direct,
            adminTotal: totals.adminTotal,
            imprevTotal: totals.imprevTotal,
            utilidadTotal: totals.utilidadTotal,
            ivaUtilidadTotal: totals.ivaUtilidadTotal,
            grandTotal: totals.grandTotal,
            chapterCount: chapters.length,
            itemCount: items.length,
            snapshot: snapshot as never,
            note: input.note?.trim() ? input.note.trim() : null,
            approvedById: input.userId,
            approvedByName: input.userName,
          });
          return baseline;
        });
        return { id: created.id, version: created.version };
      },
      /**
       * Actualiza un recurso de una partida: rendimiento (`performance`) y/o
       * porcentaje de desperdicio (`wastePct`, fracción en micro). Valida la
       * pertenencia proyecto → capítulo → partida → recurso y rechaza si el
       * presupuesto está bloqueado (concurrencia optimista vía `expectedRevision`).
       *
       * Recalcula en la misma transacción el `totalPrice` de cada línea, el
       * costo unitario directo de la partida (Σ de líneas) y el total
       * (`quantity × unitCostDirect`), más la cascada AIU. Devuelve la nueva
       * revisión para encadenar ediciones sin caer en `STALE_REVISION`.
       */
      updateResource: async (
        projectId: string,
        resourceId: string,
        updates: { performance?: bigint | string; wastePct?: bigint | string },
        expectedRevision?: number,
      ): Promise<{ revision: number }> => {
        const budget = await db.orm.public.ProjectBudget
          .where({ projectId, tenantId })
          .first();
        if (!budget) {
          throw new Error("Presupuesto no encontrado en este negocio.");
        }
        if (budget.isLocked) {
          throw new Error("El presupuesto está bloqueado.");
        }
        assertRevision(budget, expectedRevision);

        const resource = await db.orm.public.BudgetItemResource
          .where({ id: resourceId, tenantId })
          .first();
        if (!resource) {
          throw new Error("Recurso no encontrado en este negocio.");
        }

        const item = await db.orm.public.BudgetItem
          .where({ id: resource.itemId, tenantId })
          .first();
        if (!item) {
          throw new Error("Partida no encontrada en este negocio.");
        }
        if (item.chapterId) {
          const chapter = await db.orm.public.BudgetChapter
            .where({ id: item.chapterId, budgetId: budget.id })
            .select("id")
            .first();
          if (!chapter) {
            throw new Error("Partida no encontrada en este presupuesto.");
          }
        }

        const updateData: { performance?: bigint; wastePct?: bigint } = {};
        if (updates.performance !== undefined) {
          const performance =
            typeof updates.performance === "bigint"
              ? updates.performance
              : BigInt(updates.performance);
          if (performance <= BigInt(0)) {
            throw new Error("El rendimiento debe ser mayor a cero.");
          }
          updateData.performance = performance;
        }
        if (updates.wastePct !== undefined) {
          const wastePct =
            typeof updates.wastePct === "bigint"
              ? updates.wastePct
              : BigInt(updates.wastePct);
          if (wastePct < BigInt(0)) {
            throw new Error("El desperdicio no puede ser negativo.");
          }
          // Mismo tope que el validador de la action (WASTE_PCT_MAX = 100 %);
          // la capa de datos no confía en que todo llamador valide.
          if (wastePct > BigInt(1_000_000)) {
            throw new Error("El desperdicio no puede superar el 100 %.");
          }
          updateData.wastePct = wastePct;
        }

        const revision = await db.transaction(async (tx) => {
          if (Object.keys(updateData).length > 0) {
            await tx.orm.public.BudgetItemResource
              .where({ id: resourceId, tenantId })
              .update(updateData);
          }

          // Se recalculan TODAS las líneas del ítem: el `totalPrice` de cada
          // una se refresca (para que la vista previa del APU no quede
          // desincronizada) y el costo unitario directo de la partida es la
          // Σ de las líneas, con la aritmética de punto fijo del proyecto.
          const allResources = await tx.orm.public.BudgetItemResource
            .where({ itemId: resource.itemId, tenantId })
            .all();

          let unitCostDirect = BigInt(0);
          for (const res of allResources) {
            const lineCost = resourceLineCostMicro({
              performance: res.performance,
              wastePct: res.wastePct,
              unitPrice: res.unitPrice,
            });
            unitCostDirect += lineCost;
            if (BigInt(res.totalPrice) !== lineCost) {
              await tx.orm.public.BudgetItemResource
                .where({ id: res.id, tenantId })
                .update({ totalPrice: lineCost });
            }
          }

          // Costo directo total de la partida = quantity × unitCostDirect.
          const totalCostDirect = calculateItemTotal(
            item.quantity,
            unitCostDirect,
          );

          await tx.orm.public.BudgetItem
            .where({ id: item.id, tenantId })
            .update({ unitCostDirect, totalCostDirect });

          await recalcBudgetTotals(tx, budget.id, {
            admin: budget.aiuAdminPct,
            imprev: budget.aiuImprevPct,
            utilidad: budget.aiuUtilidadPct,
            iva: budget.ivaUtilidadPct,
          });
          return bumpRevision(tx, budget);
        });

        return { revision };
      },


    },

    lean: {
      /** Plan Lean del proyecto (con tareas y compromisos), o null. */
      getPlan: async (projectId: string): Promise<ProjectPlanData | null> => {
        const plan = await db.orm.public.ProjectPlan
          .where({ projectId, tenantId })
          .first();
        return plan ? loadLeanPlan(plan) : null;
      },

      /**
       * Devuelve el plan Lean del proyecto, creándolo si no existe (1:1 vía
       * `projectId @unique`). La ventana se ancla al lunes de la semana
       * operativa actual (America/Bogota). Idempotente ante concurrencia.
       */
      getOrCreatePlan: async (projectId: string): Promise<ProjectPlanData> => {
        const existing = await db.orm.public.ProjectPlan
          .where({ projectId, tenantId })
          .first();
        if (existing) {
          return loadLeanPlan(existing);
        }

        const project = await db.orm.public.Project
          .where({ id: projectId, tenantId })
          .first();
        if (!project) {
          throw new Error("Proyecto no encontrado en este negocio.");
        }

        const windowStart = formatPlainDate(currentWindowStart());
        try {
          const created = await db.orm.public.ProjectPlan.create({
            tenantId,
            projectId,
            name: `Plan Operativo — ${project.name}`,
            windowStartDate: bogotaInstantFromIsoDate(windowStart),
          });
          return loadLeanPlan(created);
        } catch (error) {
          const raced = await db.orm.public.ProjectPlan
            .where({ projectId, tenantId })
            .first();
          if (raced) {
            return loadLeanPlan(raced);
          }
          throw error;
        }
      },

      /**
       * Crea una tarea del Lookahead. La semana relativa se DERIVA de la fecha
       * de inicio respecto al ancla de la ventana (no se confía en el cliente)
       * y se exige que coincida con la semana declarada y caiga en 1..6.
       */
      createLookaheadTask: async (
        projectId: string,
        input: CreateLookaheadTaskInput,
      ): Promise<{ id: string }> => {
        const plan = await db.orm.public.ProjectPlan
          .where({ projectId, tenantId })
          .first();
        if (!plan) {
          throw new Error("Plan no encontrado en este negocio.");
        }

        const startDate = bogotaToday(`${input.startDate}T12:00:00Z`);
        const endDate = bogotaToday(`${input.endDate}T12:00:00Z`);
        const windowStart = bogotaToday(String(plan.windowStartDate));
        const derivedWeek = relativeWeekNumber(windowStart, startDate);
        if (derivedWeek !== input.weekNumber) {
          throw new Error(
            "Las fechas no corresponden a la semana de la ventana indicada.",
          );
        }
        if (derivedWeek < 1 || derivedWeek > WINDOW_WEEKS) {
          throw new Error(
            `La semana debe estar entre 1 y ${WINDOW_WEEKS}.`,
          );
        }
        if (daysBetween(startDate, endDate) < 0) {
          throw new Error("La fecha de fin no puede ser anterior a la de inicio.");
        }

        const created = await db.orm.public.LookaheadTask.create({
          tenantId,
          planId: plan.id,
          code: input.code,
          description: input.description,
          weekNumber: derivedWeek,
          startDate: bogotaInstantFromIsoDate(input.startDate),
          endDate: bogotaInstantFromIsoDate(input.endDate),
          responsible: input.responsible,
          isRestricted: input.isRestricted,
          notes: input.notes ?? null,
        });
        return { id: created.id };
      },

      /**
       * Crea un compromiso semanal. La semana calendario ISO y su año se
       * DERIVAN de `weekStartDate` en el servidor; el estado inicial es
       * PENDING y sin datos de fallo.
       */
      createCommitment: async (
        projectId: string,
        input: CreateCommitmentInput,
      ): Promise<{ id: string }> => {
        const plan = await db.orm.public.ProjectPlan
          .where({ projectId, tenantId })
          .first();
        if (!plan) {
          throw new Error("Plan no encontrado en este negocio.");
        }

        const weekStart = bogotaToday(`${input.weekStartDate}T12:00:00Z`);
        const { year, week } = isoWeekOf(weekStart);

        const created = await db.orm.public.WeeklyCommitment.create({
          tenantId,
          planId: plan.id,
          weekNumber: week,
          year,
          description: input.description,
          responsible: input.responsible,
          status: "PENDING",
          failureCause: null,
          failureNotes: null,
        });
        return { id: created.id };
      },

      /**
       * Cambia el resultado de un compromiso. Si pasa a FAILED se admite causa
       * CNC (y notas); en cualquier otro estado se limpian los datos de fallo
       * para no dejar información obsoleta.
       */
      updateCommitmentStatus: async (
        projectId: string,
        commitmentId: string,
        input: UpdateCommitmentStatusInput,
      ): Promise<void> => {
        const plan = await db.orm.public.ProjectPlan
          .where({ projectId, tenantId })
          .select("id")
          .first();
        if (!plan) {
          throw new Error("Plan no encontrado en este negocio.");
        }
        const commitment = await db.orm.public.WeeklyCommitment
          .where({ id: commitmentId, planId: plan.id })
          .first();
        if (!commitment) {
          throw new Error("Compromiso no encontrado en este plan.");
        }

        const isFailed = input.status === "FAILED";
        await db.orm.public.WeeklyCommitment
          .where({ id: commitment.id })
          .update({
            status: input.status,
            failureCause: input.status === "FAILED" ? (input.failureCause ?? null) : null,
            failureNotes: input.status === "FAILED" ? (input.failureNotes ?? null) : null,
          });
        void isFailed;
      },

      /**
       * Desplaza la ventana operativa `deltaWeeks` semanas (positivo = futuro)
       * y recalcula la semana relativa de cada tarea desde su fecha real.
       * Permite que la planificación avance sin quedar "congelada".
       */
      advanceWindow: async (
        projectId: string,
        deltaWeeks: number,
      ): Promise<void> => {
        const plan = await db.orm.public.ProjectPlan
          .where({ projectId, tenantId })
          .first();
        if (!plan) {
          throw new Error("Plan no encontrado en este negocio.");
        }
        if (!Number.isInteger(deltaWeeks) || deltaWeeks === 0) {
          return;
        }

        const currentStart = bogotaToday(String(plan.windowStartDate));
        const newStart = addDays(currentStart, deltaWeeks * 7);

        await db.transaction(async (tx) => {
          await tx.orm.public.ProjectPlan.where({ id: plan.id }).update({
            windowStartDate: bogotaInstantFromIsoDate(formatPlainDate(newStart)),
          });
          const tasks = await tx.orm.public.LookaheadTask
            .where({ planId: plan.id })
            .all();
          for (const task of tasks) {
            const taskStart = bogotaToday(String(task.startDate));
            await tx.orm.public.LookaheadTask
              .where({ id: task.id })
              .update({ weekNumber: relativeWeekNumber(newStart, taskStart) });
          }
        });
      },
    },

    fieldLog: {
      /** Bitácora del proyecto (con sus entradas), o null. */
      getLog: async (projectId: string): Promise<FieldLogData | null> => {
        const log = await db.orm.public.FieldLog
          .where({ projectId, tenantId })
          .first();
        return log ? loadFieldLog(log, tenantId) : null;
      },

      /**
       * Devuelve la bitácora del proyecto, creándola si no existe (1:1 vía
       * `projectId @unique`). Idempotente ante concurrencia.
       */
      getOrCreateLog: async (projectId: string): Promise<FieldLogData> => {
        const existing = await db.orm.public.FieldLog
          .where({ projectId, tenantId })
          .first();
        if (existing) {
          return loadFieldLog(existing, tenantId);
        }

        const project = await db.orm.public.Project
          .where({ id: projectId, tenantId })
          .first();
        if (!project) {
          throw new Error("Proyecto no encontrado en este negocio.");
        }

        try {
          const created = await db.orm.public.FieldLog.create({
            tenantId,
            projectId,
            name: `Diario Oficial de Obra — ${project.name}`,
          });
          return loadFieldLog(created, tenantId);
        } catch (error) {
          const raced = await db.orm.public.FieldLog
            .where({ projectId, tenantId })
            .first();
          if (raced) {
            return loadFieldLog(raced, tenantId);
          }
          throw error;
        }
      },

      /**
       * Crea una anotación en la bitácora. Valida coherencia de tenant y
       * pertenencia al proyecto.
       */
      createEntry: async (
        logId: string,
        input: CreateFieldLogEntryInput,
      ): Promise<{ id: string }> => {
        const log = await db.orm.public.FieldLog
          .where({ id: logId, tenantId })
          .first();
        if (!log) {
          throw new Error("Bitácora no encontrada en este negocio.");
        }

        const created = await db.orm.public.FieldLogEntry.create({
          tenantId,
          logId,
          type: input.type,
          entryDate: bogotaInstantFromEntryDate(input.entryDate),
          title: input.title,
          description: input.description,
          weather: input.weather,
          laborCount: input.laborCount,
          authorName: input.authorName,
          authorRole: input.authorRole,
          photoUrls: input.photoUrls,
        });
        return { id: created.id };
      },

      /**
       * Elimina una anotación de la bitácora. Verifica pertenencia al tenant
       * y a la bitácora correcta.
       */
      deleteEntry: async (logId: string, entryId: string): Promise<void> => {
        const log = await db.orm.public.FieldLog
          .where({ id: logId, tenantId })
          .first();
        if (!log) {
          throw new Error("Bitácora no encontrada en este negocio.");
        }

        const entry = await db.orm.public.FieldLogEntry
          .where({ id: entryId, logId, tenantId })
          .first();
        if (!entry) {
          throw new Error("Anotación no encontrada en esta bitácora.");
        }

        await db.orm.public.FieldLogEntry
          .where({ id: entry.id })
          .delete();
      },
    },

    reports: {
      /**
       * Obtiene los datos consolidados para el Informe Cero (Línea Base).
       */
      getInformeCeroData: async (projectId: string): Promise<InformeCeroData | null> => {
        const project = await db.orm.public.Project
          .where({ id: projectId, tenantId })
          .first();
        if (!project) {
          return null;
        }

        const budget = await db.orm.public.ProjectBudget
          .where({ projectId, tenantId })
          .first();

        // Cargar árbol completo del presupuesto si existe
        let budgetData = null;
        if (budget) {
          budgetData = await loadBudgetTree(budget);
        }

        // Cargar header del proyecto (no tiene tenantId directo, usa projectId)
        const header = await db.orm.public.ProjectHeader
          .where({ projectId })
          .first();

        const projectData = {
          id: project.id,
          code: project.code,
          name: project.name,
          description: project.description,
          status: project.status,
          createdAt: project.createdAt.toString(),
          updatedAt: project.updatedAt.toString(),
          customerName: "", // Se obtendría del Customer relacionado
          header: header ? {
            clientTaxName: header.clientTaxName,
            clientTaxId: header.clientTaxId,
            clientTaxDv: header.clientTaxDv,
            clientAddress: header.clientAddress,
            clientCity: header.clientCity,
            clientBillingEmail: header.clientBillingEmail,
            legalRepName: header.legalRepName,
            siteAddress: header.siteAddress,
            siteCity: header.siteCity,
            siteDepartment: header.siteDepartment,
            projectType: header.projectType,
            siteAccessNotes: header.siteAccessNotes,
            technicalContact: header.technicalContact,
            technicalPhone: header.technicalPhone,
            projectLeaderName: header.projectLeaderName,
            projectLeaderProfessionalId: header.projectLeaderProfessionalId,
            supervisorName: header.supervisorName,
          } : null,
        };

        const { buildInformeCeroData } = await import("@/lib/report-engine");
        return buildInformeCeroData(projectData, budgetData);
      },

      /**
       * Obtiene los datos consolidados para el Informe Semanal.
       */
      getWeeklyReportData: async (
        projectId: string,
        weekNumber: number,
        year: number,
      ): Promise<WeeklyReportData | null> => {
        const project = await db.orm.public.Project
          .where({ id: projectId, tenantId })
          .first();
        if (!project) {
          return null;
        }

        const [budget, plan, fieldLog] = await Promise.all([
          db.orm.public.ProjectBudget.where({ projectId, tenantId }).first(),
          db.orm.public.ProjectPlan.where({ projectId, tenantId }).first(),
          db.orm.public.FieldLog.where({ projectId, tenantId }).first(),
        ]);

        const budgetData = budget ? await loadBudgetTree(budget) : null;

        let planData = null;
        if (plan) {
          planData = await loadLeanPlan(plan);
        }

        let fieldLogData = null;
        if (fieldLog) {
          fieldLogData = await loadFieldLog(fieldLog, tenantId);
        }

        const projectData = {
          id: project.id,
          code: project.code,
          name: project.name,
          description: project.description,
          status: project.status,
          createdAt: project.createdAt.toString(),
          updatedAt: project.updatedAt.toString(),
          customerName: "",
          header: null, // Se cargaría si es necesario
        };

        const { buildWeeklyReportData } = await import("@/lib/report-engine");
        return buildWeeklyReportData(
          projectData,
          budgetData,
          planData,
          fieldLogData,
          weekNumber,
          year,
        );
      },

      /**
       * Obtiene la explosión de materiales (BOM) para exportación CSV.
       */
      getBomExportData: async (projectId: string): Promise<BomResource[]> => {
        const budget = await db.orm.public.ProjectBudget
          .where({ projectId, tenantId })
          .first();
        if (!budget) {
          return [];
        }

        const budgetData = await loadBudgetTree(budget);
        const { buildBomExportData } = await import("@/lib/report-engine");
        return buildBomExportData(budgetData);
      },
    },

    users: {
      list: () => db.orm.public.User.where({ tenantId }).all(),

      get: (id: string) =>
        db.orm.public.User.where({ id, tenantId }).first(),

      findByClerkUserId: (clerkUserId: string) =>
        db.orm.public.User.where({ clerkUserId, tenantId }).first(),

      /** Primer usuario registrado en este tenant, o null si el tenant aún no tiene miembros. */
      findFirst: () => db.orm.public.User.where({ tenantId }).first(),

      create: (data: Omit<Parameters<typeof db.orm.public.User.create>[0], "tenantId">) =>
        db.orm.public.User.create({
          ...data,
          tenantId,
        }),

      /**
       * Crea la membresía del usuario en este tenant de forma idempotente.
       * Si (clerkUserId, tenantId) ya existe, devuelve la fila existente sin
       * modificarla — así dos requests concurrentes no estrellan la clave única.
       */
      upsertByClerkUserId: (
        data: Omit<
          Parameters<typeof db.orm.public.User.upsert>[0]["create"],
          "tenantId"
        >
      ) =>
        db.orm.public.User.upsert({
          create: { ...data, tenantId },
          update: {},
          conflictOn: { clerkUserId: data.clerkUserId, tenantId },
        }),

      update: (id: string, data: Record<string, unknown>) =>
        db.orm.public.User
          .where({ id, tenantId })
          .update(data),

      delete: (id: string) =>
        db.orm.public.User
          .where({ id, tenantId })
          .delete(),
    },

    payments: {
      list: () => db.orm.public.Payment.where({ tenantId }).all(),

      get: (id: string) =>
        db.orm.public.Payment.where({ id, tenantId }).first(),

      create: (data: Omit<Parameters<typeof db.orm.public.Payment.create>[0], "tenantId">) =>
        db.orm.public.Payment.create({
          ...data,
          tenantId,
        }),

      update: (id: string, data: Record<string, unknown>) =>
        db.orm.public.Payment
          .where({ id, tenantId })
          .update(data),

      delete: (id: string) =>
        db.orm.public.Payment
          .where({ id, tenantId })
          .delete(),
    },

    bookings: {
      list: () => db.orm.public.Booking.where({ tenantId }).all(),
      get: (id: string) =>
        db.orm.public.Booking.where({ id, tenantId }).first(),
      create: (data: {
        customerId: string;
        serviceName: string;
        startDate: Temporal.Instant;
        endDate: Temporal.Instant;
        status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
        totalAmount: bigint;
        notes?: string;
        createdAt?: Temporal.Instant;
        updatedAt?: Temporal.Instant;
      }) =>
        db.orm.public.Booking.create({
          ...data,
          tenantId,
        }),
      update: (id: string, data: Record<string, unknown>) =>
        db.orm.public.Booking
          .where({ id, tenantId })
          .update(data),
      delete: (id: string) =>
        db.orm.public.Booking
          .where({ id, tenantId })
          .delete(),
    },

    expenses: {
      list: () => db.orm.public.Expense.where({ tenantId }).all(),

      get: (id: string) =>
        db.orm.public.Expense.where({ id, tenantId }).first(),

      create: (data: Omit<Parameters<typeof db.orm.public.Expense.create>[0], "tenantId">) =>
        db.orm.public.Expense.create({
          ...data,
          tenantId,
        }),

      update: (id: string, data: Record<string, unknown>) =>
        db.orm.public.Expense
          .where({ id, tenantId })
          .update(data),

      delete: (id: string) =>
        db.orm.public.Expense
          .where({ id, tenantId })
          .delete(),
    },

    finance: {
      /**
       * Métricas del mes (horario Bogotá): ingresos aprobados, gastos,
       * balance neto y desglose por método de pago. Todo en el servidor.
       */
      getMetrics: async (options?: { month?: number; year?: number }) => {
        const { month, year } = resolveMonthYear(
          options?.month,
          options?.year,
        );
        const { start, end } = monthRangeBogota(year, month);

        const [incomeAgg, expenseAgg] = await Promise.all([
          db.orm.public.Payment
            .where({ tenantId })
            .where((payment) =>
              and(
                payment.status.eq("APPROVED"),
                payment.createdAt.gte(start),
                payment.createdAt.lt(end),
              ),
            )
            .aggregate((aggregate) => ({ total: aggregate.sum("amount") })),
          db.orm.public.Expense
            .where({ tenantId })
            .where((expense) =>
              and(expense.date.gte(start), expense.date.lt(end)),
            )
            .aggregate((aggregate) => ({ total: aggregate.sum("amount") })),
        ]);

        const income = toNumber(incomeAgg.total);
        const expenses = toNumber(expenseAgg.total);

        const byMethodAggs = await Promise.all(
          PAYMENT_METHOD_VALUES.map(async (method) => {
            const result = await db.orm.public.Payment
              .where({ tenantId })
              .where((payment) =>
                and(
                  payment.status.eq("APPROVED"),
                  payment.provider.eq(method),
                  payment.createdAt.gte(start),
                  payment.createdAt.lt(end),
                ),
              )
              .aggregate((aggregate) => ({ total: aggregate.sum("amount") }));
            return { method, total: toNumber(result.total) };
          }),
        );

        return {
          income,
          expenses,
          balance: income - expenses,
          byMethod: byMethodAggs,
        } satisfies FinanceMetrics;
      },

      /**
       * Historial de pagos paginado, con nombre/email del cliente.
       * Aislamiento: `tenantId` siempre en el filtro base.
       */
      listPayments: async ({
        q,
        method,
        status,
        page = 1,
        limit = 10,
      }: PaymentListInput): Promise<{ rows: PaymentRow[]; total: number }> => {
        const text = (q ?? "").trim();
        const pattern = `%${escapeLike(text)}%`;
        const safePage = Math.max(1, Math.trunc(page));
        const safeLimit = Math.min(100, Math.max(1, Math.trunc(limit)));

        let filtered = db.orm.public.Payment.where({ tenantId });
        if (status) {
          filtered = filtered.where((payment) => payment.status.eq(status));
        }
        if (method) {
          filtered = filtered.where((payment) => payment.provider.eq(method));
        }
        if (text) {
          filtered = filtered.where((payment) =>
            or(
              payment.description.ilike(pattern),
              payment.providerRefId.ilike(pattern),
            ),
          );
        }

        const [rows, { total }] = await Promise.all([
          filtered
            .orderBy((payment) => payment.createdAt.desc())
            .limit(safeLimit)
            .offset((safePage - 1) * safeLimit)
            .all(),
          filtered.aggregate((aggregate) => ({ total: aggregate.count() })),
        ]);

        // Clientes involucrados (join manual; siempre scoped al tenant).
        const customerIds = [
          ...new Set(
            rows
              .map((row) => row.customerId)
              .filter((id): id is string => Boolean(id)),
          ),
        ];
        const customers =
          customerIds.length === 0
            ? []
            : await db.orm.public.Customer
                .where({ tenantId })
                .where((customer) => customer.id.in(customerIds))
                .all();
        const customerById = new Map(
          customers.map((customer) => [customer.id, customer]),
        );

        return {
          rows: rows.map((row) => ({
            id: row.id,
            customerId: row.customerId,
            customerName: row.customerId
              ? customerById.get(row.customerId)?.name ?? "Cliente eliminado"
              : null,
            customerEmail: row.customerId
              ? customerById.get(row.customerId)?.email ?? null
              : null,
            amount: toNumber(row.amount),
            provider: row.provider,
            status: row.status,
            providerRefId: row.providerRefId,
            description: row.description,
            createdAt: String(row.createdAt),
          })),
          total,
        };
      },

      /**
       * Historial de gastos de caja menor, paginado.
       * Aislamiento: `tenantId` siempre en el filtro base.
       */
      listExpenses: async ({
        q,
        category,
        page = 1,
        limit = 10,
      }: ExpenseListInput): Promise<{ rows: ExpenseRow[]; total: number }> => {
        const text = (q ?? "").trim();
        const pattern = `%${escapeLike(text)}%`;
        const safePage = Math.max(1, Math.trunc(page));
        const safeLimit = Math.min(100, Math.max(1, Math.trunc(limit)));

        let filtered = db.orm.public.Expense.where({ tenantId });
        if (category) {
          filtered = filtered.where((expense) => expense.category.eq(category));
        }
        if (text) {
          filtered = filtered.where((expense) =>
            expense.description.ilike(pattern),
          );
        }

        const [rows, { total }] = await Promise.all([
          filtered
            .orderBy((expense) => expense.date.desc())
            .limit(safeLimit)
            .offset((safePage - 1) * safeLimit)
            .all(),
          filtered.aggregate((aggregate) => ({ total: aggregate.count() })),
        ]);

        return {
          rows: rows.map((row) => ({
            id: row.id,
            description: row.description,
            category: row.category,
            amount: toNumber(row.amount),
            date: String(row.date),
            createdAt: String(row.createdAt),
          })),
          total,
        };
      },

      /**
       * Últimos movimientos del tenant (pagos aprobados + gastos), ordenados
       * por fecha descendente. Base para la "Actividad reciente" del dashboard.
       */
      getRecentActivity: async (
        limit = 5,
      ): Promise<RecentActivityRow[]> => {
        const safeLimit = Math.min(20, Math.max(1, Math.trunc(limit)));

        const [payments, expenses] = await Promise.all([
          db.orm.public.Payment
            .where({ tenantId })
            .where((payment) => payment.status.eq("APPROVED"))
            .orderBy((payment) => payment.createdAt.desc())
            .limit(safeLimit)
            .all(),
          db.orm.public.Expense
            .where({ tenantId })
            .orderBy((expense) => expense.date.desc())
            .limit(safeLimit)
            .all(),
        ]);

        const customerIds = [
          ...new Set(
            payments
              .map((payment) => payment.customerId)
              .filter((id): id is string => Boolean(id)),
          ),
        ];
        const customers =
          customerIds.length === 0
            ? []
            : await db.orm.public.Customer
                .where({ tenantId })
                .where((customer) => customer.id.in(customerIds))
                .all();
        const customerById = new Map(
          customers.map((customer) => [customer.id, customer]),
        );

        const items: RecentActivityRow[] = [
          ...payments.map((payment) => ({
            id: `payment-${payment.id}`,
            type: "payment" as const,
            title: "Pago recibido",
            description:
              (payment.customerId
                ? customerById.get(payment.customerId)?.name ?? "Cliente eliminado"
                : "Cliente libre") ?? "Cliente libre",
            amount: toNumber(payment.amount),
            date: String(payment.createdAt),
          })),
          ...expenses.map((expense) => ({
            id: `expense-${expense.id}`,
            type: "expense" as const,
            title: "Gasto registrado",
            description: expense.description,
            amount: -toNumber(expense.amount),
            date: String(expense.date),
          })),
        ];

        items.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
        return items.slice(0, safeLimit);
      },
    },

    memberships: {
      /**
       * Listado paginado de membresías del tenant, con datos del cliente
       * (include) y estado dinámico calculado desde `endDate`.
       *
       * El filtro `status` se traduce a rangos sobre `endDate` (now /
       * now+3d), así que se evalúa 100% en la base de datos.
       * Aislamiento: `tenantId` siempre en el filtro base.
       */
      list: async ({
        q,
        status,
        type,
        page = 1,
        limit = 10,
      }: MembershipListInput): Promise<{ rows: MembershipRow[]; total: number }> => {
        const text = (q ?? "").trim();
        const pattern = `%${escapeLike(text)}%`;
        const safePage = Math.max(1, Math.trunc(page));
        const safeLimit = Math.min(100, Math.max(1, Math.trunc(limit)));

        const now = Temporal.Instant.fromEpochMilliseconds(Date.now());
        const windowEnd = plusDays(now, EXPIRING_WINDOW_DAYS);

        let filtered = db.orm.public.Membership.where({ tenantId });
        if (type) {
          filtered = filtered.where((membership) => membership.type.eq(type));
        }
        if (status === "active") {
          filtered = filtered.where((membership) => membership.endDate.gt(windowEnd));
        } else if (status === "expiring") {
          filtered = filtered.where((membership) =>
            and(membership.endDate.gt(now), membership.endDate.lte(windowEnd)),
          );
        } else if (status === "expired") {
          filtered = filtered.where((membership) => membership.endDate.lte(now));
        }
        if (text) {
          filtered = filtered.where((membership) =>
            membership.customer.some((customer) =>
              or(
                customer.name.ilike(pattern),
                customer.phone.ilike(pattern),
                customer.email.ilike(pattern),
              ),
            ),
          );
        }

        const [rows, { total }] = await Promise.all([
          filtered
            .orderBy([
              (membership) => membership.endDate.asc(),
              (membership) => membership.id.asc(),
            ])
            .include("customer", (customer) =>
              customer.select("name", "phone", "email"),
            )
            .limit(safeLimit)
            .offset((safePage - 1) * safeLimit)
            .all(),
          filtered.aggregate((aggregate) => ({ total: aggregate.count() })),
        ]);

        return {
          rows: rows.map((row) => ({
            id: row.id,
            customerId: row.customerId,
            customerName: row.customer?.name ?? "Cliente eliminado",
            customerPhone: row.customer?.phone ?? null,
            customerEmail: row.customer?.email ?? null,
            type: row.type,
            status: computeMembershipStatus(row.endDate),
            price: toNumber(row.price),
            startDate: String(row.startDate),
            endDate: String(row.endDate),
            createdAt: String(row.createdAt),
          })),
          total,
        };
      },

      /**
       * Detalle de una membresía (incluye historial de cobros Json).
       * Devuelve `null` si no existe en este tenant.
       */
      get: async (id: string): Promise<MembershipDetail | null> => {
        const membership = await db.orm.public.Membership
          .where({ id, tenantId })
          .include("customer", (customer) =>
            customer.select("name", "phone", "email"),
          )
          .first();

        if (!membership) {
          return null;
        }

        const payments: MembershipPaymentEntry[] = Array.isArray(membership.payments)
          ? (membership.payments as unknown as MembershipPaymentEntry[])
          : [];

        return {
          id: membership.id,
          customerId: membership.customerId,
          customerName: membership.customer?.name ?? "Cliente eliminado",
          customerPhone: membership.customer?.phone ?? null,
          customerEmail: membership.customer?.email ?? null,
          type: membership.type,
          status: computeMembershipStatus(membership.endDate),
          price: toNumber(membership.price),
          startDate: String(membership.startDate),
          endDate: String(membership.endDate),
          createdAt: String(membership.createdAt),
          payments,
        };
      },

      /**
       * Métricas del módulo: conteos por estado dinámico (active / expiring
       * / expired según `endDate` vs. ahora) y proyección de renovaciones =
       * suma de precios de las membresías que vencen en el mes (Bogotá).
       */
      getMetrics: async (options?: {
        month?: number;
        year?: number;
      }): Promise<MembershipMetrics> => {
        const now = Temporal.Instant.fromEpochMilliseconds(Date.now());
        const windowEnd = plusDays(now, EXPIRING_WINDOW_DAYS);

        const { month, year } = resolveMonthYear(options?.month, options?.year);
        const { start, end } = monthRangeBogota(year, month);

        const [activeAgg, expiringAgg, expiredAgg, projectionAgg] =
          await Promise.all([
            db.orm.public.Membership
              .where({ tenantId })
              .where((membership) => membership.endDate.gt(windowEnd))
              .aggregate((aggregate) => ({ total: aggregate.count() })),
            db.orm.public.Membership
              .where({ tenantId })
              .where((membership) =>
                and(membership.endDate.gt(now), membership.endDate.lte(windowEnd)),
              )
              .aggregate((aggregate) => ({ total: aggregate.count() })),
            db.orm.public.Membership
              .where({ tenantId })
              .where((membership) => membership.endDate.lte(now))
              .aggregate((aggregate) => ({ total: aggregate.count() })),
            db.orm.public.Membership
              .where({ tenantId })
              .where((membership) =>
                and(membership.endDate.gte(start), membership.endDate.lt(end)),
              )
              .aggregate((aggregate) => ({ total: aggregate.sum("price") })),
          ]);

        return {
          activeCount: activeAgg.total,
          expiringCount: expiringAgg.total,
          expiredCount: expiredAgg.total,
          renewalRevenueProjection: toNumber(projectionAgg.total),
        };
      },

      create: (
        data: Omit<
          Parameters<typeof db.orm.public.Membership.create>[0],
          "tenantId"
        >,
      ) =>
        db.orm.public.Membership.create({
          ...data,
          tenantId,
        }),

      update: (id: string, data: Record<string, unknown>) =>
        db.orm.public.Membership
          .where({ id, tenantId })
          .update(data),
    },

    /**
     * Wizard de onboarding del tenant (progresivo, idempotente).
     *
     * Todas las escrituras van POR `tenantId` (nunca se confía en un id o
     * slug enviado por el navegador para resolver la fila) y el gates de la
     * ruta ya validó membresía antes de que llegara una action.
     */
    onboarding: {
      /**
       * Activa los módulos por defecto de la vertical seleccionada.
       * Idempotente: el upsert sobre `[tenantId, moduleName]` nunca crea
       * duplicados aunque se re-ejecute (paso 2, finalización, reintentos).
       */
      activateModules: async (vertical: VerticalValue) => {
        const modules = DEFAULT_MODULES_BY_VERTICAL[vertical];
        await Promise.all(
          modules.map((moduleName) =>
            db.orm.public.TenantModule.upsert({
              create: { tenantId, moduleName },
              update: {},
              conflictOn: { tenantId, moduleName },
            }),
          ),
        );
        return [...modules];
      },

      /** Paso 1: identidad y ubicación (el slug NO se toca desde aquí). */
      saveIdentity: (data: {
        name: string;
        city: string;
        whatsappNumber: string;
      }) => db.orm.public.Tenant.where({ id: tenantId }).update(data),

      /** Paso 2: vertical del negocio. */
      setVertical: (vertical: VerticalValue) =>
        db.orm.public.Tenant.where({ id: tenantId }).update({ vertical }),

      /** Paso 3: ecosistema digital. */
      saveEcosystem: (data: {
        websiteUrl: string;
        instagramHandle: string;
        googleBusinessUrl: string;
      }) => db.orm.public.Tenant.where({ id: tenantId }).update(data),

      /** Paso 4: métodos de pago aceptados (catálogo de la plataforma). */
      setPaymentMethods: (methods: readonly PaymentMethodValue[]) =>
        db.orm.public.Tenant.where({ id: tenantId }).update({
          paymentMethods: [...methods],
        }),

      /**
       * Finalización del wizard: re-activa los módulos de la vertical,
       * crea los clientes iniciales opcionales (dedupe) y marca
       * `onboardingCompleted = true` — TODO en una transacción. Si algo
       * falla, nada queda a medias y el tenant sigue en onboarding.
       */
      complete: async (input: {
        customers: { name: string; phone: string; email: string }[];
      }) =>
        db.transaction(async (tx) => {
          const tenant = await tx.orm.public.Tenant
            .where({ id: tenantId })
            .first();
          if (!tenant) {
            throw new Error("Tenant no encontrado para completar onboarding.");
          }

          // Módulos según la vertical persistida (nunca la del navegador).
          for (const moduleName of DEFAULT_MODULES_BY_VERTICAL[tenant.vertical]) {
            await tx.orm.public.TenantModule.upsert({
              create: { tenantId, moduleName },
              update: {},
              conflictOn: { tenantId, moduleName },
            });
          }

          // Clientes iniciales opcionales: solo se crean si no existe ya
          // una fila con el mismo teléfono (o correo) en ESTE tenant.
          let created = 0;
          for (const row of input.customers) {
            let byCustomer = tx.orm.public.Customer.where({ tenantId });
            byCustomer = row.email
              ? byCustomer.where((customer) =>
                  or(customer.phone.eq(row.phone), customer.email.eq(row.email)),
                )
              : byCustomer.where((customer) => customer.phone.eq(row.phone));

            const existing = await byCustomer.first();
            if (!existing) {
              await tx.orm.public.Customer.create({
                name: row.name,
                phone: row.phone,
                email: row.email,
                tenantId,
              });
              created += 1;
            }
          }

          await tx.orm.public.Tenant.where({ id: tenantId }).update({
            onboardingCompleted: true,
          });

          return { createdCustomers: created, vertical: tenant.vertical };
        }),
    },
  };
}
