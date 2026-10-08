/**
 * Validación adaptativa del onboarding (perfil INDIVIDUAL vs COMPANY).
 *
 * Funciones PURAS (sin `db`): pueden ejecutarse en el cliente para feedback
 * inmediato y se re-ejecutan SIEMPRE en el servidor dentro de la Server
 * Action — nunca se confía en el navegador. La disponibilidad del slug
 * (colisión) se chequea aparte contra la base de datos.
 */

import {
  isVertical,
  isModule,
  sortModules,
  type ModuleValue,
  type VerticalValue,
} from "@/lib/admin-catalogs";
import {
  isOnboardingTenantType,
  isTeamSize,
  type AdaptiveOnboardingInput,
  type OnboardingFieldErrors,
  type OnboardingTenantType,
  type TeamSizeValue,
} from "./types";
import { normalizeAndValidateSlug } from "./slug";

export type AdaptiveValidationResult =
  | { ok: true; values: AdaptiveOnboardingInput }
  | { ok: false; errors: OnboardingFieldErrors };

const NAME_MIN = 2;
const NAME_MAX = 80;
const LEGAL_NAME_MAX = 120;
const TAX_ID_MAX = 20;
const CITY_MAX = 80;
const ADDRESS_MAX = 200;

/** NIT/RUT: dígitos con separadores opcionales (p. ej. 901.234.567-9). */
const TAX_ID_PATTERN = /^[\d]{5,15}(?:[-.][\d]{1,2})?$/;

const clean = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

type TaxIdCheck =
  | { ok: true; value: string }
  | { ok: false; error: string };

function checkTaxId(raw: string): TaxIdCheck {
  const value = clean(raw);
  if (!value) {
    return { ok: false, error: "" };
  }
  if (value.length > TAX_ID_MAX || !TAX_ID_PATTERN.test(value)) {
    return {
      ok: false,
      error: "El NIT/RUT no parece válido (solo dígitos, puntos y un guion).",
    };
  }
  return { ok: true, value };
}

/**
 * Valida el formulario completo según el tipo de perfil.
 * Devuelve valores normalizados (`ok`) o errores por campo (`errors`).
 */
export function validateAdaptiveOnboarding(raw: {
  tenantId?: unknown;
  tenantType: unknown;
  name: unknown;
  legalName?: unknown;
  taxId?: unknown;
  slug: unknown;
  vertical: unknown;
  teamSize?: unknown;
  address?: unknown;
  city: unknown;
  selectedModules: unknown;
}): AdaptiveValidationResult {
  const errors: OnboardingFieldErrors = {};

  // --- perfil ----------------------------------------------------------
  let tenantType: OnboardingTenantType | undefined;
  if (
    typeof raw.tenantType === "string" &&
    isOnboardingTenantType(raw.tenantType)
  ) {
    tenantType = raw.tenantType;
  } else {
    errors.tenantType = "Elige un perfil para continuar.";
  }

  // --- nombre comercial --------------------------------------------------
  const name = clean(raw.name);
  if (name.length < NAME_MIN || name.length > NAME_MAX) {
    errors.name = "Escribe el nombre comercial (2 a 80 caracteres).";
  }

  // --- razón social (solo COMPANY; opcional) -----------------------------
  const legalName = clean(raw.legalName);
  if (
    tenantType === "COMPANY" &&
    legalName.length > 0 &&
    legalName.length > LEGAL_NAME_MAX
  ) {
    errors.legalName = `Máximo ${LEGAL_NAME_MAX} caracteres.`;
  }

  // --- slug ---------------------------------------------------------------
  const slugResult = normalizeAndValidateSlug(clean(raw.slug));
  let slug = "";
  if (!slugResult.ok) {
    errors.slug = slugResult.error;
  } else {
    slug = slugResult.slug;
  }

  // --- vertical -----------------------------------------------------------
  const verticalRaw = clean(raw.vertical);
  const vertical: VerticalValue | undefined = isVertical(verticalRaw)
    ? verticalRaw
    : undefined;
  if (!vertical) {
    errors.vertical = "Selecciona tu rubro.";
  }

  // --- campos adaptativos --------------------------------------------------
  // INDIVIDUAL: NIT opcional; sin teamSize ni dirección requeridos.
  // COMPANY: NIT, tamaño de equipo y dirección obligatorios.
  let taxId: string | undefined;
  if (tenantType === "COMPANY") {
    const check = checkTaxId(clean(raw.taxId));
    if (!check.ok && check.error) {
      errors.taxId = check.error;
    } else if (!check.ok) {
      errors.taxId = "El NIT/RUT es obligatorio para empresas.";
    } else {
      taxId = check.value;
    }
  } else if (raw.taxId !== undefined && clean(raw.taxId)) {
    const check = checkTaxId(clean(raw.taxId));
    if (!check.ok && check.error) {
      errors.taxId = check.error;
    } else if (check.ok) {
      taxId = check.value;
    }
  }

  let teamSize: TeamSizeValue | undefined;
  if (typeof raw.teamSize === "string" && isTeamSize(raw.teamSize)) {
    teamSize = raw.teamSize;
  } else if (tenantType === "COMPANY") {
    errors.teamSize = "Indica el tamaño de tu equipo.";
  }

  let address: string | undefined;
  const addressClean = clean(raw.address);
  if (tenantType === "COMPANY") {
    const normalizedAddress =
      addressClean.toLowerCase() === "remote" ? "REMOTE" : addressClean;
    if (!normalizedAddress || normalizedAddress.length > ADDRESS_MAX) {
      errors.address = "Indica la dirección o escribe REMOTE si no tienes local.";
    } else {
      address = normalizedAddress;
    }
  } else if (addressClean) {
    address = addressClean.slice(0, ADDRESS_MAX);
  }

  const city = clean(raw.city);
  if (!city || city.length > CITY_MAX) {
    errors.city = "Escribe tu ciudad (máx. 80 caracteres).";
  }

  // --- módulos --------------------------------------------------------------
  const selectedModules = new Set<ModuleValue>();
  if (Array.isArray(raw.selectedModules)) {
    for (const item of raw.selectedModules) {
      if (typeof item === "string" && isModule(item)) {
        selectedModules.add(item);
      }
    }
  }
  // `dashboard` es la landing de `(app)`: se activa siempre, aunque el
  // usuario la apague en el paso 3 (decisión del servidor).
  selectedModules.add("dashboard");
  const modules = sortModules([...selectedModules]);
  if (modules.length === 0) {
    errors.selectedModules = "Selecciona al menos un módulo.";
  }

  if (
    !tenantType ||
    !name ||
    errors.name ||
    errors.legalName ||
    errors.slug ||
    !vertical ||
    errors.vertical ||
    errors.taxId ||
    errors.teamSize ||
    errors.address ||
    errors.city ||
    errors.selectedModules
  ) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    values: {
      tenantId:
        typeof raw.tenantId === "string" && raw.tenantId
          ? raw.tenantId
          : undefined,
      tenantType,
      name,
      // Los campos vacíos se envían como undefined (no contaminan la fila).
      legalName:
        tenantType === "COMPANY" && legalName ? legalName : undefined,
      taxId,
      slug,
      vertical,
      teamSize: tenantType === "COMPANY" ? teamSize : undefined,
      address,
      city,
      selectedModules: modules,
    },
  };
}