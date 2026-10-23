/**
 * Motor de Informes Automatizados, EVM & Exportaciones (FASE 5 — Tab 5).
 *
 * Funciones puras, tipadas y sin dependencias de base de datos, React, Next.js
 * ni APIs externas. Consolida datos de las Fases 1–4 para generar:
 *  - Informe Cero (Línea Base del Proyecto)
 *  - Informe Semanal de Obra (con PPC, CNC, bitácora, indicadores EVM básicos)
 *  - Explosión de Compras (BOM) para exportación CSV
 *
 * Convenciones:
 * - Importes en micro-pesos (BigInt, 6 decimales): 1_000_000 = 1 COP.
 * - Porcentajes AIU en micro-fracción: 1_000_000 = 100 % (100_000 = 10 %).
 * - Fechas en formato "YYYY-MM-DD" (calendario Bogotá).
 * - Semanas ISO-8601 para períodos calendario.
 */

import {
  calculatePpc,
  getNonComplianceBreakdown,
  isoWeekOf,
  isoWeekRange,
  isoWeekLabel,
  bogotaToday,
  formatPlainDate,
  type PpcResult,
  type CncBreakdown,
  type CommitmentStatusValue,
  type NonComplianceCauseValue,
} from "@/lib/construction/lean-engine";

import {
  formatMoneyMicro,
  formatQuantityMicro,
  formatPercentMicro,
} from "@/lib/format";

import type {
  ProjectBudgetData,
  BudgetChapterData,
  BudgetItemData,
  BudgetResourceData,
  ProjectPlanData,
  WeeklyCommitmentData,
  LookaheadTaskData,
} from "@/lib/construction/shared";

import {
  getLogSummaryStats,
  fieldNoteTypeLabel,
  weatherConditionLabel,
  type FieldLogEntryData,
  type FieldNoteTypeValue,
} from "@/lib/construction/field-log-engine";

// ---------------------------------------------------------------------------
// Tipos de entrada (datos que vienen de tenant-db, ya serializados)
// ---------------------------------------------------------------------------

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

export type ProjectData = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  customerName: string;
  header: ProjectHeaderData | null;
};

export type PlanData = ProjectPlanData;

export type FieldLogData = {
  id: string;
  name: string;
  entries: FieldLogEntryData[];
};

// ---------------------------------------------------------------------------
// Utilidades de formato y serialización
// ---------------------------------------------------------------------------

/** Convierte micro-pesos a número para cálculos (con cuidado). */
export function microToNumber(micro: bigint | string | null | undefined): number {
  if (micro === null || micro === undefined || micro === "") return 0;
  try {
    return Number(typeof micro === "bigint" ? micro : BigInt(micro)) / 1_000_000;
  } catch {
    return 0;
  }
}

/** Formatea fecha "YYYY-MM-DD" a "DD/MM/YYYY". */
export function formatDateDisplay(isoDate: string): string {
  if (!isoDate || isoDate.length !== 10) return "—";
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
}

/** Formatea fecha ISO completa a "DD/MM/YYYY HH:mm". */
export function formatDateTimeDisplay(isoDate: string): string {
  if (!isoDate) return "—";
  try {
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat("es-CO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Bogota",
    }).format(date);
  } catch {
    return "—";
  }
}

// ---------------------------------------------------------------------------
// 1. INFORME CERO — LÍNEA BASE DEL PROYECTO
// ---------------------------------------------------------------------------

