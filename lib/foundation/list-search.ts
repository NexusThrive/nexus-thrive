/**
 * Motor de la búsqueda avanzada de las listas (Filtros · Agrupar por · Favoritos). Es puro y no sabe de clientes, citas ni
 * oportunidades: cada sección le entrega sus definiciones y sus filas. Idea tomada del buscador de Odoo (filtros que se
 * combinan, agrupación anidada, filtros personalizados y favoritos); nada de su código.
 *
 * Estado en la URL: `q` (texto), `en` (campos donde busca), `filtros`, `grupo` (lista separada por comas) y `regla`
 * (repetido: `campo:operador:valor`).
 */

export type SearchRow = object;

/** Campo donde puede buscar el texto escrito («Buscar en»). */
export type SearchFieldDef<R> = { id: string; label: string; defaultOn: boolean; get: (row: R) => string };

/** Un filtro. Los de un mismo grupo se combinan con O; los de grupos distintos, con Y. */
export type FilterOptionDef<R> = { id: string; label: string; test: (row: R) => boolean };
/**
 * `exclusive`: se elige una sola opción del grupo (Activos / Archivados). `defaultOption`: la que rige mientras no se
 * elija otra; se muestra como chip sin «×» porque no se puede quitar, solo cambiar.
 */
export type FilterGroupDef<R> = { id: string; options: FilterOptionDef<R>[]; exclusive?: boolean; defaultOption?: string };

/** Un valor por el que se puede agrupar. Una fila puede caer en varios (p. ej. los grupos propios del cliente). */
export type GroupKey = { key: string; label: string; icon?: string };
export type GroupingDef<R> = { id: string; label: string; icon: string; keys: (row: R) => GroupKey[]; system: boolean; quick?: boolean };

/** Un campo que el filtro personalizado puede comparar. `values` lo vuelve una lista a elegir. */
export type RuleFieldKind = "text" | "number" | "date";
export type RuleFieldDef<R> = { id: string; label: string; get: (row: R) => string[]; values?: { value: string; label: string }[]; kind?: RuleFieldKind };

export type RuleOp = "is" | "not" | "contains" | "gte" | "lte" | "empty" | "filled";
export type SearchRule = { field: string; op: RuleOp; value: string };

export const RULE_OPS: { id: RuleOp; label: string; needsValue: boolean }[] = [
  { id: "is", label: "es", needsValue: true },
  { id: "not", label: "no es", needsValue: true },
  { id: "contains", label: "contiene", needsValue: true },
  { id: "gte", label: "es mayor o igual a (desde)", needsValue: true },
  { id: "lte", label: "es menor o igual a (hasta)", needsValue: true },
  { id: "empty", label: "está vacío", needsValue: false },
  { id: "filled", label: "no está vacío", needsValue: false },
];

export type SearchState = {
  q: string;
  /** `null` = los campos por defecto de la sección. */
  fields: string[] | null;
  filters: string[];
  groups: string[];
  rules: SearchRule[];
};

/** Lo serializable de las definiciones (sin funciones): es lo que viaja al navegador para pintar el panel. */
export type SearchSchema = {
  fields: { id: string; label: string; defaultOn: boolean }[];
  filterGroups: { id: string; exclusive?: boolean; defaultOption?: string; options: { id: string; label: string }[] }[];
  groupings: { id: string; label: string; icon: string; system: boolean; quick?: boolean }[];
  ruleFields: { id: string; label: string; values?: { value: string; label: string }[]; kind?: RuleFieldKind }[];
};

export type SearchDefs<R> = {
  fields: SearchFieldDef<R>[];
  filterGroups: FilterGroupDef<R>[];
  groupings: GroupingDef<R>[];
  ruleFields: RuleFieldDef<R>[];
};

export function toSchema<R>(defs: SearchDefs<R>): SearchSchema {
  return {
    fields: defs.fields.map(({ id, label, defaultOn }) => ({ id, label, defaultOn })),
    filterGroups: defs.filterGroups.map((g) => ({
      id: g.id,
      exclusive: g.exclusive,
      defaultOption: g.defaultOption,
      options: g.options.map(({ id, label }) => ({ id, label })),
    })),
    groupings: defs.groupings.map(({ id, label, icon, system, quick }) => ({ id, label, icon, system, quick: quick !== false })),
    ruleFields: defs.ruleFields.map(({ id, label, values, kind }) => ({ id, label, values, kind })),
  };
}

