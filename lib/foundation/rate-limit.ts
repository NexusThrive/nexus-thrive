/**
 * Límite de intentos por usuario para acciones sensibles:
 *
 * - Validar un código de acceso en el onboarding (fuerza bruta de códigos).
 * - Escanear en la puerta del gym (probar códigos o clonar tarjetas).
 *
 * Es un contador EN MEMORIA: suficiente para el piloto (un proceso de Node)
 * y sin dependencias. En un despliegue serverless el límite se aplica por
 * instancia, así que es un disuasorio, no una garantía.
 */

type Bucket = { hits: number[]; blockedUntil: number };

const WINDOW_MS = 60_000;
const BLOCK_MS = 5 * 60_000;

/** Tope por defecto: intentos por minuto antes de bloquear. */
const DEFAULT_MAX_ATTEMPTS = 8;

const buckets = new Map<string, Bucket>();

/**
 * true si se puede intentar ahora mismo.
 *
 * @param key   identifica a quien intenta (usuario, dispositivo...).
 * @param max   tope de intentos por minuto (por defecto 8).
 */
export function allowAttempt(key: string, max = DEFAULT_MAX_ATTEMPTS, nowMs = Date.now()): boolean {
  const bucket = buckets.get(key);
  if (!bucket) return true;
  if (bucket.blockedUntil > nowMs) return false;
  const recent = bucket.hits.filter((at) => nowMs - at < WINDOW_MS);
  bucket.hits = recent;
  return recent.length < max;
}

/** Registra un intento y bloquea si se pasó el tope. */
export function recordAttempt(key: string, max = DEFAULT_MAX_ATTEMPTS, nowMs = Date.now()): void {
  const bucket = buckets.get(key) ?? { hits: [], blockedUntil: 0 };
  bucket.hits.push(nowMs);
  const recent = bucket.hits.filter((at) => nowMs - at < WINDOW_MS);
  bucket.hits = recent;
  if (recent.length >= max) {
    bucket.blockedUntil = nowMs + BLOCK_MS;
    bucket.hits = [];
  }
  buckets.set(key, bucket);
}

/** Limpia el estado de un usuario (tras un canje exitoso). */
export function resetAttempts(key: string): void {
  buckets.delete(key);
}
