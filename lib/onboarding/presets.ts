/**
 * Presets de módulos del onboarding adaptativo.
 *
 * Recomendación = receta de la vertical (VERTICAL_RECIPES) adaptada al
 * perfil: las personas naturales descartan los módulos pesados de
 * operación (requieren equipo), las empresas conservan la receta completa.
 * `dashboard` es la landing de la app `(app)` y nunca se descarta.
 */

import {
  VERTICAL_RECIPES,
  sortModules,
  type ModuleValue,
  type VerticalValue,
} from "@/lib/admin/catalogs";
import type { OnboardingTenantType } from "./types";

/** Módulos que implican equipo/operación: se omiten en el perfil INDIVIDUAL. */
const TEAM_HEAVY_MODULES: readonly ModuleValue[] = [
  "orders",
  "inventory",
  "purchases",
  "memberships",
  "billing",
];

/** Mínimo que todo negocio necesita (garantía de utilidad al entrar). */
export const MINIMAL_MODULES: readonly ModuleValue[] = [
  "dashboard",
  "crm",
  "payments",
];

export function getOnboardingModulePreset(input: {
  tenantType: OnboardingTenantType;
  vertical: VerticalValue;
}): ModuleValue[] {
  const recipe = VERTICAL_RECIPES[input.vertical].modules;
  const preset =
    input.tenantType === "INDIVIDUAL"
      ? recipe.filter((moduleName) => !TEAM_HEAVY_MODULES.includes(moduleName))
      : recipe;

  const resolved = new Set<ModuleValue>(preset);
  for (const moduleName of MINIMAL_MODULES) {
    resolved.add(moduleName);
  }

  // Orden estable según el catálogo (mismo orden que el sidebar).
  return sortModules([...resolved]);
}