export type InformeCeroData = {
  // Identificación
  projectCode: string;
  projectName: string;
  projectStatus: string;
  reportDate: string;
  // Ubicación
  siteAddress: string | null;
  siteCity: string | null;
  siteDepartment: string | null;
  // Partes
  clientName: string;
  clientTaxName: string | null;
  clientTaxId: string | null;
  clientTaxDv: string | null;
  clientAddress: string | null;
  clientCity: string | null;
  clientBillingEmail: string | null;
  legalRepName: string | null;
  // Constructora (del tenant/header)
  constructorName: string | null;
  constructorNit: string | null;
  constructorAddress: string | null;
  constructorCity: string | null;
  // Responsables
  projectLeaderName: string | null;
  projectLeaderProfessionalId: string | null;
  supervisorName: string | null;
  technicalContact: string | null;
  technicalPhone: string | null;
  // Interventor (si existe en datos)
  interventorName: string | null;
  interventorProfessionalId: string | null;
  // Presupuesto
  budgetCode: string | null;
  budgetName: string | null;
  directCostTotal: string;
  adminTotal: string;
  imprevTotal: string;
  utilidadTotal: string;
  ivaUtilidadTotal: string;
  grandTotal: string;
  aiuAdminPct: string;
  aiuImprevPct: string;
  aiuUtilidadPct: string;
  ivaUtilidadPct: string;
  chapters: InformeCeroChapter[];
  // Metadatos
  generatedAt: string;
  hasBudget: boolean;
};

export type InformeCeroChapter = {
  order: number;
  name: string;
  description: string | null;
  subtotal: string;
  items: InformeCeroItem[];
};

export type InformeCeroItem = {
  code: string;
  description: string;
  unit: string;
  quantity: string;
  unitCostDirect: string;
  totalCostDirect: string;
  resources: InformeCeroResource[];
};

export type InformeCeroResource = {
  type: string;
  name: string;
  unit: string;
  performance: string;
  unitPrice: string;
  totalPrice: string;
};

/**
 * Construye los datos del Informe Cero a partir de las entidades persistidas.
 * No realiza cálculos financieros propios: reutiliza los totales ya calculados
 * y almacenados en el presupuesto (recalculados por el servidor en cada mutación).
 */
/** Datos de la constructora que emite el informe (del `Tenant`). */
export type ReportIssuer = {
  name: string | null;
  nit: string | null;
  address: string | null;
  city: string | null;
};

export function buildInformeCeroData(
  project: ProjectData,
  budget: ProjectBudgetData | null,
  issuer: ReportIssuer | null = null,
): InformeCeroData {
  const reportDate = new Date().toISOString().split("T")[0];

  const chapters: InformeCeroChapter[] = budget
    ? budget.chapters.map((ch: BudgetChapterData) => ({
        order: ch.order,
        name: ch.name,
        description: ch.description,
        subtotal: ch.subtotal,
        items: ch.items.map((it: BudgetItemData) => ({
          code: it.code,
          description: it.description,
          unit: it.unit,
          quantity: formatQuantityMicro(it.quantity),
          unitCostDirect: formatMoneyMicro(it.unitCostDirect),
          totalCostDirect: formatMoneyMicro(it.totalCostDirect),
          resources: it.resources.map((r: BudgetResourceData) => ({
            type: r.type,
            name: r.name,
            unit: r.unit,
            performance: formatQuantityMicro(r.performance),
            unitPrice: formatMoneyMicro(r.unitPrice),
            totalPrice: formatMoneyMicro(r.totalPrice),
          })),
        })),
      }))
    : [];

  const header = project.header;

  return {
    projectCode: project.code,
    projectName: project.name,
    projectStatus: project.status,
    reportDate: formatDateDisplay(reportDate),
    siteAddress: header?.siteAddress ?? null,
    siteCity: header?.siteCity ?? null,
    siteDepartment: header?.siteDepartment ?? null,
    clientName: project.customerName,
    clientTaxName: header?.clientTaxName ?? null,
    clientTaxId: header?.clientTaxId ?? null,
    clientTaxDv: header?.clientTaxDv ?? null,
    clientAddress: header?.clientAddress ?? null,
    clientCity: header?.clientCity ?? null,
    clientBillingEmail: header?.clientBillingEmail ?? null,
    legalRepName: header?.legalRepName ?? null,
    constructorName: issuer?.name ?? null,
    constructorNit: issuer?.nit ?? null,
    constructorAddress: issuer?.address ?? null,
    constructorCity: issuer?.city ?? null,
    projectLeaderName: header?.projectLeaderName ?? null,
    projectLeaderProfessionalId: header?.projectLeaderProfessionalId ?? null,
    supervisorName: header?.supervisorName ?? null,
    technicalContact: header?.technicalContact ?? null,
    technicalPhone: header?.technicalPhone ?? null,
    interventorName: null,
    interventorProfessionalId: null,
    budgetCode: budget?.code ?? null,
    budgetName: budget?.name ?? null,
    directCostTotal: budget ? formatMoneyMicro(budget.directCostTotal) : "$0",
    adminTotal: budget ? formatMoneyMicro(budget.adminTotal) : "$0",
    imprevTotal: budget ? formatMoneyMicro(budget.imprevTotal) : "$0",
    utilidadTotal: budget ? formatMoneyMicro(budget.utilidadTotal) : "$0",
    ivaUtilidadTotal: budget ? formatMoneyMicro(budget.ivaUtilidadTotal) : "$0",
    grandTotal: budget ? formatMoneyMicro(budget.grandTotal) : "$0",
    aiuAdminPct: budget ? formatPercentMicro(budget.aiuAdminPct) : "0%",
    aiuImprevPct: budget ? formatPercentMicro(budget.aiuImprevPct) : "0%",
    aiuUtilidadPct: budget ? formatPercentMicro(budget.aiuUtilidadPct) : "0%",
    ivaUtilidadPct: budget ? formatPercentMicro(budget.ivaUtilidadPct) : "0%",
    chapters,
    generatedAt: new Date().toISOString(),
    hasBudget: !!budget,
  };
}

