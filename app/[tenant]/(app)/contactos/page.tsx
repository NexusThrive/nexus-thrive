import { createTenantDb } from "@/lib/core/tenancy/db";
import { profileFor } from "@/lib/business/customers/customer-fields";
import { isRouteEnabled } from "@/lib/core/tenancy/context";
import { createMembershipsDb } from "@/lib/industry/gym/memberships-repo";
import { LiveRefresh } from "@/components/molecules/live-refresh";
import CustomerToolbar from "./_components/customer-toolbar";
import CustomerTable, { type CustomerRow } from "./_components/customer-table";
import { CustomerSelectionProvider } from "./_components/customer-selection";
import { customerAgendaSummary } from "@/lib/business/customers/customer-agenda";
import type { CustomerSort, CustomerStatus } from "./_components/customer-filters";
import { requirePageContext } from "@/lib/core/tenancy/context";
import { can } from "@/lib/core/auth/permissions";
import { redirect } from "next/navigation";
import { buildCustomerList } from "@/lib/business/customers/customer-list";
import { customerSearchDefs } from "@/lib/business/customers/customer-search";
import { groupIdsOfCustomers, listCustomerGroups, listOwners, loadCustomerSearchRows } from "@/lib/business/customers/customer-search-db";
import { listSavedSearches } from "@/lib/core/saved-searches-db";
import { isAdvanced, parseSearchState, paramsOfSnapshot, toSchema, type SearchAlias } from "@/lib/foundation/list-search";

/** Enlaces de antes: `?status=archived` equivale al filtro «Archivados». */
const STATUS_ALIAS: SearchAlias = { param: "status", map: { archived: "archivados", active: "activos" } };
const SEARCH_KEYS = ["q", "en", "filtros", "grupo", "regla", "v", "page", "status", "sort"];

const PAGE_SIZE = 20;
const CUSTOMER_SECTION = "customers";

const dateFormatter = new Intl.DateTimeFormat("es-CO", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "America/Bogota",
});

/** Normaliza Temporal.Instant / Date / string a un Date de JS. */
function toDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return value;
  }
  const raw = String(value);
  // JS Date solo acepta 3 fracciones (ms); Temporal imprime nanos.
  const iso = raw.replace(/\.(\d{3})\d*(Z|[+-])/, ".$1$2");
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Etiqueta de fecha formateada en el servidor (hidratación estable). */
function formatCustomerDate(value: unknown): string {
  const date = toDate(value);
  return date ? dateFormatter.format(date) : "";
}