export const EMPTY_SEARCH: SearchState = { q: "", fields: null, filters: [], groups: [], rules: [] };

type ParamsLike = { get(name: string): string | null; getAll(name: string): string[] };

const list = (raw: string | null) => (raw ?? "").split(",").map((s) => s.trim()).filter(Boolean);
const OPS = new Set<string>(RULE_OPS.map((op) => op.id));

export function encodeRule(rule: SearchRule): string {
  return `${rule.field}:${rule.op}:${rule.value}`;
}

export function decodeRule(raw: string): SearchRule | null {
  const first = raw.indexOf(":");
  const second = raw.indexOf(":", first + 1);
  if (first < 1 || second < 0) return null;
  const op = raw.slice(first + 1, second);
  if (!OPS.has(op)) return null;
  return { field: raw.slice(0, first), op: op as RuleOp, value: raw.slice(second + 1) };
}

/** Lee el estado de la URL y descarta lo que la sección no conoce (enlaces viejos o editados a mano). */
export type SearchAlias = { param: string; map: Record<string, string> };

/** `alias`: un parámetro viejo de la URL que equivale a un filtro (`?status=archived` → «Archivados»). */
export function parseSearchState(params: ParamsLike, defs: SearchSchema, alias?: SearchAlias): SearchState {
  const knownFilters = new Set(defs.filterGroups.flatMap((g) => g.options.map((o) => o.id)));
  const knownGroups = new Set(defs.groupings.map((g) => g.id));
  const knownFields = new Set(defs.fields.map((f) => f.id));
  const knownRuleFields = new Set(defs.ruleFields.map((f) => f.id));
  const en = list(params.get("en")).filter((id) => knownFields.has(id));
  const aliased = alias ? alias.map[params.get(alias.param) ?? ""] : undefined;
  const filters = [...new Set(list(params.get("filtros")).filter((id) => knownFilters.has(id)))];
  const group = aliased ? defs.filterGroups.find((g) => g.options.some((o) => o.id === aliased)) : undefined;
  if (aliased && group && !filters.some((id) => group.options.some((o) => o.id === id))) filters.push(aliased);
  return {
    q: (params.get("q") ?? "").trim(),
    fields: params.get("en") === null ? null : en,
    filters,
    groups: [...new Set(list(params.get("grupo")).filter((id) => knownGroups.has(id)))],
    rules: params
      .getAll("regla")
      .map(decodeRule)
      .filter((rule): rule is SearchRule => rule !== null && knownRuleFields.has(rule.field))
      .slice(0, 12),
  };
}

/** Escribe el estado sobre una copia de los parámetros (quita lo vacío, vuelve a la página 1). */
export function writeSearchState(base: URLSearchParams, state: SearchState, alias?: SearchAlias): URLSearchParams {
  const next = new URLSearchParams(base.toString());
  for (const key of ["q", "en", "filtros", "grupo", "regla", "page", ...(alias ? [alias.param] : [])]) next.delete(key);
  // `v`: la persona ya tocó la búsqueda; desde ahí no se vuelve a aplicar el favorito por defecto.
  next.set("v", "1");
  if (state.q) next.set("q", state.q);
  if (state.fields) next.set("en", state.fields.join(","));
  if (state.filters.length) next.set("filtros", state.filters.join(","));
  if (state.groups.length) next.set("grupo", state.groups.join(","));
  for (const rule of state.rules) next.append("regla", encodeRule(rule));
  return next;
}

/** ¿Hay algo más que el listado de siempre (texto simple + estado)? Decide si se usa la búsqueda avanzada. */
export function isAdvanced(state: SearchState): boolean {
  return state.q.includes("|") || state.filters.length > 0 || state.groups.length > 0 || state.rules.length > 0 || state.fields !== null;
}

