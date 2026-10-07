import {
  MODULES,
  VERTICALS,
  isModule,
  isVertical,
  validateSlug,
  type ModuleValue,
  type VerticalValue,
} from "@/lib/admin-catalogs";

export type TenantFormValues = {
  name: string;
  slug: string;
  vertical: VerticalValue | "";
  modules: ModuleValue[];
};

export type TenantFieldErrors = Partial<
  Record<keyof TenantFormValues | "form", string>
>;

export type TenantValidation =
  | { ok: true; values: TenantFormValues & { vertical: VerticalValue } }
  | {
      ok: false;
      errors: TenantFieldErrors;
      values: TenantFormValues;
    };

/**
 * Validación de creación de tenant en el servidor. El slug se normaliza y
 * valida aquí SIEMPRE (nunca se confía en el form) y los módulos deben
 * pertenecer al catálogo de la plataforma.
 */
export function validateTenantForm(formData: FormData): TenantValidation {
  const name = String(formData.get("name") ?? "").trim();
  const rawSlug = String(formData.get("slug") ?? "").trim();
  const rawVertical = String(formData.get("vertical") ?? "").trim();
  const rawModules = formData
    .getAll("modules")
    .map((entry) => String(entry).trim());

  // Duplicados defensivos desde el cliente.
  const modules = [...new Set(rawModules)];

  const values: TenantFormValues = {
    name,
    slug: rawSlug,
    vertical: isVertical(rawVertical) ? rawVertical : "",
    modules: modules.filter(isModule),
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

/** Reexporta el catálogo para que los componentes no lo dupliquen. */
export const ADMIN_VERTICAL_OPTIONS = VERTICALS;
export const ADMIN_MODULE_OPTIONS = MODULES;
