/**
 * Igual que `instrumentation.ts` en el servidor: Prisma 8 necesita
 * `globalThis.Temporal` y Node < 26.8.2 (el del CI) no lo trae.
 */
import "temporal-polyfill/global";
