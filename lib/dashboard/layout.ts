/**
 * Diseño personalizable del dashboard: qué bloques se ven, en qué orden y
 * cuántas columnas (de 12) ocupa cada uno en pantallas grandes. Lógica pura
 * (sin React ni almacenamiento) para poder probarla; `CustomizableDashboard`
 * la usa y guarda el resultado.
 *
 * Versionado: lo guardado lleva `v`. La v1 (sin tamaños) se lee y se completa
 * con los tamaños por defecto; un dato desconocido o corrupto se ignora.
 * Cuando el diseño pase a la base de datos (por persona), este mismo objeto
 * es el que se serializa: solo cambia dónde se guarda.
 */
export const LAYOUT_VERSION = 2;

/** Columnas (de 12) que puede ocupar un bloque desde `lg`. */
export const SPANS = [3, 4, 6, 8, 12] as const;
export type Span = (typeof SPANS)[number];

export const SPAN_LABEL: Record<Span, string> = {
  3: "Un cuarto",
  4: "Un tercio",
  6: "La mitad",
  8: "Dos tercios",
  12: "Todo el ancho",
};

export type DashboardLayout = {
  v: typeof LAYOUT_VERSION;
  /** Orden de los bloques. */
  order: string[];
  /** Bloques ocultos. */
  hidden: string[];
  /** Ancho elegido por bloque (los que no aparecen usan el de por defecto). */
  spans: Record<string, Span>;
};

export const isSpan = (value: unknown): value is Span => SPANS.includes(value as Span);

export const defaultLayout = (ids: readonly string[]): DashboardLayout => ({ v: LAYOUT_VERSION, order: [...ids], hidden: [], spans: {} });

/**
 * Reconcilia lo guardado con los bloques que existen hoy: descarta ids que ya
 * no existen (módulo apagado), agrega los nuevos al final, completa la v1 y
 * tolera cualquier basura que haya en el almacenamiento.
 */
export function normalizeLayout(stored: unknown, ids: readonly string[]): DashboardLayout {
  const known = new Set(ids);
  const raw = (stored && typeof stored === "object" ? stored : {}) as Partial<DashboardLayout>;
  const strings = (value: unknown) => (Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : []);

  const order = [...new Set(strings(raw.order))].filter((id) => known.has(id));
  for (const id of ids) if (!order.includes(id)) order.push(id);
  const hidden = [...new Set(strings(raw.hidden))].filter((id) => known.has(id));
  const spans: Record<string, Span> = {};
  if (raw.spans && typeof raw.spans === "object") {
    for (const [id, span] of Object.entries(raw.spans)) if (known.has(id) && isSpan(span)) spans[id] = span;
  }
  return { v: LAYOUT_VERSION, order, hidden, spans };
}

/** Mueve un bloque una posición (−1 arriba, +1 abajo); en el borde no hace nada. */
export function moveWidget(layout: DashboardLayout, id: string, delta: -1 | 1): DashboardLayout {
  const from = layout.order.indexOf(id);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= layout.order.length) return layout;
  return placeWidget(layout, id, to);
}

/** Lleva un bloque a una posición exacta (arrastrar y soltar sobre otro). */
export function placeWidget(layout: DashboardLayout, id: string, to: number): DashboardLayout {
  const from = layout.order.indexOf(id);
  if (from < 0 || to < 0 || to >= layout.order.length || from === to) return layout;
  const order = [...layout.order];
  order.splice(from, 1);
  order.splice(to, 0, id);
  return { ...layout, order };
}

export function toggleWidget(layout: DashboardLayout, id: string): DashboardLayout {
  const hidden = layout.hidden.includes(id) ? layout.hidden.filter((h) => h !== id) : [...layout.hidden, id];
  return { ...layout, hidden };
}

export function setSpan(layout: DashboardLayout, id: string, span: Span): DashboardLayout {
  return { ...layout, spans: { ...layout.spans, [id]: span } };
}

/** ¿Difiere del diseño por defecto? (habilita «Restablecer»). */
export function isCustomized(layout: DashboardLayout, ids: readonly string[]): boolean {
  return layout.hidden.length > 0 || Object.keys(layout.spans).length > 0 || layout.order.some((id, i) => id !== ids[i]);
}
