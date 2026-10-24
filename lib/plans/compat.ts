import type { ModuleValue, VerticalValue } from "@/lib/admin/catalogs";
import { CORE_MODULE, moduleOf, type PricingConfig } from "./pricing";

/**
 * ¿Se puede activar o desactivar esta función? Regla única para el Operations
 * Center y los Ajustes del negocio: el Inicio no se apaga y solo se activa lo
 * que ya funciona (nunca una función "planeada"). Ni el rubro ni el plan
 * limitan qué funciones se pueden encender: el plan limita el uso (usuarios y
 * clientes).
 */
export function checkModuleToggle(
  config: PricingConfig,
  _vertical: VerticalValue,
  module: ModuleValue,
  active: boolean,
  /** Se conserva por compatibilidad (`Tenant.contractedModules`); ya no limita: todo está incluido. */
  contracted?: readonly string[] | null,
): { ok: true } | { ok: false; message: string } {
  if (module === CORE_MODULE && !active) return { ok: false, message: "El Inicio siempre está activo." };
  if (!active) return { ok: true };
  // Todas las funciones están incluidas en todos los planes y el rubro no limita: solo importa que estén operativas.
  void contracted;
  const m = moduleOf(config, module);
  if (m?.status === "PLANNED") return { ok: false, message: `${m.label} todavía no está operativo.` };
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
