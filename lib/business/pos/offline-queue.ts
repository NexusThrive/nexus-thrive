/**
 * Cola de ventas sin conexión (reglas puras). Si se cae el internet mientras se vende, la venta se guarda en el dispositivo con su
 * identificador y se envía sola al volver la conexión. El identificador viaja con la venta: el servidor no la registra dos veces
 * aunque el envío se repita. Nunca guarda nada que no sea la venta misma (sin datos de pago de terceros ni claves).
 */
export type QueuedSale = {
  /** Identificador de la venta (el mismo en cada reintento). */
  id: string;
  /** Cuándo se hizo, para mostrarlo. */
  at: string;
  /** Resumen legible para la lista de pendientes. */
  label: string;
  /** La venta tal como la armó el cajero (el servidor recalcula precios, impuestos y descuentos). */
  input: unknown;
  /** Por qué el servidor la rechazó, si ya se intentó y no pasó. */
  error?: string;
};

export const QUEUE_LIMIT = 50;
const KEY = (slug: string) => `nx:pos-queue:${slug}`;

export type Store = { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void };

export function readQueue(store: Store | null, slug: string): QueuedSale[] {
  try {
    const raw = store?.getItem(KEY(slug));
    const data: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? data.filter((s): s is QueuedSale => !!s && typeof s === "object" && typeof (s as QueuedSale).id === "string" && typeof (s as QueuedSale).at === "string") : [];
  } catch {
    return [];
  }
}

function write(store: Store | null, slug: string, queue: QueuedSale[]) {
  try {
    if (!store) return;
    if (queue.length) store.setItem(KEY(slug), JSON.stringify(queue));
    else store.removeItem(KEY(slug));
  } catch {
    /* sin almacenamiento (modo privado o lleno): la venta queda solo en memoria */
  }
}

/** Agrega una venta a la cola (sin repetir el mismo id). Devuelve la cola nueva o `null` si está llena. */
export function enqueue(store: Store | null, slug: string, sale: QueuedSale): QueuedSale[] | null {
  const current = readQueue(store, slug);
  if (current.some((s) => s.id === sale.id)) return current;
  if (current.length >= QUEUE_LIMIT) return null;
  const next = [...current, sale];
  write(store, slug, next);
  return next;
}

export function dequeue(store: Store | null, slug: string, id: string): QueuedSale[] {
  const next = readQueue(store, slug).filter((s) => s.id !== id);
  write(store, slug, next);
  return next;
}

export function markFailed(store: Store | null, slug: string, id: string, error: string): QueuedSale[] {
  const next = readQueue(store, slug).map((s) => (s.id === id ? { ...s, error } : s));
  write(store, slug, next);
  return next;
}

/** ¿El fallo es de red (reintentable) y no una respuesta del servidor? */
export function isNetworkFailure(error: unknown): boolean {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  const text = String((error as Error)?.message ?? error);
  return /failed to fetch|networkerror|network request failed|load failed|fetch failed|ECONN|ERR_INTERNET/i.test(text);
}
