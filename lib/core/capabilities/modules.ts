import { CAPABILITIES, CHILDREN_OF, type CapabilityId } from "./registry";

/**
 * Catálogo de módulos derivado del registro de capacidades: cuáles son base y cuáles especializados, sus nombres y las
 * guardas y utilidades para listas de módulos (orden estable, hijos que se desprendieron de otra función).
 * Antes vivía dentro de `lib/core/tenancy/catalogs.ts`, junto con los sectores y los medios de pago.
 */

type CapabilityOf<K extends "base" | "specialized"> = Extract<(typeof CAPABILITIES)[number], { kind: K }>["id"];

export const BASE_MODULES = CAPABILITIES.filter((c) => c.kind === "base").map((c) => c.id) as readonly CapabilityOf<"base">[];
export type BaseModuleValue = CapabilityOf<"base">;

export const SPECIALIZED_MODULES = CAPABILITIES.filter((c) => c.kind === "specialized").map((c) => c.id) as readonly CapabilityOf<"specialized">[];
export type SpecializedModuleValue = CapabilityOf<"specialized">;

export const MODULES: readonly CapabilityId[] = [...BASE_MODULES, ...SPECIALIZED_MODULES];
export type ModuleValue = CapabilityId;

export const MODULE_LABELS = Object.fromEntries(CAPABILITIES.map((c) => [c.id, c.label])) as Record<ModuleValue, string>;

/** Comprueba que un texto sea un módulo conocido. */
export function isModule(value: string): value is ModuleValue {
  return (MODULES as readonly string[]).includes(value);
}

/** Orden estable de módulos según el catálogo (para listas/badges). */
export function sortModules(modules: readonly ModuleValue[]): ModuleValue[] {
  return [...modules].sort(
    (a, b) => MODULES.indexOf(a) - MODULES.indexOf(b),
  );
}
/** Agrega a cada función las que se desprendieron de ella (Cartera con Finanzas, Punto de venta con Pagos…). */
export function withChildModules(list: readonly ModuleValue[]): ModuleValue[] {
  const out = new Set<ModuleValue>(list);
  for (const m of list) for (const child of CHILDREN_OF[m] ?? []) out.add(child as ModuleValue);
  return sortModules([...out]);
}
