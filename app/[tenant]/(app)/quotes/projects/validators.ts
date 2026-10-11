/**
 * Validación servidor del módulo Proyectos (FASE 1 del vertical
 * construcción). Mirror de `quotes/validators.ts`: sin dependencias de
 * servidor, devuelve siempre los valores leídos para repintar formularios
 * y los errores por campo.
 */
import {
  PROJECT_TYPE_OPTIONS,
  isValidProjectStatus,
  type ProjectStatusValue,
} from "@/lib/projects";

export const PROJECT_NAME_MAX = 120;
export const PROJECT_DESCRIPTION_MAX = 500;
export const HEADER_FIELD_MAX = 120;
export const TAX_ID_MAX = 32;
export const TAX_DV_MAX = 4;
export const EMAIL_MAX = 120;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function required(value: string, label: string): boolean {
  return value.length > 0;
}

function within(value: string, max: number): boolean {
  return value.length <= max;
}

/* ------------------------------------------------------------------ */
/* Creación de proyecto                                                */
/* ------------------------------------------------------------------ */

export type CreateProjectFormValues = {
  customerId: string;
  name: string;
  description: string;
};

export type CreateProjectFieldErrors = Partial<
  Record<keyof CreateProjectFormValues, string>
>;

export type CreateProjectValidation =
  | { ok: true; values: CreateProjectFormValues }
  | {
      ok: false;
      errors: CreateProjectFieldErrors;
      values: CreateProjectFormValues;
    };

export function validateCreateProject(
  formData: FormData,
): CreateProjectValidation {
  const values: CreateProjectFormValues = {
    customerId: String(formData.get("customerId") ?? "").trim(),
    name: String(formData.get("name") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
  };
  const errors: CreateProjectFieldErrors = {};

  if (!required(values.customerId, "cliente")) {
    errors.customerId = "Selecciona el cliente dueño de la obra.";
  }
  if (!required(values.name, "nombre")) {
    errors.name = "Ingresa un nombre para el proyecto.";
  } else if (!within(values.name, PROJECT_NAME_MAX)) {
    errors.name = `Máximo ${PROJECT_NAME_MAX} caracteres.`;
  }
  if (!within(values.description, PROJECT_DESCRIPTION_MAX)) {
    errors.description = `Máximo ${PROJECT_DESCRIPTION_MAX} caracteres.`;
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors, values };
  }
  return { ok: true, values };
}

/* ------------------------------------------------------------------ */
/* Ficha del proyecto (ProjectHeader)                                  */
/* ------------------------------------------------------------------ */

export type ProjectHeaderFormValues = {
  clientTaxName: string;
  clientTaxId: string;
  clientTaxDv: string;
  clientAddress: string;
  clientCity: string;
  clientBillingEmail: string;
  legalRepName: string;
  siteAddress: string;
  siteCity: string;
  siteDepartment: string;
  projectType: string;
  siteAccessNotes: string;
  technicalContact: string;
  technicalPhone: string;
  projectLeaderName: string;
  projectLeaderProfessionalId: string;
  supervisorName: string;
};

export type ProjectHeaderFieldErrors = Partial<
  Record<keyof ProjectHeaderFormValues, string>
>;

export type ProjectHeaderValidation =
  | { ok: true; values: ProjectHeaderFormValues }
  | {
      ok: false;
      errors: ProjectHeaderFieldErrors;
      values: ProjectHeaderFormValues;
    };

const HEADER_KEYS: ReadonlyArray<keyof ProjectHeaderFormValues> = [
  "clientTaxName",
  "clientTaxId",
  "clientTaxDv",
  "clientAddress",
  "clientCity",
  "clientBillingEmail",
  "legalRepName",
  "siteAddress",
  "siteCity",
  "siteDepartment",
  "projectType",
  "siteAccessNotes",
  "technicalContact",
  "technicalPhone",
  "projectLeaderName",
  "projectLeaderProfessionalId",
  "supervisorName",
];

