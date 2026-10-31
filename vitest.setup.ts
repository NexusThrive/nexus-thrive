/**
 * Igual que `instrumentation.ts` en el servidor: Prisma 8 necesita
 * `globalThis.Temporal` y Node < 26.8.2 (el del CI) no lo trae.
 */
import "temporal-polyfill/global";

/**
 * Igual que `instrumentation.ts`: conecta los puertos entre dominios. Solo cuando hay base de datos de pruebas:
 * sin ella, las pruebas unitarias no ejecutan código que los use y no tienen por qué cargar los dominios.
 */
if (process.env.TEST_DATABASE_URL) {
  const { composePorts } = await import("@/lib/runtime/ports");
  composePorts();
}
