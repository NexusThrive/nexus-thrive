import { registerSector } from "@/lib/core/sectors/registry";
import type { SectorDefinition } from "@/lib/core/sectors/catalog";

/**
 * Registro de los sectores que aportan su propia definición (V10 · M2).
 *
 * Es el único lugar donde Core y las industrias se encuentran: Core no importa `lib/industry/` (regla R1); cada industria con
 * código declara su definición en `lib/industry/<sector>/sector.ts` y esa definición se agrega a la lista de abajo. Los sectores
 * sin código viven como datos en `lib/core/sectors/catalog.ts` y no necesitan registro.
 *
 * Se ejecuta una vez al arrancar el servidor (`instrumentation.ts`) y en la preparación de las pruebas con base de datos
 * (`vitest.setup.ts`), junto a `composePorts()`. Es idempotente. Hoy ninguna industria declara su definición (llega en M7), así
 * que registra una lista vacía y el comportamiento es el del catálogo base.
 *
 * Agregar un sector: crear `lib/industry/<sector>/sector.ts`, importarlo aquí y añadirlo a `INDUSTRY_SECTORS`. La prueba
 * `tests/architecture/v10-sectores.test.ts` falla si existe un `sector.ts` que no esté en la lista.
 */
const INDUSTRY_SECTORS: readonly SectorDefinition[] = [];

/** Registra las definiciones de las industrias. Devuelve los ids registrados, ordenados. */
export function composeSectors(): string[] {
  for (const sector of INDUSTRY_SECTORS) registerSector(sector);
  return INDUSTRY_SECTORS.map((s) => s.id).sort();
}
