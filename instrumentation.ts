/**
 * Punto de entrada del servidor (se ejecuta una vez, antes de atender
 * cualquier request — ver docs de instrumentación Next.js).
 *
 * Prisma 8 usa codecs Temporal para leer/escribir columnas temporales
 * (DateTime, timestamptz). Node.js < 26.8.2 y el runtime de Vercel no traen
 * `globalThis.Temporal`, así que hay que instalar el polyfill antes de la
 * primera query (RUNTIME.TEMPORAL_UNAVAILABLE en producción).
 *
 * También conecta los puertos entre dominios (`lib/runtime/ports.ts`): Business pide a
 * Finance la contabilización sin importarlo, y alguien tiene que unirlos antes de la
 * primera petición. Next garantiza que `register` termina antes de atender requests.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("temporal-polyfill/full/global");
    // Conecta los puertos entre dominios (contabilidad, numeración fiscal, cobros en línea, alta de negocios).
    // Si un puerto no queda conectado, usarlo falla de forma visible (PortNotProvidedError): nunca se omite en silencio.
    const { composePorts } = await import("@/lib/runtime/ports");
    console.info(`[puertos] conectados: ${composePorts().join(", ")}`);
    // Registra las definiciones de sector que aportan las industrias (hoy ninguna: rigen los valores del catálogo base).
    const { composeSectors } = await import("@/lib/runtime/sectors");
    const sectors = composeSectors();
    if (sectors.length) console.info(`[sectores] registrados: ${sectors.join(", ")}`);
  }
}