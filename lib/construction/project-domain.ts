/**
 * Dominio Proyectos (vertical construcción, FASE 1).
 *
 * Catálogo de estados, etiquetas y opciones de la ficha. El contrato
 * (`ProjectStatus` en `prisma/contract.prisma`) es la fuente de verdad de
 * los valores; este módulo solo agrega la capa de presentación/validación.
 */

export type ProjectStatusValue =
  | "DRAFT"
  | "BIDDING"
  | "APPROVED"
  | "IN_EXECUTION"
  | "COMPLETED"
  | "CANCELLED";

export const PROJECT_STATUSES: ReadonlyArray<{
  value: ProjectStatusValue;
  label: string;
}> = [
  { value: "DRAFT", label: "Borrador" },
  { value: "BIDDING", label: "En licitación" },
  { value: "APPROVED", label: "Aprobado" },
  { value: "IN_EXECUTION", label: "En ejecución" },
  { value: "COMPLETED", label: "Completado" },
  { value: "CANCELLED", label: "Cancelado" },
];

export function projectStatusLabel(status: ProjectStatusValue): string {
  return (
    PROJECT_STATUSES.find((entry) => entry.value === status)?.label ?? status
  );
}

export function isValidProjectStatus(
  value: string,
): value is ProjectStatusValue {
  return PROJECT_STATUSES.some((entry) => entry.value === value);
}

/* ------------------------------------------------------------------ */
/* Ciclo de vida del proyecto (Etapa 1, ajuste C)                      */
/* ------------------------------------------------------------------ */

/**
 * Grafo de transiciones válidas: el proyecto avanza en cadena
 * DRAFT → BIDDING → APPROVED → IN_EXECUTION → COMPLETED, y puede cancelarse
 * desde cualquier estado no terminal. COMPLETED y CANCELLED son terminales.
 */
export const PROJECT_STATUS_TRANSITIONS: Readonly<
  Record<ProjectStatusValue, ReadonlyArray<ProjectStatusValue>>
> = {
  DRAFT: ["BIDDING", "CANCELLED"],
  BIDDING: ["APPROVED", "CANCELLED"],
  APPROVED: ["IN_EXECUTION", "CANCELLED"],
  IN_EXECUTION: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

/** Estados terminales: no admiten ninguna transición posterior. */
export const TERMINAL_PROJECT_STATUSES: ReadonlyArray<ProjectStatusValue> = [
  "COMPLETED",
  "CANCELLED",
];

export function isTerminalProjectStatus(status: ProjectStatusValue): boolean {
  return TERMINAL_PROJECT_STATUSES.includes(status);
}

export function canTransitionProjectStatus(
  from: ProjectStatusValue,
  to: ProjectStatusValue,
): boolean {
  return PROJECT_STATUS_TRANSITIONS[from].includes(to);
}

/** Siguientes estados posibles desde `status` (vacío si es terminal). */
export function nextProjectStatuses(
  status: ProjectStatusValue,
): ReadonlyArray<ProjectStatusValue> {
  return PROJECT_STATUS_TRANSITIONS[status];
}

/**
 * Transiciones que conviene advertir antes de aplicar: pasar a APPROVED o a
 * IN_EXECUTION sin una línea base de presupuesto aprobada. No bloquea.
 */
export function projectStatusNeedsBaselineWarning(
  status: ProjectStatusValue,
): boolean {
  return status === "APPROVED" || status === "IN_EXECUTION";
}

/** Roles de la organización (espejo de `TenantRole` de tenant-context). */
export type NexusRole = "SUPERADMIN" | "OWNER" | "STAFF" | "ADMIN" | "RECEPTION" | "ADVISOR";

/**
 * D7 — El cambio de estado de un proyecto lo gobierna solo el OWNER
 * (y SUPERADMIN). El contenido (nombre/descripción) lo edita cualquier
 * miembro con sesión válida (OWNER y STAFF).
 */
export function canChangeProjectStatus(role: NexusRole): boolean {
  return role === "OWNER" || role === "SUPERADMIN" || role === "ADMIN";
}

/** Recepción no edita obras; administración y asesores sí. */
export function canEditProjectContent(role: NexusRole): boolean {
  return role === "SUPERADMIN" || role === "OWNER" || role === "STAFF" || role === "ADMIN" || role === "ADVISOR";
}

/** Tipos de obra (ficha del proyecto, sección B). */
export const PROJECT_TYPE_OPTIONS: ReadonlyArray<{
  value: string;
  label: string;
}> = [
  { value: "RESIDENTIAL", label: "Vivienda" },
  { value: "COMMERCIAL", label: "Comercial" },
  { value: "INDUSTRIAL", label: "Industrial" },
  { value: "INSTITUTIONAL", label: "Institucional" },
  { value: "RENOVATION", label: "Remodelación" },
  { value: "CIVIL", label: "Civil / Infraestructura" },
  { value: "OTHER", label: "Otro" },
];

/**
 * Pestañas del contenedor de proyecto (XI.00). La URL es la fuente de verdad
 * (`?tab=`). FASE 1 solo implementa `ficha`; el resto son placeholders.
 */
export type ProjectTab =
  | "ficha"
  | "presupuesto"
  | "cotizaciones"
  | "planificador"
  | "planificacion"
  | "bitacora"
  | "campo"
  | "informes";

export const PROJECT_TABS: ReadonlyArray<{
  value: ProjectTab;
  label: string;
}> = [
  { value: "ficha", label: "Ficha y cliente" },
  { value: "presupuesto", label: "Presupuestador" },
  { value: "cotizaciones", label: "Cotizaciones" },
  { value: "planificador", label: "Planificador Lean" },
  { value: "bitacora", label: "Bitácora y campo" },
  { value: "informes", label: "Informes y exportación" },
];

export function parseProjectTab(value: string): ProjectTab {
  if (value === "planificacion" || value === "planificador") {
    return "planificador";
  }
  if (value === "campo" || value === "bitacora") {
    return "bitacora";
  }
  return PROJECT_TABS.some((tab) => tab.value === value)
    ? (value as ProjectTab)
    : "ficha";
}