// ---------------------------------------------------------------------------
// 2. INFORME SEMANAL DE OBRA
// ---------------------------------------------------------------------------

export type WeeklyReportData = {
  // Identificación del período
  projectCode: string;
  projectName: string;
  weekNumber: number;
  year: number;
  periodStart: string; // "YYYY-MM-DD"
  periodEnd: string;   // "YYYY-MM-DD"
  reportDate: string;
  budgetCode: string | null;
  // Lean / PPC
  ppc: PpcResult;
  targetPpc: number;
  commitments: {
    total: number;
    completed: number;
    failed: number;
    pending: number;
    scheduled: WeeklyCommitmentData[];
  };
  cnc: CncBreakdown;
  // EVM (honesto: no medible sin avance físico ni costo real)
  evm: EvmData;
  // Bitácora del período
  fieldLog: {
    totalEntries: number;
    advances: FieldLogEntryData[];
    observations: FieldLogEntryData[];
    authorizations: FieldLogEntryData[];
    incidents: FieldLogEntryData[];
    totalPhotos: number;
    averageLabor: number;
  };
  // Metadatos
  generatedAt: string;
  hasPlan: boolean;
  hasBudget: boolean;
  hasFieldLog: boolean;
};

/**
 * Un indicador EVM. `measurable` solo es `true` cuando existe la fuente de
 * dato real necesaria; en caso contrario `value` es `null` y `reason` explica
 * por qué NO es medible. Nunca se rellena con 0 ni con estimaciones.
 */
export type EvmMetric = {
  value: string | null;
  measurable: boolean;
  reason?: string;
};

/**
 * Indicadores EVM honestos. El esquema actual NO registra avance físico de
 * obra ni costo real incurrido ni línea base de cronograma, por lo que
 * PV/EV/AC/SPI/SV/CPI/CV se reportan como "No medible" hasta que esos datos
 * existan. El PPC de Lean NO es avance físico y no se usa aquí.
 */
export type EvmData = {
  /** `true` solo si todos los indicadores son medibles. */
  available: boolean;
  /** Motivo general (el de mayor jerarquía) cuando algo no es medible. */
  reason?: string;
  /** Avance físico real de obra (0–100). Nunca el PPC de Lean. */
  physicalProgressPct: number | null;
  pv: EvmMetric; // Valor planificado
  ev: EvmMetric; // Valor ganado
  ac: EvmMetric; // Costo real
  spi: EvmMetric; // EV / PV
  cpi: EvmMetric; // EV / AC
  sv: EvmMetric; // EV - PV
  cv: EvmMetric; // EV - AC
};

