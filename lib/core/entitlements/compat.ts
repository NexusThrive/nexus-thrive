import type { VerticalValue } from "@/lib/core/sectors/verticals";
import type { ModuleValue } from "@/lib/core/capabilities/modules";
import { incompatibleMessage, isCompatible, solutionForVertical, type SolutionId } from "@/lib/core/capabilities/solutions";
import { CORE_MODULE, moduleOf, type PricingConfig } from "./pricing";

/**
 * ¿Se puede activar o desactivar esta función? Regla única para el Operations
 * Center y los Ajustes del negocio: el Inicio no se apaga y solo se activa lo
 * que ya funciona (nunca una función "planeada"). La SOLUCIÓN del negocio (ADR 0007) decide qué capacidades son
 * compatibles: encender una que su solución no admite se rechaza, salvo que el Operations Center lo autorice
 * (`allowIncompatible`, la revisión manual de los negocios híbridos). Apagar nunca se rechaza por esto y lo que el negocio
 * ya usa no se toca. El plan limita el uso (usuarios y clientes), no las funciones.
 */
export function checkModuleToggle(
  config: PricingConfig,
  _vertical: VerticalValue,
  module: ModuleValue,
  active: boolean,
  /** Se conserva por compatibilidad (`Tenant.contractedModules`); ya no limita: todo está incluido. */
  contracted?: readonly string[] | null,
  options: { allowIncompatible?: boolean; solution?: SolutionId } = {},
): { ok: true } | { ok: false; message: string } {
  if (module === CORE_MODULE && !active) return { ok: false, message: "El Inicio siempre está activo." };
  if (!active) return { ok: true };
  // Todas las funciones están incluidas en todos los planes y el rubro no limita: solo importa que estén operativas.
  void contracted;
  const m = moduleOf(config, module);
  if (m?.status === "PLANNED") return { ok: false, message: `${m.label} todavía no está operativo.` };
  const solution = options.solution ?? solutionForVertical(_vertical);
  if (!options.allowIncompatible && !isCompatible(solution, module)) return { ok: false, message: incompatibleMessage(solution, m?.label ?? module) };
  return { ok: true };
}

export type ModuleState = "operational" | "beta" | "planned";

/** Contratado (plan) · habilitado (TenantModule) · operativo (catálogo). */
export function moduleStatusRow(
  config: PricingConfig,
  _vertical: VerticalValue,
  module: ModuleValue,
  contracted: readonly string[] | null,
  enabled: boolean,
) {
  const m = moduleOf(config, module);
  return {
    module,
    label: m?.label ?? module,
    // Todo está incluido en todos los planes.
    contracted: true,
    enabled,
    state: (m?.status === "READY" ? "operational" : m?.status === "BETA" ? "beta" : "planned") as ModuleState,
    /** Siempre true: el rubro ya no limita funciones (se conserva el campo por compatibilidad). */
    compatible: true,
  };
}
