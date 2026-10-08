import {
  MODULES,
  VERTICALS,
  isModule,
  isVertical,
  validateSlug,
  type ModuleValue,
  type VerticalValue,
} from "@/lib/admin-catalogs";
import {
  TEAM_SIZES,
  type OnboardingTenantType,
  type TeamSizeValue,
} from "@/lib/onboarding/types";
import { TAX_ID_PATTERN } from "@/lib/onboarding/validation";

export type TenantFormValues = {
  name: string;
  slug: string;
  vertical: VerticalValue | "";
  modules: ModuleValue[];
  /** Perfil adaptativo del onboarding (Empresa / Persona individual). */
  tenantType: OnboardingTenantType | "";
  legalName: string;
  taxId: string;
  teamSize: TeamSizeValue | "";
  address: string;
};

export type TenantFieldErrors = Partial<
  Record<keyof TenantFormValues | "form", string>
>;

export type TenantValidation =
  | {
      ok: true;
      values: TenantFormValues & {
        vertical: VerticalValue;
        tenantType: OnboardingTenantType;
      };
    }
  | {
      ok: false;
      errors: TenantFieldErrors;
      values: TenantFormValues;
    };

/**
 * Validación de creación de tenant en el servidor. El slug se normaliza y
 * valida aquí SIEMPRE (nunca se confía en el form) y los módulos deben
 * pertenecer al catálogo de la plataforma.
 *
 * Los campos del perfil adaptativo son un PREFILL del CEO: formato válido
 * si vienen, pero no obligatorios (el wizard de onboarding del integrante
 * exige lo que necesite según su perfil: NIT/equipo/dirección en Empresa).
 */
