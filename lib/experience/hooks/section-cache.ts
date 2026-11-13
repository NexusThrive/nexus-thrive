/**
 * Caché de secciones **en la memoria de esta pestaña**: la última vista de cada sección para pintarla al instante al volver y refrescarla
 * por detrás. Son datos privados, así que vive solo en un `Map` del módulo: nunca en `localStorage`, `sessionStorage`, IndexedDB ni el
 * service worker (`packages/brand/docs/04-patrones/pwa.md`). Recargar la página la vacía.
 *
 * Aislamiento: todo cuelga de un «alcance» (`usuario:negocio`). Si el alcance cambia (otra persona, otro negocio) o se cierra la sesión, se
 * borra todo. Sin alcance fijado no se guarda ni se lee nada. Acotada: pocas entradas (se descarta la menos usada) y caducan a los 10 min.
 */
const MAX_ENTRIES = 24;
const TTL_MS = 10 * 60_000;

let scope = "";
const store = new Map<string, { data: unknown; at: number }>();

/** Fija de quién y de qué negocio son las entradas; si cambia, vacía todo. */
export function setSectionScope(next: string): void {
  if (next === scope) return;
  scope = next;
  store.clear();
}

/** Vacía todo y deja la caché sin alcance (al cerrar sesión o entrar a inicio de sesión / registro). */
export function clearSections(): void {
  scope = "";
  store.clear();
}

/** La última versión de una sección y cuándo se guardó; `null` si no hay, caducó o no hay alcance. */
export function readSection<T>(key: string): { data: T; at: number } | null {
  if (!scope) return null;
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() - entry.at > TTL_MS) {
    store.delete(key);
    return null;
  }
  // Se marca como la más reciente (orden de uso).
  store.delete(key);
  store.set(key, entry);
  return { data: entry.data as T, at: entry.at };
}

/** Guarda lo que se acaba de pintar (datos serializables; sin funciones ni nodos). */
export function writeSection(key: string, data: unknown): void {
  if (!scope) return;
  store.delete(key);
  store.set(key, { data, at: Date.now() });
  while (store.size > MAX_ENTRIES) store.delete(store.keys().next().value as string);
}

/** Cuántas entradas hay (para pruebas). */
export function sectionCount(): number {
  return store.size;
}
