import { notFound } from "next/navigation";
import { db } from "@/prisma/db";
import { createTenantDb } from "@/lib/tenant-db";
import CustomerToolbar from "./_components/customer-toolbar";
import CustomerTable, { type CustomerRow } from "./_components/customer-table";
import type { CustomerSort, CustomerStatus } from "./_components/customer-filters";

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

  const tenantRecord = await db.orm.public.Tenant.where({
    slug: tenantSlug,
    active: true,
  }).first();
  if (!tenantRecord) {
    notFound();
  }

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

  const customerRows: CustomerRow[] = result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email ?? "",
    phone: row.phone ?? "",
    active: row.active,
    createdAt: formatCustomerDate(row.createdAt),
  }));

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          Clientes
        </h1>
        <p className="text-sm text-slate-500">
          Administra los clientes de{" "}
          <span className="font-medium text-slate-700">{tenantRecord.name}</span>.
        </p>
      </header>

      <CustomerToolbar
        tenantSlug={tenantSlug}
        status={status}
        sort={sort}
        total={result.total}
      />

      <CustomerTable
        tenantSlug={tenantSlug}
        rows={customerRows}
        status={status}
        page={safePage}
        totalPages={totalPages}
        total={result.total}
        query={q}
      />
    </div>
  );
}
