import type { ModuleValue, VerticalValue } from "@/lib/admin/catalogs";
import { CORE_MODULE, moduleOf, verticalOf, type PricingConfig } from "./pricing";

/**
 * ¿Se puede activar o desactivar este módulo en un negocio de este rubro?
 * Regla única para el Operations Center y los Ajustes del negocio: el Inicio
 * no se apaga, y solo se activa lo que el rubro permite y ya funciona
 * (nunca un módulo "planeado").
 */
export function checkModuleToggle(
  config: PricingConfig,
  vertical: VerticalValue,
  module: ModuleValue,
  active: boolean,
  /**
   * Módulos del plan del negocio (`Tenant.contractedModules`). Desde los
   * Ajustes del negocio solo se activa lo contratado (SEC-06); el panel de
   * NEXUS no lo pasa porque es quien administra los planes. `null` (negocios
   * sin plan registrado) no limita.
   */
  contracted?: readonly string[] | null,
): { ok: true } | { ok: false; message: string } {
  if (module === CORE_MODULE && !active) return { ok: false, message: "El Inicio siempre está activo." };
  if (!active) return { ok: true };
  if (contracted && module !== CORE_MODULE && !contracted.includes(module)) {
    return { ok: false, message: `${moduleOf(config, module)?.label ?? module} no está incluido en tu plan.` };
  }
  const v = verticalOf(config, vertical);
  if (v && !v.modules.includes(module)) {
    return { ok: false, message: `${moduleOf(config, module)?.label ?? module} no es compatible con el rubro ${v.label}.` };
  }
  const m = moduleOf(config, module);
  if (m?.status === "PLANNED") return { ok: false, message: `${m.label} todavía no está operativo.` };
  return { ok: true };
}

export type ModuleState = "operational" | "beta" | "planned";

/** Contratado (plan) · habilitado (TenantModule) · operativo (catálogo). */
export function moduleStatusRow(
  config: PricingConfig,
  vertical: VerticalValue,
  module: ModuleValue,
  contracted: readonly string[] | null,
  enabled: boolean,
) {
  const m = moduleOf(config, module);
  const v = verticalOf(config, vertical);
  return {
    module,
    label: m?.label ?? module,
    contracted: contracted ? contracted.includes(module) : enabled,
    enabled,
    state: (m?.status === "READY" ? "operational" : m?.status === "BETA" ? "beta" : "planned") as ModuleState,
    compatible: module === CORE_MODULE || !!v?.modules.includes(module),
  };
}
