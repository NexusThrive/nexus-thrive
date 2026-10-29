/**
 * Diseño personalizable del dashboard: qué bloques se ven, en qué orden y
 * cuántas columnas (de 12) ocupa cada uno en pantallas grandes. Lógica pura
 * (sin React ni almacenamiento) para poder probarla; `CustomizableDashboard`
 * la usa y guarda el resultado.
 *
 * Versionado: lo guardado lleva `v`. La v1 (sin tamaños) y la v2 (sin altos ni
 * gráficos agregados) se leen y se completan con los valores por defecto; un dato desconocido o corrupto se ignora.
 * Cuando el diseño pase a la base de datos (por persona), este mismo objeto
 * es el que se serializa: solo cambia dónde se guarda.
 */
export const LAYOUT_VERSION = 3;

/** Columnas (de 12) que puede ocupar un bloque desde `lg`. */
import { MAX_ROWS, MIN_ROWS, isChartType, type ChartType } from "./chart-catalog";

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
  /** Alto elegido por bloque de gráfico, en filas (`ROW_PX`). */
  heights: Record<string, number>;
  /** Gráficos que la persona agregó desde «Agregar» (el id lleva el tipo y un número). */
  added: { id: string; type: ChartType }[];
};

export const isSpan = (value: unknown): value is Span => SPANS.includes(value as Span);

export const defaultLayout = (ids: readonly string[]): DashboardLayout => ({ v: LAYOUT_VERSION, order: [...ids], hidden: [], spans: {}, heights: {}, added: [] });

/**
 * Reconcilia lo guardado con los bloques que existen hoy: descarta ids que ya
 * no existen (módulo apagado), agrega los nuevos al final, completa la v1 y
 * tolera cualquier basura que haya en el almacenamiento.
 */
export function normalizeLayout(stored: unknown, ids: readonly string[]): DashboardLayout {
  const raw = (stored && typeof stored === "object" ? stored : {}) as Partial<DashboardLayout>;
  const strings = (value: unknown) => (Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : []);

  // Los gráficos agregados cuentan como bloques conocidos (su id empieza por su tipo).
  const added: DashboardLayout["added"] = [];
  if (Array.isArray(raw.added)) {
    for (const item of raw.added as unknown[]) {
      const { id, type } = (item ?? {}) as { id?: unknown; type?: unknown };
      if (typeof id === "string" && isChartType(type) && id.startsWith(`${type}-`) && !ids.includes(id) && !added.some((a) => a.id === id)) added.push({ id, type });
    }
  }
  const all = [...ids, ...added.map((a) => a.id)];
  const known = new Set(all);

  const order = [...new Set(strings(raw.order))].filter((id) => known.has(id));
  // Un bloque nuevo (o uno que se dividió en varios) entra justo después del que lo precede
  // en el orden por defecto, no al final: así no se pierde su sitio en un diseño ya guardado.
  all.forEach((id, i) => {
    if (order.includes(id)) return;
    const before = all.slice(0, i).reverse().find((prev) => order.includes(prev));
    order.splice(before ? order.indexOf(before) + 1 : 0, 0, id);
  });
  const hidden = [...new Set(strings(raw.hidden))].filter((id) => known.has(id));
  const spans: Record<string, Span> = {};
  if (raw.spans && typeof raw.spans === "object") {
    for (const [id, span] of Object.entries(raw.spans)) if (known.has(id) && isSpan(span)) spans[id] = span;
  }
  const heights: Record<string, number> = {};
  if (raw.heights && typeof raw.heights === "object") {
    for (const [id, rows] of Object.entries(raw.heights)) if (known.has(id) && Number.isFinite(rows)) heights[id] = clampRows(rows as number);
  }
  return { v: LAYOUT_VERSION, order, hidden, spans, heights, added };
}

export const clampRows = (rows: number): number => Math.min(MAX_ROWS, Math.max(MIN_ROWS, Math.round(rows)));

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
  return layout.added.length > 0 || layout.hidden.length > 0 || Object.keys(layout.spans).length > 0 || Object.keys(layout.heights).length > 0 || layout.order.some((id, i) => id !== ids[i]);
}

export function setHeight(layout: DashboardLayout, id: string, rows: number): DashboardLayout {
  return { ...layout, heights: { ...layout.heights, [id]: clampRows(rows) } };
}

/** Pasa al ancho siguiente (+1) o anterior (−1) de `SPANS`; en el borde no cambia nada. */
export function stepSpan(current: Span, delta: -1 | 1): Span {
  const at = SPANS.indexOf(current);
  return SPANS[Math.min(SPANS.length - 1, Math.max(0, at + delta))]!;
}

/** El ancho de `SPANS` más cercano a `px`, dado el ancho de una columna (de 12) en px. */
export function spanFromWidth(px: number, columnPx: number): Span {
  const columns = px / Math.max(1, columnPx);
  return SPANS.reduce((best, s) => (Math.abs(s - columns) < Math.abs(best - columns) ? s : best), SPANS[0]);
}

/** Agrega un gráfico del catálogo al final con su tamaño de nacimiento; devuelve el nuevo diseño y su id. */
export function addWidget(layout: DashboardLayout, type: ChartType, span: Span, rows: number): { layout: DashboardLayout; id: string } {
  let n = 1;
  while (layout.added.some((a) => a.id === `${type}-${n}`)) n++;
  const id = `${type}-${n}`;
  return {
    id,
    layout: {
      ...layout,
      order: [...layout.order, id],
      added: [...layout.added, { id, type }],
      spans: { ...layout.spans, [id]: span },
      heights: { ...layout.heights, [id]: clampRows(rows) },
    },
  };
}

/** Quita un gráfico agregado (los bloques del sistema solo se ocultan). */
export function removeWidget(layout: DashboardLayout, id: string): DashboardLayout {
  if (!layout.added.some((a) => a.id === id)) return layout;
  const { [id]: _span, ...spans } = layout.spans;
  const { [id]: _rows, ...heights } = layout.heights;
  void _span;
  void _rows;
  return {
    ...layout,
    order: layout.order.filter((o) => o !== id),
    hidden: layout.hidden.filter((h) => h !== id),
    added: layout.added.filter((a) => a.id !== id),
    spans,
    heights,
  };
}
