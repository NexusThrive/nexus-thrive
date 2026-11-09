import { applySearch, groupRows, searchTerms, type GroupNode, type SearchDefs, type SearchState } from "@/lib/foundation/list-search";
import type { CustomerSearchRow } from "./customer-search";

/**
 * Arma la lista de Clientes para la búsqueda avanzada: filtra, ordena, pagina o agrupa. Puro. La página trae después los
 * datos completos solo de los `ids` que se van a mostrar.
 */
export type CustomerGroupView = {
  path: string;
  groupingId: string;
  label: string;
  icon?: string;
  count: number;
  /** Saldo por cobrar del grupo (suma de sus clientes). */
  owed: number;
  rowIds: string[];
  children: CustomerGroupView[];
};

/** Con agrupación se muestran a lo sumo estos clientes; el conteo de cada grupo sigue siendo el real. */
export const GROUPED_VISIBLE_CAP = 200;

export type CustomerList = {
  total: number;
  ids: string[];
  groups: CustomerGroupView[] | null;
  terms: string[];
  page: number;
  totalPages: number;
};

function sortRows(rows: CustomerSearchRow[], sort: string): CustomerSearchRow[] {
  if (sort === "name_asc") return [...rows].sort((a, b) => a.name.localeCompare(b.name, "es"));
  if (sort === "name_desc") return [...rows].sort((a, b) => b.name.localeCompare(a.name, "es"));
  return [...rows].sort((a, b) => b.createdAt - a.createdAt);
}

function view(node: GroupNode<CustomerSearchRow>, budget: { left: number }, defs: SearchDefs<CustomerSearchRow>): CustomerGroupView {
  const children = node.children.map((child) => view(child, budget, defs));
  const all = node.children.length ? [] : node.rows;
  const visible = all.slice(0, Math.max(0, budget.left));
  budget.left -= visible.length;
  return {
    path: node.path,
    groupingId: node.groupingId,
    label: node.label,
    icon: node.icon ?? defs.groupings.find((g) => g.id === node.groupingId)?.icon,
    count: node.count,
    // Se suma sobre las filas del grupo, no sobre los subgrupos: un cliente en dos subgrupos cuenta una sola vez.
    owed: Math.round(node.all.reduce((sum, r) => sum + r.owed, 0) * 100) / 100,
    rowIds: visible.map((r) => r.id),
    children,
  };
}

const flatIds = (groups: CustomerGroupView[]): string[] => groups.flatMap((g) => [...g.rowIds, ...flatIds(g.children)]);

export function buildCustomerList({
  rows,
  defs,
  state,
  sort,
  page,
  pageSize,
}: {
  rows: CustomerSearchRow[];
  defs: SearchDefs<CustomerSearchRow>;
  state: SearchState;
  sort: string;
  page: number;
  pageSize: number;
}): CustomerList {
  const filtered = sortRows(applySearch(rows, defs, state), sort);
  const terms = searchTerms(state.q);
  if (state.groups.length > 0) {
    const budget = { left: GROUPED_VISIBLE_CAP };
    const groups = groupRows(filtered, defs, state.groups).map((node) => view(node, budget, defs));
    return { total: filtered.length, ids: flatIds(groups), groups, terms, page: 1, totalPages: 1 };
  }
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const ids = filtered.slice((safePage - 1) * pageSize, safePage * pageSize).map((r) => r.id);
  return { total: filtered.length, ids, groups: null, terms, page: safePage, totalPages };
}
