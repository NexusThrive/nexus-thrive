/**
 * Límite de peticiones por llave: ventana deslizante de un minuto, **en
 * memoria**. En un despliegue serverless se aplica por instancia (es un tope
 * contra abuso, no una cuota exacta); la cuota por plan y la medición exacta
 * llegan con X.00 (UsageCounter). Devuelve lo que pide la cabecera `RateLimit-*`.
 */
const WINDOW_MS = 60_000;
export const DEFAULT_LIMIT_PER_MINUTE = 120;

const hits = new Map<string, number[]>();

export type RateLimitResult = { allowed: boolean; limit: number; remaining: number; resetSeconds: number };

export function consume(key: string, limit = DEFAULT_LIMIT_PER_MINUTE, nowMs = Date.now()): RateLimitResult {
  const recent = (hits.get(key) ?? []).filter((at) => nowMs - at < WINDOW_MS);
  const allowed = recent.length < limit;
  if (allowed) recent.push(nowMs);
  hits.set(key, recent);
  const oldest = recent[0] ?? nowMs;
  return {
    allowed,
    limit,
    remaining: Math.max(0, limit - recent.length),
    resetSeconds: Math.max(1, Math.ceil((oldest + WINDOW_MS - nowMs) / 1000)),
  };
}

/** Solo para pruebas. */
export function resetRateLimits() {
  hits.clear();
}
