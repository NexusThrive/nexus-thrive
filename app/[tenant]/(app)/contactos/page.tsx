import { createTenantDb } from "@/lib/core/tenancy/db";
import { profileFor } from "@/lib/business/customers/customer-fields";
import { isRouteEnabled } from "@/lib/core/tenancy/context";
import { createMembershipsDb } from "@/lib/industry/gym/memberships-repo";
import { LiveRefresh } from "@/components/molecules/live-refresh";
import CustomerToolbar from "./_components/customer-toolbar";
import CustomerTable, { type CustomerRow } from "./_components/customer-table";
import { customerAgendaSummary } from "@/lib/business/customers/customer-agenda";
import type { CustomerSort, CustomerStatus } from "./_components/customer-filters";
import { requirePageContext } from "@/lib/core/tenancy/context";
import { can } from "@/lib/core/auth/permissions";

const PAGE_SIZE = 20;

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

  const q = firstString(sp.q).trim();
  const status: CustomerStatus =
    firstString(sp.status) === "archived" ? "archived" : "active";
  const sortRaw = firstString(sp.sort);
  const sort: CustomerSort =
    sortRaw === "name_asc" || sortRaw === "name_desc" ? sortRaw : "recent";
  const pageRaw = Number.parseInt(firstString(sp.page), 10);
  const requestedPage = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;

  // Sesión + negocio activo + membresía activa (SEC-03): no basta el layout.
  const pageCtx = await requirePageContext(tenantSlug, "/contactos");
  const tenantRecord = pageCtx.tenant;

  const tenantDb = createTenantDb(tenantRecord.id);

  let result = await tenantDb.customers.search({
    q,
    status,
    sort,
    page: requestedPage,
    pageSize: PAGE_SIZE,
  });

  // Si la página pedida se pasa del final (?page=999), reconsulta la última.
  const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));
  const safePage = Math.min(requestedPage, totalPages);
  if (result.rows.length === 0 && safePage !== requestedPage) {
    result = await tenantDb.customers.search({
      q,
      status,
      sort,
      page: safePage,
      pageSize: PAGE_SIZE,
    });
  }

  // Gimnasio con el módulo de membresías: el CRM avisa quién quedó sin plan.
  const showMembership =
    profileFor(tenantRecord.vertical).planOnCreate &&
    (await isRouteEnabled(tenantRecord.id, "/memberships"));
  const activeMembers = showMembership
    ? await createMembershipsDb(tenantRecord.id).activeCustomerIds(result.rows.map((row) => row.id))
    : new Set<string>([]);

  const agenda = await customerAgendaSummary(tenantRecord.id, result.rows.map((row) => row.id));
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
  }));


  return (
    <div className="space-y-6" data-bleed="">
      <LiveRefresh everyMs={8000} />
      <CustomerToolbar
        tenantSlug={tenantSlug}
        status={status}
        page={safePage}
        pageSize={PAGE_SIZE}
        totalPages={totalPages}
        total={result.total}
      />

      <CustomerTable
        tenantSlug={tenantSlug}
        rows={customerRows}
        status={status}
        sort={sort}
        query={q}
        canRemove={can(pageCtx.role, "customers.delete")}
        showMembership={showMembership && status === "active"}
      />
    </div>
  );
}
