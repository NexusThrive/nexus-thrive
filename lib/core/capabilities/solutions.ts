import type { VerticalValue } from "@/lib/core/sectors/verticals";
import type { ModuleValue } from "./modules";

/**
 * Manifiesto de soluciones (ADR 0007, HU-soluciones-01). Las cinco soluciones de Nexus y, para cada capacidad del
 * registro (ADR 0003), a cuáles pertenece:
 *
 * - **Motor compartido** (`engine`): existe una sola vez y es compatible con todas las soluciones (clientes, cobros, finanzas…).
 * - **Nativa** (`native`): la solución la trae y la sugiere al empezar.
 * - **Compatible** (`also`): no es nativa, pero un negocio híbrido de esa solución puede encenderla.
 *
 * La solución decide qué es COMPATIBLE; el plan (usos y límites) decide cuánto se puede usar. Nunca se oculta ni se
 * apaga algo que un negocio ya usa: la compatibilidad solo limita lo que se enciende de nuevo.
 */
export const SOLUTION_IDS = ["commerce", "food", "gym", "museum", "business"] as const;
export type SolutionId = (typeof SOLUTION_IDS)[number];

export const SOLUTIONS: Record<SolutionId, { label: string; description: string }> = {
  commerce: { label: "Nexus Commerce", description: "Negocios que venden productos: pedidos, cobros, inventario y entregas." },
  food: { label: "Nexus Food", description: "Restaurantes y cafés: mesas, menú, comandas y cuentas." },
  gym: { label: "Nexus Gym", description: "Gimnasios y academias: membresías, renovaciones y control de acceso." },
  museum: { label: "Nexus Museum", description: "Museos y eventos con aforo: entradas, reservas por horario y exposiciones." },
  business: { label: "Nexus Business", description: "Empresas de servicios: clientes, cotizaciones, proyectos, entregables y cobros." },
};

type Placement = { engine: true } | { engine?: false; native: readonly SolutionId[]; also?: readonly SolutionId[] };

/** Pertenencia de cada capacidad. `satisfies` obliga a clasificar cualquier capacidad nueva del registro. */
export const CAPABILITY_SOLUTIONS = {
  // Motores compartidos: todas las soluciones.
  dashboard: { engine: true },
  crm: { engine: true },
  finance: { engine: true },
  payments: { engine: true },
  online_payments: { engine: true },
  billing: { engine: true },
  receivables: { engine: true },
  accounting: { engine: true },
  taxes: { engine: true },
  einvoicing: { engine: true },
  whatsapp: { engine: true },
  website: { engine: true },
  google: { engine: true },
  growth: { engine: true },
  inventory: { engine: true },
  purchases: { engine: true },
  pos: { engine: true },
  quotes: { engine: true },
  bookings: { engine: true },
  // Especializadas: la solución que las trae y las que las admiten.
  memberships: { native: ["gym"], also: ["business"] },
  orders: { native: ["food", "commerce"], also: ["business"] },
  construction: { native: ["business"] },
} as const satisfies Record<ModuleValue, Placement>;

/**
 * Solución de cada rubro (la puerta de entrada del registro). Un rubro nuevo o desconocido cae en Business con
 * configuración asistida, en vez de forzar una categoría.
 */
export const SOLUTION_OF_VERTICAL: Record<VerticalValue, SolutionId> = {
  restaurant: "food",
  hospitality: "food",
  gym: "gym",
  education: "gym",
  museum: "museum",
  events: "museum",
  retail: "commerce",
  hardware_store: "commerce",
  construction: "business",
  carpentry: "business",
  beauty: "business",
  healthcare: "business",
  mechanic: "business",
  real_estate: "business",
  tourism_agency: "business",
  tour_guides: "business",
  nautical_transport: "business",
  general: "business",
};

/** Solución que le corresponde a un rubro por defecto. */
export function solutionForVertical(vertical: VerticalValue | string | null | undefined): SolutionId {
  return SOLUTION_OF_VERTICAL[vertical as VerticalValue] ?? "business";
}

const placement = (module: ModuleValue): Placement => CAPABILITY_SOLUTIONS[module];

/** ¿La capacidad es un motor compartido (sirve a todas las soluciones)? */
export const isEngine = (module: ModuleValue) => placement(module).engine === true;

/** ¿La solución trae esta capacidad como propia? Los motores compartidos son de todas. */
export function isNativeTo(solution: SolutionId, module: ModuleValue): boolean {
  const p = placement(module);
  return p.engine === true || p.native.includes(solution);
}

/** ¿Puede un negocio de esta solución encender la capacidad? (nativa, motor compartido o admitida). */
export function isCompatible(solution: SolutionId, module: ModuleValue): boolean {
  const p = placement(module);
  return p.engine === true || p.native.includes(solution) || (p.also?.includes(solution) ?? false);
}

/** Capacidades que la solución trae como propias (sin contar los motores compartidos). */
export function nativeCapabilities(solution: SolutionId): ModuleValue[] {
  return (Object.keys(CAPABILITY_SOLUTIONS) as ModuleValue[]).filter((m) => !isEngine(m) && isNativeTo(solution, m));
}

/** Mensaje cuando se intenta encender algo que la solución no admite. */
export function incompatibleMessage(solution: SolutionId, label: string): string {
  return `«${label}» no forma parte de ${SOLUTIONS[solution].label}. Escríbenos si tu negocio la necesita y la habilitamos.`;
}