/** Los filtros que rigen: los elegidos más la opción por defecto de cada grupo sin elección. */
export function effectiveFilters(state: SearchState, defs: SearchSchema): string[] {
  const out = [...state.filters];
  for (const group of defs.filterGroups) {
    if (group.defaultOption && !group.options.some((o) => out.includes(o.id))) out.push(group.defaultOption);
  }
  return out;
}

export function activeFieldIds(state: SearchState, defs: SearchSchema): string[] {
  return state.fields ?? defs.fields.filter((f) => f.defaultOn).map((f) => f.id);
}

const fold = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Los términos del texto: cada «Enter» deja uno (separados por «|»); lo escrito sin confirmar es el último. */
export function searchTerms(text: string): string[] {
  return text.split("|").map((t) => t.trim()).filter(Boolean);
}

/** Todas las palabras de todos los términos deben aparecer en alguno de los campos activos (sin tildes ni mayúsculas). */
export function matchesText<R>(row: R, text: string, fields: SearchFieldDef<R>[]): boolean {
  const words = fold(text).split(/[\s|]+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = fields.map((f) => fold(f.get(row))).join("\n");
  return words.every((word) => haystack.includes(word));
}

export function matchesRule<R>(row: R, rule: SearchRule, def: RuleFieldDef<R>): boolean {
  const values = def.get(row).map(fold).filter((v) => v !== "");
  const wanted = fold(rule.value);
  switch (rule.op) {
    case "is":
      return values.includes(wanted);
    case "not":
      return !values.includes(wanted);
    case "contains":
      return values.some((v) => v.includes(wanted));
    case "gte":
    case "lte": {
      // Números se comparan como números y las fechas «AAAA-MM-DD» como texto (ordenan igual).
      const target = Number(rule.value);
      const numeric = def.kind === "number" && Number.isFinite(target);
      return values.some((v) => {
        const cmp = numeric ? Number(v) - target : v < wanted ? -1 : v > wanted ? 1 : 0;
        return Number.isNaN(cmp) ? false : rule.op === "gte" ? cmp >= 0 : cmp <= 0;
      });
    }
    case "empty":
      return values.length === 0;
    case "filled":
      return values.length > 0;
  }
}

/** Aplica texto, filtros por grupo (Y entre grupos, O dentro) y reglas. `skipGroup`/`extra` sirven para contar opciones. */
export function applySearch<R>(
  rows: R[],
  defs: SearchDefs<R>,
  state: SearchState,
  override?: { filters?: string[] },
): R[] {
  const fields = activeFieldIds(state, defs);
  const searchFields = defs.fields.filter((f) => fields.includes(f.id));
  const filters = override?.filters ?? effectiveFilters(state, defs);
  const active = defs.filterGroups
    .map((group) => group.options.filter((option) => filters.includes(option.id)))
    .filter((options) => options.length > 0);
  const rules = state.rules.flatMap((rule) => {
    const def = defs.ruleFields.find((f) => f.id === rule.field);
    return def ? [{ rule, def }] : [];
  });
  return rows.filter(
    (row) =>
      matchesText(row, state.q, searchFields) &&
      active.every((options) => options.some((option) => option.test(row))) &&
      rules.every(({ rule, def }) => matchesRule(row, rule, def)),
  );
}

/** Cuántos registros quedarían al activar cada opción (con el resto del estado tal como está). */
export function countOptions<R>(rows: R[], defs: SearchDefs<R>, state: SearchState): Record<string, number> {
  const out: Record<string, number> = {};
  for (const group of defs.filterGroups) {
    const others = effectiveFilters(state, defs).filter((id) => !group.options.some((o) => o.id === id));
    for (const option of group.options) {
      const chosen = group.exclusive ? [option.id] : [...state.filters.filter((id) => group.options.some((o) => o.id === id)), option.id];
      out[option.id] = applySearch(rows, defs, state, { filters: [...others, ...chosen] }).length;
    }
  }
  return out;
}

export type GroupNode<R> = {
  /** Ruta de claves desde la raíz: identifica el grupo al plegarlo. */
  path: string;
  groupingId: string;
  label: string;
  /** Icono propio del grupo (los grupos que arma el negocio); si falta, el de la agrupación. */
  icon?: string;
  count: number;
  /** Todas las filas del grupo, también las que se reparten entre sus subgrupos (sin repetir). */
  all: R[];
  rows: R[];
  children: GroupNode<R>[];
};

const NONE: GroupKey = { key: "", label: "Sin asignar" };

/** Agrupación anidada en el orden elegido. Una fila puede aparecer en varios grupos (p. ej. si tiene varias etiquetas). */
export function groupRows<R>(rows: R[], defs: SearchDefs<R>, groupIds: string[], parentPath = ""): GroupNode<R>[] {
  const [head, ...rest] = groupIds;
  const grouping = head ? defs.groupings.find((g) => g.id === head) : undefined;
  if (!grouping) return [];
  const buckets = new Map<string, { label: string; icon?: string; rows: R[] }>();
  for (const row of rows) {
    const keys = grouping.keys(row);
    for (const k of keys.length ? keys : [NONE]) {
      const bucket = buckets.get(k.key) ?? { label: k.label, icon: k.icon, rows: [] };
      bucket.rows.push(row);
      buckets.set(k.key, bucket);
    }
  }
  return [...buckets.entries()]
    .sort(([ka, a], [kb, b]) => (ka === "" ? 1 : kb === "" ? -1 : a.label.localeCompare(b.label, "es")))
    .map(([key, bucket]) => {
      const path = `${parentPath}/${grouping.id}=${key}`;
      const children = rest.length ? groupRows(bucket.rows, defs, rest, path) : [];
      return { path, groupingId: grouping.id, label: bucket.label, icon: bucket.icon, count: bucket.rows.length, all: bucket.rows, rows: children.length ? [] : bucket.rows, children };
    });
}

/** Texto del chip de agrupación: «Ciudad > Origen». */
export function groupingLabel(defs: SearchSchema, groupIds: string[]): string {
  return groupIds.map((id) => defs.groupings.find((g) => g.id === id)?.label ?? id).join(" > ");
}

/** Lo que se guarda en un favorito: el estado tal como va en la URL. */
export type SearchSnapshot = { q?: string; en?: string; filtros?: string; grupo?: string; regla?: string[] };

export function snapshotOf(state: SearchState): SearchSnapshot {
  const out: SearchSnapshot = {};
  if (state.q) out.q = state.q;
  if (state.fields) out.en = state.fields.join(",");
  if (state.filters.length) out.filtros = state.filters.join(",");
  if (state.groups.length) out.grupo = state.groups.join(",");
  if (state.rules.length) out.regla = state.rules.map(encodeRule);
  return out;
}

export function paramsOfSnapshot(snapshot: SearchSnapshot): URLSearchParams {
  const params = new URLSearchParams();
  if (snapshot.q) params.set("q", snapshot.q);
  if (snapshot.en !== undefined) params.set("en", snapshot.en);
  if (snapshot.filtros) params.set("filtros", snapshot.filtros);
  if (snapshot.grupo) params.set("grupo", snapshot.grupo);
  for (const rule of snapshot.regla ?? []) params.append("regla", rule);
  return params;
}

export function stateOfSnapshot(snapshot: SearchSnapshot, schema: SearchSchema): SearchState {
  return parseSearchState(paramsOfSnapshot(snapshot), schema);
}

export function sameSearch(a: SearchState, b: SearchState): boolean {
  return JSON.stringify(snapshotOf(a)) === JSON.stringify(snapshotOf(b));
}

/** Nombre sugerido para guardar: lo que está activo, en palabras («Activos · Con saldo por cobrar · Ciudad»). */
export function suggestSearchName(state: SearchState, schema: SearchSchema, fallback = "Mi búsqueda"): string {
  const labels = schema.filterGroups.flatMap((g) => g.options).filter((o) => effectiveFilters(state, schema).includes(o.id)).map((o) => o.label);
  const parts = [...labels, ...searchTerms(state.q).map((t) => `«${t}»`), ...(state.groups.length ? [groupingLabel(schema, state.groups)] : [])];
  return parts.join(" · ").slice(0, 60) || fallback;
}
