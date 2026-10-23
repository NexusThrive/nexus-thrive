/**
 * Tipos y helpers compartidos por los módulos de construcción.
 * Extraído de `lib/tenant/db.ts`.
 */
import {
  db,
} from "@/prisma/db";
import {
  compositionUnitPrice,
  activityUnitCost,
  calculateBudgetTotals,
  componentCost,
  moneyToString,
  RESOURCE_TYPES,
  type ApuItemCategoryValue,
  type ApuSnapshot,
  type QuoteStatusValue,
  type ResourceTypeValue,
} from "@/lib/construction/apu-engine";
import {
  type ProjectStatusValue,
} from "@/lib/construction/project-domain";
import {
  bogotaToday,
  formatPlainDate,
  type CommitmentStatusValue,
  type NonComplianceCauseValue,
} from "@/lib/construction/lean-engine";
import {
  normalizePhotoUrls,
  type FieldNoteTypeValue,
  type WeatherConditionValue,
} from "@/lib/construction/field-log-engine";

/** Escapa los comodines de LIKE para que la búsqueda sea literal. */
export function escapeLike(input: string): string {
  return input.replace(/[\\%_]/g, (char) => `\\${char}`);
}

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
  /** Capítulo del catálogo (incluye sus subcapítulos). */
  chapterCode?: string;
  /** Actividades de obra (por defecto) o APU auxiliares. */
  kind?: "activity" | "auxiliary";
  page?: number;
  limit?: number;
};

/** Capítulo del catálogo APU con su número de actividades. */
export type ApuChapterRow = {
  id: string;
  code: string;
  parentCode: string | null;
  name: string;
  order: number;
  activityCount: number;
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
  /** Foto guardada en el sistema (ver /api/apu-images/[id]). */
  imageId: string | null;
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
  /** Costo directo declarado en el archivo importado, si vino de uno. */
  referenceUnitPrice: string | null;
  chapterCode: string | null;
  chapterName: string | null;
  isAuxiliary: boolean;
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
  /** Posición y sección de la línea en el APU (orden del archivo importado). */
  order: number;
  section: string | null;
  /** Unidad y cantidad tal como el archivo ("%MO" y 10 en una línea porcentual). */
  lineUnit: string | null;
  lineQuantity: string | null;
  origin: "IMPORT" | "MANUAL";
  /** Foto del insumo guardada en el sistema. */
  imageId: string | null;
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
  /** Foto del insumo guardada en el sistema (ver /api/apu-images/[id]). */
  imageId: string | null;
  /** Sección original de la línea en el APU del catálogo. */
  section: string | null;
  order: number;
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
export type ImportCompositionRow = {
  activityId: string;
  item: {
    id: string;
    tenantId: string;
    name: string;
    unit: string;
    category: ApuItemCategoryValue;
    unitPrice: string;
    imageUrl: string | null;
    imageId: string | null;
  } | null;
  consumption: string;
  wastePercent: string;
  order: number;
  section: string | null;
  lineUnit: string | null;
  lineUnitPrice: string | null;
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
  budgetItemId: string | null;
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
  budgetItemId: string | null;
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
  /** Partida del presupuesto a la que se refiere (opcional). */
  budgetItemId?: string | null;
};

export type CreateCommitmentInput = {
  description: string;
  responsible: string;
  /** Lunes de la semana operativa a la que pertenece ("YYYY-MM-DD"). */
  weekStartDate: string;
  /** Partida del presupuesto a la que se refiere (opcional). */
  budgetItemId?: string | null;
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
  budgetItemId?: string | null;
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
  /** Partida del presupuesto a la que se refiere (opcional). */
  budgetItemId?: string | null;
};

/** Fila mínima de `FieldLog` que necesita la serialización. */
export type FieldLogRow = {
  id: string;
  projectId: string;
  name: string;
};

/** Fila mínima de `FieldLogEntry` que necesita la serialización. */
export type FieldLogEntryRow = {
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

export async function loadFieldLog(log: FieldLogRow, tenantId: string): Promise<FieldLogData> {
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
      budgetItemId: entry.budgetItemId ?? null,
    })),
  };
}

