import { SECTOR_CATALOG, type SectorDefinition } from "./catalog";
import { LEGACY_VERTICAL_ALIASES } from "./verticals";

/**
 * Registro explícito de sectores.
 *
 * Parte del catálogo base (`catalog.ts`, siempre disponible, sin arranque previo) y admite que `lib/runtime/sectors.ts`
 * registre definiciones aportadas por una industria. Así un sector nuevo se incorpora con su propio archivo y una línea en
 * runtime, sin que ningún módulo compartido importe `lib/industry/` (regla R1).
 *
 * Reglas:
 * - Resolver un valor: un id registrado se usa tal cual; un alias heredado (`barber`) va a su sector actual; **cualquier otro
 *   valor usa el sector `general`**, neutral (D-V10-5). Nunca cae en gimnasio.
 * - Solo servidor: un registro hecho al arrancar (instrumentation.ts) no existe en el paquete del navegador. Un componente de
 *   cliente debe recibir sus términos desde el servidor (como hace `VerticalTermsProvider`), no resolverlos por su cuenta.
 */

const GENERAL = "general";

const base = new Map<string, SectorDefinition>(SECTOR_CATALOG.map((s) => [s.id, s]));
const overrides = new Map<string, SectorDefinition>();

const ID = /^[a-z][a-z0-9_]*$/;
const REQUIRED_TERMS = ["customer", "customers", "booking", "bookings", "item", "items"] as const;

function assertValid(def: SectorDefinition): void {
  if (!ID.test(def.id)) throw new Error(`Sector inválido: el id «${def.id}» debe ser minúsculas, números y guion bajo.`);
  if (!def.label.trim()) throw new Error(`Sector «${def.id}»: falta el nombre.`);
  for (const key of REQUIRED_TERMS) {
    if (!def.terms?.[key]?.trim()) throw new Error(`Sector «${def.id}»: falta el término «${key}».`);
  }
}

/**
 * Registra (o reemplaza) la definición de un sector. Devuelve una función que la retira y deja el catálogo base.
 * Solo debe llamarla `lib/runtime/sectors.ts`.
 */
export function registerSector(def: SectorDefinition): () => void {
  assertValid(def);
  overrides.set(def.id, def);
  return () => {
    if (overrides.get(def.id) === def) overrides.delete(def.id);
  };
}

/** La definición registrada con exactamente ese id, o `undefined` (sin alias ni respaldo). */
export function findSector(id: string): SectorDefinition | undefined {
  return overrides.get(id) ?? base.get(id);
}

/** La definición que corresponde a un valor cualquiera: registrado, alias heredado o, si no se reconoce, `general`. */
export function getSector(value: string): SectorDefinition {
  return findSector(value) ?? findSector(LEGACY_VERTICAL_ALIASES[value] ?? GENERAL) ?? base.get(GENERAL)!;
}

/** Todos los sectores disponibles (catálogo base y registrados), en un orden estable: primero el base. */
export function listSectors(): SectorDefinition[] {
  const ids = [...new Set([...base.keys(), ...overrides.keys()])];
  return ids.map((id) => findSector(id)!);
}