/**
 * Construye los indicadores EVM de forma honesta. Solo calcula un indicador
 * cuando existe su dato fuente real; los demás quedan como no medibles con su
 * razón. Con el esquema actual (sin avance físico ni costo real ni línea base)
 * el resultado es siempre `available: false`.
 *
 * @param _budget presupuesto (reservado para cuando exista línea base)
 * @param physicalProgressPct avance físico real 0–100, o `null` si no hay fuente
 * @param _actualCostMicro costo real incurrido en micro, o `null` si no hay fuente
 */
/** Acta de avance resumida para el cálculo del valor ganado. */
export type ProgressEntryInput = {
  budgetItemId: string;
  /** "YYYY-MM-DD" */
  cutoffDate: string;
  /** Cantidad ejecutada (micro). */
  executedQuantity: string;
};

/**
 * Valor ganado (micro-pesos) hasta `untilIsoDay`: Σ cantidad ejecutada ×
 * costo unitario directo de cada partida (costo directo, sin AIU).
 */
export function earnedValueMicro(
  budget: ProjectBudgetData,
  entries: ProgressEntryInput[],
  untilIsoDay: string,
): bigint {
  const unitCost = new Map<string, bigint>();
  for (const chapter of budget.chapters) {
    for (const item of chapter.items) unitCost.set(item.id, BigInt(item.unitCostDirect));
  }
  const executedByItem = new Map<string, bigint>();
  for (const entry of entries) {
    if (entry.cutoffDate > untilIsoDay || !unitCost.has(entry.budgetItemId)) continue;
    executedByItem.set(
      entry.budgetItemId,
      (executedByItem.get(entry.budgetItemId) ?? BigInt(0)) + BigInt(entry.executedQuantity),
    );
  }
  let total = BigInt(0);
  for (const [itemId, executed] of executedByItem) {
    total += (executed * unitCost.get(itemId)! + BigInt(500_000)) / BigInt(1_000_000);
  }
  return total;
}

export function buildEvm(
  budget: ProjectBudgetData | null,
  physicalProgressPct: number | null,
  _actualCostMicro: bigint | null,
  earnedMicro: bigint | null = null,
): EvmData {
  const mm = (reason: string): EvmMetric => ({ value: null, measurable: false, reason });

  // PV (cronograma valorizado) y AC (costo real por obra) todavía no tienen
  // fuente en el sistema; EV sí, cuando hay actas de avance.
  const hasEv = budget !== null && earnedMicro !== null;
  const reason = hasEv
    ? "Valor ganado medible; PV y AC requieren cronograma valorizado y costos reales"
    : "No medible: sin avance físico ni costo real registrados";

  return {
    available: false,
    reason,
    physicalProgressPct,
    pv: mm("No medible: sin línea base de cronograma aprobada"),
    ev: hasEv
      ? { value: formatMoneyMicro(earnedMicro!), measurable: true }
      : mm("No medible: sin registro de avance físico de obra"),
    ac: mm("No medible: sin registro de costo real incurrido"),
    spi: mm("No medible: requiere EV y PV"),
    cpi: mm("No medible: requiere EV y AC"),
    sv: mm("No medible: requiere EV y PV"),
    cv: mm("No medible: requiere EV y AC"),
  };
}

/**
 * Construye el Informe Semanal consolidando plan, bitácora y presupuesto.
 * El período se define por semana ISO + año.
 */
