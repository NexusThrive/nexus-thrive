/**
 * Tipos compartidos del onboarding adaptativo (auto-servicio).
 *
 * Seguros para importar desde el cliente y el servidor: no importan
 * `db` ni funciones server-only. Los catálogos (verticals, módulos,
 * recetas) viven en lib/admin-catalogs.ts y se reutilizan tal cual.
 */

import type { ModuleValue, VerticalValue } from "@/lib/admin-catalogs";

export type { ModuleValue, VerticalValue };

/** Perfil del negocio: persona natural vs empresa (espejo del enum TenantType). */
export type OnboardingTenantType = "INDIVIDUAL" | "COMPANY";

export const ONBOARDING_TENANT_TYPES = ["INDIVIDUAL", "COMPANY"] as const;

export function isOnboardingTenantType(
  value: string,
): value is OnboardingTenantType {
  return (ONBOARDING_TENANT_TYPES as readonly string[]).includes(value);
}

export const ONBOARDING_STEPS = [1, 2, 3, 4] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

/** Tamaños de equipo válidos (guardados como texto validado por la app). */
export const TEAM_SIZES = ["SOLO", "2-5", "6-20", "20+"] as const;
export type TeamSizeValue = (typeof TEAM_SIZES)[number];

export function isTeamSize(value: string): value is TeamSizeValue {
  return (TEAM_SIZES as readonly string[]).includes(value);
}

export const TEAM_SIZE_LABELS: Record<TeamSizeValue, string> = {
  SOLO: "Solo yo",
  "2-5": "2 a 5 personas",
  "6-20": "6 a 20 personas",
  "20+": "Más de 20 personas",
};

/**
 * Borrador del wizard (paso 1–3). Se persiste en el navegador para que el
 * usuario pueda recargar o volver sin perder lo escrito; el servidor es la
 * única fuente de verdad al completar.
 */
export type OnboardingDraft = {
  tenantType: OnboardingTenantType | null;
  name: string;
  legalName: string;
  taxId: string;
  slugRaw: string;
  vertical: VerticalValue | null;
  teamSize: TeamSizeValue | null;
  address: string;
  city: string;
  selectedModules: ModuleValue[];
};

export const EMPTY_DRAFT: OnboardingDraft = {
  tenantType: null,
  name: "",
  legalName: "",
  taxId: "",
  slugRaw: "",
  vertical: null,
  teamSize: null,
  address: "",
  city: "",
  selectedModules: [],
};

/**
 * Datos ya validados que llegan a `completeAdaptiveOnboardingAction`.
 * `tenantId` presente ⇒ modo "resume" (actualizar tenant existente);
 * ausente ⇒ modo "create" (crear tenant + OWNER + módulos en una tx).
 */
export type AdaptiveOnboardingInput = {
  tenantId?: string;
  tenantType: OnboardingTenantType;
  name: string;
  legalName?: string;
  taxId?: string;
  slug: string;
  vertical: VerticalValue;
  teamSize?: TeamSizeValue;
  address?: string;
  city: string;
  selectedModules: ModuleValue[];
};

export type OnboardingFieldName =
  | "tenantType"
  | "name"
  | "legalName"
  | "taxId"
  | "slug"
  | "vertical"
  | "teamSize"
  | "address"
  | "city"
  | "selectedModules";

export type OnboardingFieldErrors = Partial<
  Record<OnboardingFieldName, string>
>;

export type OnboardingActionResult =
  | { status: "error"; message: string; errors?: OnboardingFieldErrors }
  | { status: "ok"; slug: string };

/**
 * Prefill inyectado desde el servidor (app/onboarding/page.tsx):
 * `create` = usuario sin tenant (wizard desde cero);
 * `resume` = usuario ya vinculado a un tenant pendiente (reanuda/actualiza);
 * `done`  = usuario con tenants completos (la página redirige al primero).
 */
export type OnboardingPrefill = {
  mode: "create" | "resume" | "done";
  tenantId?: string;
  tenantName?: string;
  doneSlug?: string;
  draft: OnboardingDraft;
};