function optionalString(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export function validateProjectHeader(
  formData: FormData,
): ProjectHeaderValidation {
  const values: ProjectHeaderFormValues = {
    clientTaxName: optionalString(formData, "clientTaxName"),
    clientTaxId: optionalString(formData, "clientTaxId"),
    clientTaxDv: optionalString(formData, "clientTaxDv"),
    clientAddress: optionalString(formData, "clientAddress"),
    clientCity: optionalString(formData, "clientCity"),
    clientBillingEmail: optionalString(formData, "clientBillingEmail"),
    legalRepName: optionalString(formData, "legalRepName"),
    siteAddress: optionalString(formData, "siteAddress"),
    siteCity: optionalString(formData, "siteCity"),
    siteDepartment: optionalString(formData, "siteDepartment"),
    projectType: optionalString(formData, "projectType"),
    siteAccessNotes: optionalString(formData, "siteAccessNotes"),
    technicalContact: optionalString(formData, "technicalContact"),
    technicalPhone: optionalString(formData, "technicalPhone"),
    projectLeaderName: optionalString(formData, "projectLeaderName"),
    projectLeaderProfessionalId: optionalString(
      formData,
      "projectLeaderProfessionalId",
    ),
    supervisorName: optionalString(formData, "supervisorName"),
  };
  const errors: ProjectHeaderFieldErrors = {};

  // Límites de longitud genéricos.
  for (const key of HEADER_KEYS) {
    const value = values[key];
    const max = key === "clientTaxId" ? TAX_ID_MAX : key === "clientTaxDv" ? TAX_DV_MAX : HEADER_FIELD_MAX;
    if (!within(value, max)) {
      errors[key] = `Máximo ${max} caracteres.`;
    }
  }

  // Reglas específicas.
  if (values.projectType && !PROJECT_TYPE_OPTIONS.some((option) => option.value === values.projectType)) {
    errors.projectType = "Selecciona un tipo de obra válido.";
  }
  if (values.clientBillingEmail && !EMAIL_RE.test(values.clientBillingEmail)) {
    errors.clientBillingEmail = "Correo electrónico inválido.";
  }
  if (!within(values.clientBillingEmail, EMAIL_MAX)) {
    errors.clientBillingEmail = errors.clientBillingEmail ?? `Máximo ${EMAIL_MAX} caracteres.`;
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors, values };
  }
  return { ok: true, values };
}

/**
 * Convierte los valores leídos del formulario al payload de escritura:
 * cadena vacía → null (los campos de la ficha son opcionales).
 */
export function projectHeaderToInput(values: ProjectHeaderFormValues) {
  const emptyToNull = (value: string): string | null =>
    value === "" ? null : value;
  return {
    clientTaxName: emptyToNull(values.clientTaxName),
    clientTaxId: emptyToNull(values.clientTaxId),
    clientTaxDv: emptyToNull(values.clientTaxDv),
    clientAddress: emptyToNull(values.clientAddress),
    clientCity: emptyToNull(values.clientCity),
    clientBillingEmail: emptyToNull(values.clientBillingEmail),
    legalRepName: emptyToNull(values.legalRepName),
    siteAddress: emptyToNull(values.siteAddress),
    siteCity: emptyToNull(values.siteCity),
    siteDepartment: emptyToNull(values.siteDepartment),
    projectType: emptyToNull(values.projectType),
    siteAccessNotes: emptyToNull(values.siteAccessNotes),
    technicalContact: emptyToNull(values.technicalContact),
    technicalPhone: emptyToNull(values.technicalPhone),
    projectLeaderName: emptyToNull(values.projectLeaderName),
    projectLeaderProfessionalId: emptyToNull(values.projectLeaderProfessionalId),
    supervisorName: emptyToNull(values.supervisorName),
  };
}

/** Tipos de estado válidos para el filtro del listado. */
export function parseProjectStatus(value: string): ProjectStatusValue | undefined {
  return isValidProjectStatus(value) ? value : undefined;
}