/** "YYYY-MM-DD" → Temporal.Instant 00:00 Bogotá. */
export function bogotaInstantFromEntryDate(iso: string): Temporal.Instant {
  const [year, month, day] = iso.split("-").map(Number);
  return Temporal.Instant.fromEpochMilliseconds(
    Date.UTC(year, month - 1, day, 5, 0, 0),
  );
}

/** Fila mínima de `ProjectPlan` que necesita la serialización. */
export type ProjectPlanRow = {
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
export function bogotaInstantFromIsoDate(iso: string): Temporal.Instant {
  const [year, month, day] = iso.split("-").map(Number);
  return Temporal.Instant.fromEpochMilliseconds(
    Date.UTC(year, month - 1, day, 5, 0, 0),
  );
}

/** `Temporal.Instant` (o ISO) → día calendario "YYYY-MM-DD" en Bogotá. */
export function instantToBogotaIsoDate(value: unknown): string {
  return formatPlainDate(bogotaToday(String(value)));
}

export async function loadLeanPlan(plan: ProjectPlanRow): Promise<ProjectPlanData> {
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
      budgetItemId: task.budgetItemId ?? null,
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
      budgetItemId: commitment.budgetItemId ?? null,
    })),
  };
}

/** Fila mínima de `ProjectBudget` que necesita la capa de lectura/escritura. */
export type BudgetRow = {
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
export function assertRevision(
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
export async function bumpRevision(
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
    .where({ tenantId: budget.tenantId, id: budget.id, revision: budget.revision })
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
export async function lockRevision(tx: TenantTx, budget: BudgetRow): Promise<void> {
  const locked = await tx.orm.public.ProjectBudget
    .where({ tenantId: budget.tenantId, id: budget.id, revision: budget.revision })
    .updateAndCount({ revision: budget.revision });
  if (locked !== 1) {
    throw new Error("STALE_REVISION");
  }
}

/* ------------------------------------------------------------------ */
/* Guardados sin cambios (Etapa 1)                                     */
/* ------------------------------------------------------------------ */

// Las guardas no-op viven en un módulo puro (lib/construction/budget-guards.ts) para poder
// probarlas sin abrir conexión a base de datos.

/** Transacción de Prisma 8 (misma forma que el `db` pero ligada a la tx). */
export type TenantTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Lee el presupuesto con su estructura completa (capítulos → ítems →
 * recursos), ordenada, con montos serializados a string (los `BigInt` no
 * cruzan el límite server/client de React).
 */
export async function loadBudgetTree(budget: BudgetRow): Promise<ProjectBudgetData> {
  const chapters = await db.orm.public.BudgetChapter
    .where({ tenantId: budget.tenantId, budgetId: budget.id })
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
        .select("id", "itemId", "type", "name", "unit", "performance", "unitPrice", "totalPrice", "imageUrl", "imageId", "section", "order", "wastePct")
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
      imageId: resource.imageId ?? null,
      section: resource.section ?? null,
      order: resource.order,
      wastePct: String(resource.wastePct),
    });
    resourcesByItem.set(resource.itemId, list);
  }
  // Orden del APU del catálogo; los recursos anteriores a ese dato (todos en
  // 0) quedan en un orden estable por tipo y nombre.
  const typeRank = new Map<string, number>(
    RESOURCE_TYPES.map((option, index) => [option.value, index]),
  );
  for (const list of resourcesByItem.values()) {
    list.sort(
      (a, b) =>
        a.order - b.order ||
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
export type TenantReader = Pick<TenantTx, "orm">;

/** Suma de los costos directos de todas las partidas del presupuesto. */
export async function sumBudgetDirect(
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
export async function recalcBudgetTotals(
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
export type ProjectHeaderRow = {
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

export function serializeProjectHeader(header: ProjectHeaderRow): ProjectHeaderData {
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

/**
 * Detalle completo de una actividad APU (con composición y costos).
 * Helper de módulo: no depende del namespace, así `apu.createActivity`
 * y `apu.updateActivity` pueden re-leer el detalle tras su transacción.
 */
export async function getApuActivityDetail(
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
    .orderBy((line) => line.order.asc())
    .include("item", (item) =>
      item.select("id", "code", "name", "unit", "category", "unitPrice", "imageId"),
    )
    .all();

  const rows: ApuCompositionRow[] = compositions.map((composition) => {
    const item = composition.item!;
    const unitPrice = compositionUnitPrice(composition, item.unitPrice);
    return {
      id: composition.id,
      itemId: item.id,
      itemCode: item.code,
      itemName: item.name,
      itemUnit: item.unit,
      category: item.category,
      unitPrice,
      consumption: String(composition.consumption),
      wastePercent: String(composition.wastePercent),
      cost: moneyToString(
        componentCost({
          unitPrice,
          consumption: String(composition.consumption),
          wastePercent: String(composition.wastePercent),
        }),
      ),
      order: composition.order,
      section: composition.section ?? null,
      lineUnit: composition.lineUnit ?? null,
      lineQuantity: composition.lineQuantity === null ? null : String(composition.lineQuantity),
      origin: composition.origin,
      imageId: item.imageId ?? null,
    };
  });

  const chapter = activity.chapterId
    ? await db.orm.public.ApuChapter.where({ id: activity.chapterId, tenantId })
        .select("code", "name")
        .first()
    : null;

  return {
    id: activity.id,
    code: activity.code,
    name: activity.name,
    unit: activity.unit,
    description: activity.description,
    referenceUnitPrice:
      activity.referenceUnitPrice === null || activity.referenceUnitPrice === undefined
        ? null
        : String(activity.referenceUnitPrice),
    chapterCode: chapter?.code ?? null,
    chapterName: chapter?.name ?? null,
    isAuxiliary: activity.isAuxiliary,
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
export async function countItemCompositionUsage(itemId: string): Promise<number> {
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
export async function countActivityQuoteUsage(activityId: string): Promise<number> {
  const { total } = await db.orm.public.QuoteItem
    .where({ activityId })
    .aggregate((aggregate) => ({ total: aggregate.count() }));
  return total;
}

/**
 * Crea una línea base con la foto del presupuesto dentro de `tx`. El llamador
 * debe haber fijado la revisión (`lockRevision`) para que la foto sea
 * consistente. Lo usan `approveBaseline` y la aprobación de una cotización.
 */
export async function insertBaseline(
  tx: TenantTx,
  tenantId: string,
  budget: BudgetRow,
  input: { userId: string; userName: string; note?: string; budgetRevision?: number },
) {
  const direct = await sumBudgetDirect(tx, budget.id);
  const totals = calculateBudgetTotals(
    direct,
    budget.aiuAdminPct,
    budget.aiuImprevPct,
    budget.aiuUtilidadPct,
    budget.ivaUtilidadPct,
  );
  const chapters = await tx.orm.public.BudgetChapter
    .where({ tenantId, budgetId: budget.id })
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
    .where({ tenantId, budgetId: budget.id })
    .orderBy((baseline) => baseline.version.desc())
    .first();
  const version = last ? last.version + 1 : 1;
  const baseline = await tx.orm.public.BudgetBaseline.create({
    tenantId,
    budgetId: budget.id,
    budgetRevision: input.budgetRevision ?? budget.revision,
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
}

/**
 * Valida que una partida pertenezca al presupuesto de la obra (y al tenant).
 * Devuelve el id normalizado (null si no se indicó). Lanza si es ajena.
 */
export async function resolveBudgetItemOfProject(
  tenantId: string,
  projectId: string,
  budgetItemId: string | null | undefined,
): Promise<string | null> {
  if (!budgetItemId) return null;
  const item = await db.orm.public.BudgetItem.where({ id: budgetItemId, tenantId })
    .select("chapterId")
    .first();
  if (item) {
    const chapter = await db.orm.public.BudgetChapter.where({ id: item.chapterId, tenantId })
      .select("budgetId")
      .first();
    const budget = chapter
      ? await db.orm.public.ProjectBudget.where({ id: chapter.budgetId, tenantId, projectId }).select("id").first()
      : null;
    if (budget) return budgetItemId;
  }
  throw new Error("La partida indicada no pertenece al presupuesto de esta obra.");
}
