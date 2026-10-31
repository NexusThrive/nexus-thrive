/**
 * Igual que `instrumentation.ts` en el servidor: Prisma 8 necesita
 * `globalThis.Temporal` y Node < 26.8.2 (el del CI) no lo trae.
 */
import "temporal-polyfill/global";

import { beforeAll } from "vitest";

/**
 * Igual que `instrumentation.ts`: conecta los puertos entre dominios. Solo cuando hay base de datos de pruebas:
 * sin ella, las pruebas unitarias no ejecutan código que los use y no tienen por qué cargar los dominios.
 *
 * Va en un `beforeAll` y con importación dinámica a propósito: así los dominios se cargan DESPUÉS de que cada
 * archivo de prueba registre sus `vi.mock` (si se cargaran aquí, al preparar el archivo, quedarían en caché con el
 * módulo real y la simulación no se aplicaría). Este hook se registra antes que los del archivo, así que corre primero.
 */
if (process.env.TEST_DATABASE_URL) {
  beforeAll(async () => {
    const { composePorts } = await import("@/lib/runtime/ports");
    composePorts();
  });
}