export function validateTenantForm(formData: FormData): TenantValidation {
  const name = String(formData.get("name") ?? "").trim();
  const rawSlug = String(formData.get("slug") ?? "").trim();
  const rawVertical = String(formData.get("vertical") ?? "").trim();
  const rawModules = formData
    .getAll("modules")
    .map((entry) => String(entry).trim());
  const rawTenantType = String(formData.get("tenantType") ?? "").trim();
  const rawTeamSize = String(formData.get("teamSize") ?? "").trim();

  // Duplicados defensivos desde el cliente.
  const modules = [...new Set(rawModules)];

  const legalName = String(formData.get("legalName") ?? "").trim();
  const taxId = String(formData.get("taxId") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();

  const values: TenantFormValues = {
    name,
    slug: rawSlug,
    vertical: isVertical(rawVertical) ? rawVertical : "",
    modules: modules.filter(isModule),
    tenantType:
      rawTenantType === "INDIVIDUAL" || rawTenantType === "COMPANY"
        ? rawTenantType
        : "",
    legalName,
    taxId,
    teamSize: (TEAM_SIZES as readonly string[]).includes(rawTeamSize)
      ? (rawTeamSize as TeamSizeValue)
      : "",
    address,
  };

  const errors: TenantFieldErrors = {};

  if (!name) {
    errors.name = "El nombre es obligatorio.";
  } else if (name.length < 2) {
    errors.name = "Mínimo 2 caracteres.";
  } else if (name.length > 80) {
    errors.name = "Máximo 80 caracteres.";
  }

  const slugValidation = validateSlug(rawSlug);
  if (!slugValidation.ok) {
    errors.slug = slugValidation.error;
  }

  if (!isVertical(rawVertical)) {
    errors.vertical = "Selecciona una vertical válida.";
  }

  if (!values.tenantType) {
    errors.tenantType = "Selecciona un perfil válido.";
  } else {
    if (legalName.length > 0 && legalName.length < 2) {
      errors.legalName = "Mínimo 2 caracteres.";
    } else if (legalName.length > 120) {
      errors.legalName = "Máximo 120 caracteres.";
    }

    if (taxId.length > 0 && !TAX_ID_PATTERN.test(taxId)) {
      errors.taxId = "Formato: 5–15 dígitos (opcional sufijo -01).";
    }

    if (address.length > 120) {
      errors.address = "Máximo 120 caracteres.";
    }
  }

  // Un módulo desconocido es error explícito: la lista viene manipulada.
  if (modules.some((module) => !isModule(module))) {
    errors.modules = "Módulo no válido.";
  } else if (modules.length > MODULES.length) {
    errors.modules = "Módulos duplicados.";
  }

  if (Object.keys(errors).length > 0 || !slugValidation.ok) {
    return { ok: false, errors, values };
  }

  return {
    ok: true,
    values: {
      name,
      slug: slugValidation.slug,
      vertical: rawVertical as VerticalValue,
      modules: modules.filter(isModule),
      tenantType: values.tenantType as OnboardingTenantType,
      legalName,
      taxId,
      teamSize: values.teamSize,
      address,
    },
  };
}

export type ToggleFormValues = {
  tenantId: string;
  active: boolean;
};

export type ToggleValidation =
  | { ok: true; values: ToggleFormValues }
  | { ok: false; message: string; values: ToggleFormValues };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Activar/suspender un tenant (tabla principal). */
export function validateToggleTenant(
  formData: FormData,
): ToggleValidation {
  const tenantId = String(formData.get("tenantId") ?? "").trim();
  const rawActive = String(formData.get("active") ?? "").trim();

  const values: ToggleFormValues = {
    tenantId,
    active: rawActive === "true",
  };

  if (!UUID_PATTERN.test(tenantId)) {
    return { ok: false, message: "Negocio no válido.", values };
  }
  if (rawActive !== "true" && rawActive !== "false") {
    return { ok: false, message: "Estado no válido.", values };
  }

  return { ok: true, values };
}

export type ModuleToggleFormValues = {
  tenantId: string;
  moduleName: ModuleValue | "";
  active: boolean;
};

export type ModuleToggleValidation =
  | { ok: true; values: ModuleToggleFormValues & { moduleName: ModuleValue } }
  | { ok: false; message: string; values: ModuleToggleFormValues };

/** Activar/desactivar un módulo de un tenant (modal de gestión). */
export function validateToggleModule(
  formData: FormData,
): ModuleToggleValidation {
  const tenantId = String(formData.get("tenantId") ?? "").trim();
  const rawModule = String(formData.get("moduleName") ?? "").trim();
  const rawActive = String(formData.get("active") ?? "").trim();

  const values: ModuleToggleFormValues = {
    tenantId,
    moduleName: isModule(rawModule) ? rawModule : "",
    active: rawActive === "true",
  };

  if (!UUID_PATTERN.test(tenantId)) {
    return { ok: false, message: "Negocio no válido.", values };
  }
  if (!isModule(rawModule)) {
    return { ok: false, message: "Módulo no válido.", values };
  }
  if (rawActive !== "true" && rawActive !== "false") {
    return { ok: false, message: "Estado no válido.", values };
  }

  return { ok: true, values: { ...values, moduleName: rawModule } };
}

/** Normaliza y valida un id de tenant (UUID). Devuelve `null` si es inválido. */
export function validateTenantId(raw: unknown): string | null {
  const tenantId = String(raw ?? "").trim();
  return UUID_PATTERN.test(tenantId) ? tenantId : null;
}

export type SuspensionFormValues = {
  tenantId: string;
  reason: string;
};

export type SuspensionValidation =
  | { ok: true; values: SuspensionFormValues }
  | { ok: false; message: string; values: SuspensionFormValues };

/**
 * Suspensión administrativa: el motivo es obligatorio (queda en el historial
 * del negocio y en la bitácora de auditoría). Se acota para no almacenar
 * texto arbitrario sin límite.
 */
export function validateSuspendTenant(
  formData: FormData,
): SuspensionValidation {
  const tenantId = String(formData.get("tenantId") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  const values: SuspensionFormValues = { tenantId, reason };

  if (!UUID_PATTERN.test(tenantId)) {
    return { ok: false, message: "Negocio no válido.", values };
  }
  if (reason.length < 5) {
    return {
      ok: false,
      message: "Describe el motivo (mínimo 5 caracteres).",
      values,
    };
  }
  if (reason.length > 300) {
    return {
      ok: false,
      message: "El motivo no puede superar 300 caracteres.",
      values,
    };
  }

  return { ok: true, values };
}

/** Reexporta el catálogo para que los componentes no lo dupliquen. */
export const ADMIN_VERTICAL_OPTIONS = VERTICALS;
export const ADMIN_MODULE_OPTIONS = MODULES;
