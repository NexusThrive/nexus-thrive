/**
 * Punto de entrada del servidor (se ejecuta una vez, antes de atender
 * cualquier request — ver docs de instrumentación Next.js).
 *
 * Prisma 8 usa codecs Temporal para leer/escribir columnas temporales
 * (DateTime, timestamptz). Node.js < 26.8.2 y el runtime de Vercel no traen
 * `globalThis.Temporal`, así que hay que instalar el polyfill antes de la
 * primera query (RUNTIME.TEMPORAL_UNAVAILABLE en producción).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("temporal-polyfill/full/global");
  }
}