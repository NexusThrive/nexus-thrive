/**
 * Límite de intentos por usuario para las acciones sensibles del onboarding
 * (validar un código de acceso). Evita la fuerza bruta de códigos y el
 * abusing de códigos filtrados.
 *
 * Es un contador EN MEMORIA: suficiente para el piloto (un proceso de Node)
 * y sin dependencias. En un despliegue serverless el límite se aplica por
 * instancia, así que es un disuasorio, no una garantía.
 */

type Bucket = { hits: number[]; blockedUntil: number };

const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 8;
const BLOCK_MS = 5 * 60_000;

const buckets = new Map<string, Bucket>();

/** true si el usuario puede intentarlo ahora mismo. */
export function allowAttempt(key: string, nowMs = Date.now()): boolean {
  const bucket = buckets.get(key);
  if (!bucket) return true;
  if (bucket.blockedUntil > nowMs) return false;
  const recent = bucket.hits.filter((at) => nowMs - at < WINDOW_MS);
  bucket.hits = recent;
  return recent.length < MAX_ATTEMPTS;
}

/** Registra un intento y bloquea si se pasó el tope. */
export function recordAttempt(key: string, nowMs = Date.now()): void {
  const bucket = buckets.get(key) ?? { hits: [], blockedUntil: 0 };
  bucket.hits.push(nowMs);
  const recent = bucket.hits.filter((at) => nowMs - at < WINDOW_MS);
  bucket.hits = recent;
  if (recent.length >= MAX_ATTEMPTS) {
    bucket.blockedUntil = nowMs + BLOCK_MS;
    bucket.hits = [];
  }
  buckets.set(key, bucket);
}

/** Limpia el estado de un usuario (tras un canje exitoso). */
export function resetAttempts(key: string): void {
  buckets.delete(key);
}
