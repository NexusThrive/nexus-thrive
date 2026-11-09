import { createHash } from "node:crypto";

/**
 * Idempotencia de la API (`Idempotency-Key`): una operación que escribe o mueve dinero se ejecuta UNA vez por llave.
 * Repetir la petición con la misma llave y los mismos datos devuelve la respuesta guardada (24 h); con otros datos, 422.
 */
export const IDEMPOTENCY_TTL_MS = 24 * 3_600_000;
/** Una petición «en curso» que lleva más de esto sin terminar se considera caída y puede reintentarse. */
export const IDEMPOTENCY_STALE_MS = 2 * 60_000;

/** 8 a 128 caracteres: letras, números y `_ . : -` (un UUID cumple). */
export const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9_.:-]{8,128}$/;

export type IdempotencyClaim =
  | { state: "new" }
  | { state: "replay"; status: number; body: unknown }
  | { state: "conflict" }
  | { state: "in_progress" };

/** Almacén de respuestas por llave. La implementación con base de datos está en `idempotency-db.ts`; las pruebas usan una en memoria. */
export type IdempotencyStore = {
  claim(input: { tenantId: string; apiKeyId: string; key: string; hash: string }): Promise<IdempotencyClaim>;
  complete(input: { tenantId: string; apiKeyId: string; key: string; status: number; body: unknown }): Promise<void>;
  /** Libera la llave cuando la operación falló, para que se pueda reintentar. */
  release(input: { tenantId: string; apiKeyId: string; key: string }): Promise<void>;
};

const stable = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, stable(v)]));
  return value;
};

/** Huella de la petición: la operación y sus datos, sin importar el orden de los campos. */
export function requestHash(operationId: string, input: unknown): string {
  return createHash("sha256").update(JSON.stringify([operationId, stable(input)])).digest("hex");
}
