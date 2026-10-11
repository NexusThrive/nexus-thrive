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
  | "planificacion"
  | "bitacora"
  | "informes";

export const PROJECT_TABS: ReadonlyArray<{
  value: ProjectTab;
  label: string;
}> = [
  { value: "ficha", label: "Ficha y cliente" },
  { value: "presupuesto", label: "Presupuestador" },
  { value: "planificacion", label: "Planificador Lean" },
  { value: "bitacora", label: "Bitácora y campo" },
  { value: "informes", label: "Informes y exportación" },
];

export function parseProjectTab(value: string): ProjectTab {
  return PROJECT_TABS.some((tab) => tab.value === value)
    ? (value as ProjectTab)
    : "ficha";
}