export function buildWeeklyReportData(
  project: ProjectData,
  budget: ProjectBudgetData | null,
  plan: PlanData | null,
  fieldLog: FieldLogData | null,
  weekNumber: number,
  year: number,
  progressEntries: ProgressEntryInput[] | null = null,
): WeeklyReportData {
  const reportDate = new Date().toISOString().split("T")[0];
  const { start, end } = isoWeekRange(year, weekNumber);

  // Filtrar compromisos de la semana ISO solicitada
  const commitments = plan
    ? plan.commitments.filter((c) => c.weekNumber === weekNumber && c.year === year)
    : [];

  // PPC usando el motor lean (excluye PENDING del denominador)
  const ppc = calculatePpc(commitments);

  // CNC
  const cnc = getNonComplianceBreakdown(commitments);

  // Compromisos programados (todos los de esa semana, independientemente del estado)
  const scheduled = commitments;

  // Avance físico: sale de las actas de avance (nunca del PPC de Lean, que
  // mide cumplimiento de compromisos). Sin actas, queda en `null`.
  const periodEndIso = formatPlainDate(end);
  const earned =
    budget && progressEntries && progressEntries.length > 0
      ? earnedValueMicro(budget, progressEntries, periodEndIso)
      : null;
  const direct = budget ? BigInt(budget.directCostTotal) : BigInt(0);
  const physicalProgressPct: number | null =
    earned !== null && direct > BigInt(0)
      ? Number((earned * BigInt(1000)) / direct) / 10
      : null;

  // EVM honesto: EV medible con actas; PV y AC siguen sin fuente (N3).
  const evm = buildEvm(budget, physicalProgressPct, null, earned);

  // Bitácora del período
  let fieldLogEntries: FieldLogEntryData[] = [];
  if (fieldLog) {
    const periodStart = formatPlainDate(start);
    const periodEnd = formatPlainDate(end);
    fieldLogEntries = fieldLog.entries.filter(
      (e) => e.entryDate >= periodStart && e.entryDate <= periodEnd,
    );
  }

  const logStats = getLogSummaryStats(fieldLogEntries);

  const advances = fieldLogEntries.filter((e) => e.type === "ADVANCE");
  const observations = fieldLogEntries.filter((e) => e.type === "OBSERVATION");
  const authorizations = fieldLogEntries.filter((e) => e.type === "AUTHORIZATION");
  const incidents = fieldLogEntries.filter((e) => e.type === "INCIDENT");

  return {
    projectCode: project.code,
    projectName: project.name,
    weekNumber,
    year,
    periodStart: formatDateDisplay(formatPlainDate(start)),
    periodEnd: formatDateDisplay(formatPlainDate(end)),
    reportDate: formatDateDisplay(reportDate),
    budgetCode: budget?.code ?? null,
    ppc,
    targetPpc: plan?.targetPpc ?? 85,
    commitments: {
      total: commitments.length,
      completed: commitments.filter((c) => c.status === "COMPLETED").length,
      failed: commitments.filter((c) => c.status === "FAILED").length,
      pending: commitments.filter((c) => c.status === "PENDING").length,
      scheduled,
    },
    cnc,
    evm,
    fieldLog: {
      totalEntries: fieldLogEntries.length,
      advances,
      observations,
      authorizations,
      incidents,
      totalPhotos: logStats.totalPhotos,
      averageLabor: logStats.averageLabor,
    },
    generatedAt: new Date().toISOString(),
    hasPlan: !!plan,
    hasBudget: !!budget,
    hasFieldLog: !!fieldLog,
  };
}

// ---------------------------------------------------------------------------
// 3. EXPLOSIÓN DE COMPRAS (BOM) — EXPORTACIÓN CSV
// ---------------------------------------------------------------------------

export type BomResource = {
  // Identificación
  resourceCode: string;
  resourceName: string;
  category: "MATERIAL" | "LABOR" | "EQUIPMENT" | "TRANSPORT";
  unit: string;
  // Cantidades y costos
  totalQuantity: number;      // Cantidad total requerida (unidades)
  unitPrice: number;          // Precio unitario de referencia (COP)
  totalCost: number;          // Costo total de referencia (COP)
  // Trazabilidad
  chapters: string[];         // Nombres de capítulos de origen
  items: string[];            // Códigos de partidas de origen
};

/**
 * Construye la explosión de materiales (BOM) consolidando recursos
 * de todas las partidas del presupuesto.
 * Agrupa por (categoría, nombre, unidad, precio unitario) para evitar duplicados.
 */