function firstString(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

/**
 * CRM: la URL es la fuente de verdad de los filtros
 * (`?q=&status=&sort=&page=`). El buscador/filtros la actualizan y esta
 * página reconsulta; cada Server Action llama `revalidatePath`.
 *
 * El acceso (tenant activo + miembro) está garantizado por el layout de
 * `app/[tenant]/layout.tsx`, que envuelve este segmento.
 */
export default async function CrmPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { tenant: tenantSlug } = await params;
  const sp = await searchParams;

  // Sesión + negocio activo + membresía activa (SEC-03): no basta el layout.
  const pageCtx = await requirePageContext(tenantSlug, "/contactos");
  const tenantRecord = pageCtx.tenant;
  const tenantDb = createTenantDb(tenantRecord.id);

  // Los grupos propios y los favoritos de la persona alimentan el buscador avanzado.
  const [groups, owners, favorites] = await Promise.all([
    listCustomerGroups(tenantRecord.id),
    listOwners(tenantRecord.id),
    listSavedSearches(tenantRecord.id, pageCtx.memberId, CUSTOMER_SECTION),
  ]);

  // Al entrar a la sección sin haber tocado la búsqueda se aplica el favorito por defecto (`v` marca que ya se tocó).
  const untouched = !sp.v && !["q", "en", "filtros", "grupo", "regla"].some((key) => sp[key] !== undefined);
  const defaultFavorite = favorites.find((f) => f.isDefault);
  if (untouched && defaultFavorite) {
    const params = new URLSearchParams(paramsOfSnapshot(defaultFavorite.params));
    for (const [key, value] of Object.entries(sp)) if (key !== "page" && typeof value === "string") params.set(key, value);
    params.set("v", "1");
    redirect(`/${tenantSlug}/contactos?${params.toString()}`);
  }

  const urlParams = new URLSearchParams();
  for (const key of SEARCH_KEYS) {
    const raw = sp[key];
    for (const value of Array.isArray(raw) ? raw : raw === undefined ? [] : [raw]) urlParams.append(key, value);
  }
  const emptyDefs = customerSearchDefs({ groups, owners, rows: [] });
  const searchState = parseSearchState(urlParams, toSchema(emptyDefs), STATUS_ALIAS);
  const advanced = isAdvanced(searchState);

  const q = advanced ? "" : firstString(sp.q).trim();
  const status: CustomerStatus = searchState.filters.includes("archivados") ? "archived" : "active";
  const sortRaw = firstString(sp.sort);
  const sort: CustomerSort =
    sortRaw === "name_asc" || sortRaw === "name_desc" ? sortRaw : "recent";
  const pageRaw = Number.parseInt(firstString(sp.page), 10);
  const requestedPage = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;

  type CustomerRecord = Awaited<ReturnType<typeof tenantDb.customers.search>>["rows"][number];
  let rowsFromDb: CustomerRecord[];
  let total: number;
  let safePage: number;
  let totalPages: number;
  let groupViews: Awaited<ReturnType<typeof buildCustomerList>>["groups"] = null;
  let terms: string[] = [];
  let schema = toSchema(emptyDefs);

  if (advanced) {
    // Búsqueda avanzada: se filtra, ordena y agrupa en memoria sobre el tope de filas del negocio.
    const loaded = await loadCustomerSearchRows(tenantRecord.id, { withNotes: searchState.fields?.includes("notas") ?? false });
    const defs = customerSearchDefs({ groups, owners: loaded.owners, rows: loaded.rows });
    schema = toSchema(defs);
    const list = buildCustomerList({ rows: loaded.rows, defs, state: searchState, sort, page: requestedPage, pageSize: PAGE_SIZE });
    const details = list.ids.length ? await tenantDb.customers.listByIds(list.ids) : [];
    const byId = new Map(details.map((row) => [row.id, row]));
    // Un cliente en varios grupos aparece en cada uno (`list.ids` lo repite); la tabla recibe cada cliente una sola vez.
    rowsFromDb = [...new Set(list.ids)].flatMap((id) => (byId.get(id) ? [byId.get(id)!] : []));
    total = list.total;
    safePage = list.page;
    totalPages = list.totalPages;
    groupViews = list.groups;
    terms = list.terms;
  } else {
    let result = await tenantDb.customers.search({ q, status, sort, page: requestedPage, pageSize: PAGE_SIZE });
    // Si la página pedida se pasa del final (?page=999), reconsulta la última.
    totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));
    safePage = Math.min(requestedPage, totalPages);
    if (result.rows.length === 0 && safePage !== requestedPage) {
      result = await tenantDb.customers.search({ q, status, sort, page: safePage, pageSize: PAGE_SIZE });
    }
    rowsFromDb = result.rows;
    total = result.total;
    terms = q ? [q] : [];
  }
  const result = { rows: rowsFromDb, total };

  // Gimnasio con el módulo de membresías: el CRM avisa quién quedó sin plan.
  const showMembership =
    profileFor(tenantRecord.vertical).planOnCreate &&
    (await isRouteEnabled(tenantRecord.id, "/memberships"));
  const activeMembers = showMembership
    ? await createMembershipsDb(tenantRecord.id).activeCustomerIds(result.rows.map((row) => row.id))
    : new Set<string>([]);

  const agenda = await customerAgendaSummary(tenantRecord.id, result.rows.map((row) => row.id));
  const memberOf = await groupIdsOfCustomers(tenantRecord.id, result.rows.map((row) => row.id));
  const groupInfo = new Map(groups.map((g) => [g.id, { id: g.id, name: g.name, icon: g.icon }]));
  const customerRows: CustomerRow[] = result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email ?? "",
    phone: row.phone ?? "",
    active: row.active,
    createdAt: formatCustomerDate(row.createdAt),
    photoId: row.photoId,
    tags: [...(row.tags ?? [])],
    documentId: row.documentId,
    hasMembership: activeMembers.has(row.id),
    nextAppointment: agenda.get(row.id)?.nextAppointment ?? null,
    owed: agenda.get(row.id)?.owed ?? 0,
    overdue: agenda.get(row.id)?.overdue ?? 0,
    city: row.city ?? "",
    groups: (memberOf.get(row.id) ?? []).flatMap((id) => (groupInfo.has(id) ? [groupInfo.get(id)!] : [])),
  }));


  return (
    <CustomerSelectionProvider status={status}>
    <div className="flex flex-col" data-bleed="">
      <LiveRefresh everyMs={8000} />
      <CustomerToolbar
        tenantSlug={tenantSlug}
        status={status}
        page={safePage}
        pageSize={groupViews ? Math.max(1, result.total) : PAGE_SIZE}
        totalPages={totalPages}
        total={result.total}
        schema={schema}
        favorites={favorites}
        groups={groups}
        canDeleteGroups={can(pageCtx.role, "customers.delete")}
      />

      <CustomerTable
        tenantSlug={tenantSlug}
        rows={customerRows}
        status={status}
        sort={sort}
        query={q}
        canRemove={can(pageCtx.role, "customers.delete")}
        showMembership={showMembership && status === "active"}
        groups={groupViews}
        groupOptions={groups}
        terms={terms}
        filtered={advanced || q !== ""}
        clearHref={`/${tenantSlug}/contactos?v=1`}
      />
    </div>
    </CustomerSelectionProvider>
  );
}