export function buildBomExportData(budget: ProjectBudgetData | null): BomResource[] {
  if (!budget) return [];

  const resourceMap = new Map<string, BomResource>();

  for (const chapter of budget.chapters) {
    for (const item of chapter.items) {
      for (const resource of item.resources) {
        const perf = microToNumber(resource.performance);
        const qtyItem = microToNumber(item.quantity);
const wastePctMicro = BigInt(resource.wastePct || "0");
        // qty = performance * quantity * (1 + wastePct/1_000_000) - per resource line
        // Use floating point division to avoid BigInt integer division truncation
        const wasteFactor = Number(BigInt(1_000_000) + wastePctMicro) / 1_000_000;
        const qty = perf * microToNumber(item.quantity) * wasteFactor;
        const unitPrice = microToNumber(resource.unitPrice);
        const totalCost = qty * unitPrice;

        // Clave de agrupación: categoría + nombre + unidad + precio unitario
        const key = `${resource.type}|${resource.name}|${resource.unit}|${resource.unitPrice}`;

        const existing = resourceMap.get(key);
        if (existing) {
          existing.totalQuantity += qty;
          existing.totalCost += totalCost;
          if (!existing.chapters.includes(chapter.name)) {
            existing.chapters.push(chapter.name);
          }
          if (!existing.items.includes(item.code)) {
            existing.items.push(item.code);
          }
        } else {
          resourceMap.set(key, {
            resourceCode: key, // Podría mejorarse con un código real si existe
            resourceName: resource.name,
            category: resource.type as "MATERIAL" | "LABOR" | "EQUIPMENT" | "TRANSPORT",
            unit: resource.unit,
            totalQuantity: qty,
            unitPrice,
            totalCost,
            chapters: [chapter.name],
            items: [item.code],
          });
        }
      }
    }
  }

  // Ordenar por categoría y nombre
  return Array.from(resourceMap.values()).sort((a, b) => {
    const catOrder = { MATERIAL: 0, LABOR: 1, EQUIPMENT: 2, TRANSPORT: 3 };
    const catDiff = catOrder[a.category] - catOrder[b.category];
    if (catDiff !== 0) return catDiff;
    return a.resourceName.localeCompare(b.resourceName);
  });
}

/**
 * Genera CSV a partir de los recursos BOM.
 * Incluye encabezados y escapa valores para evitar inyección de fórmulas.
 */
export function generateBomCsv(resources: BomResource[]): string {
  const headers = [
    "Categoría",
    "Recurso",
    "Unidad",
    "Cantidad Total",
    "Precio Unitario (COP)",
    "Costo Total (COP)",
    "Capítulos",
    "Partidas",
  ];

  const escapeCsv = (value: string): string => {
    // Prevenir inyección de fórmulas: prefijar con ' si empieza con =, +, -, @
    const str = String(value);
    if (/^[=+\-@]/.test(str.trim())) {
      return `'${str.replace(/"/g, '""')}`;
    }
    // Escapar comillas
    if (str.includes('"') || str.includes(",") || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = resources.map((r) => [
    escapeCsv(r.category),
    escapeCsv(r.resourceName),
    escapeCsv(r.unit),
    escapeCsv(r.totalQuantity.toFixed(3)),
    escapeCsv(r.unitPrice.toLocaleString("es-CO", { minimumFractionDigits: 0, maximumFractionDigits: 2 })),
    escapeCsv(r.totalCost.toLocaleString("es-CO", { minimumFractionDigits: 0, maximumFractionDigits: 2 })),
    escapeCsv(r.chapters.join("; ")),
    escapeCsv(r.items.join("; ")),
  ]);

  // UTF-8 BOM para compatibilidad con Excel
  const bom = "\uFEFF";
  const lines = [headers.join(","), ...rows.map((r) => r.join(","))];
  return bom + lines.join("\r\n");
}

// ---------------------------------------------------------------------------
// Utilidades compartidas
// ---------------------------------------------------------------------------

/** Devuelve el estado de disponibilidad de datos para un informe. */
export type DataAvailability = {
  hasProject: boolean;
  hasHeader: boolean;
  hasBudget: boolean;
  hasPlan: boolean;
  hasFieldLog: boolean;
};

export function checkDataAvailability(
  project: ProjectData | null,
  budget: ProjectBudgetData | null,
  plan: PlanData | null,
  fieldLog: FieldLogData | null,
): DataAvailability {
  return {
    hasProject: !!project,
    hasHeader: !!project?.header,
    hasBudget: !!budget,
    hasPlan: !!plan,
    hasFieldLog: !!fieldLog,
  };
}