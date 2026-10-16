import { notFound } from "next/navigation";
import { db } from "@/prisma/db";
import { createTenantDb } from "@/lib/tenant-db";
import {
  MEMBERSHIP_STATUSES,
  MEMBERSHIP_TYPES,
  type MembershipStatusValue,
  type MembershipTypeValue,
} from "@/lib/memberships";
import MembershipSummary from "./_components/membership-summary";
import MembershipFilters from "./_components/membership-filters";
import MembershipTable, {
  type MembershipViewRow,
} from "./_components/membership-table";
import {
  NewMembershipButton,
  type MembershipCustomerOption,
} from "./_components/membership-form";

const PAGE_SIZE = 10;

function firstString(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function firstNumber(value: string | string[] | undefined): number {
  const parsed = Number.parseInt(firstString(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

/**
 * Módulo de Membresías. La URL es la fuente de verdad de los filtros:
 * `q` (búsqueda por cliente), `status` (estado dinámico), `type` (plan) y
 * `page`. El acceso (tenant activo + miembro) está garantizado por
 * `app/[tenant]/layout.tsx`.
 *
 * Los estados (`active`/`expiring`/`expired`) se calculan en el servidor
 * desde `endDate` contra "ahora", nunca desde el valor persistido.
 */
export default async function MembershipsPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { tenant: tenantSlug } = await params;
  const sp = await searchParams;

  const q = firstString(sp.q).trim();
  const statusRaw = firstString(sp.status);
  const status = MEMBERSHIP_STATUSES.some(
    (option) => option.value === statusRaw,
  )
    ? (statusRaw as MembershipStatusValue)
    : undefined;
  const typeRaw = firstString(sp.type);
  const type = MEMBERSHIP_TYPES.some((option) => option.value === typeRaw)
    ? (typeRaw as MembershipTypeValue)
    : undefined;
  const page = firstNumber(sp.page);

  const tenantRecord = await db.orm.public.Tenant.where({
    slug: tenantSlug,
    active: true,
  }).first();
  if (!tenantRecord) {
    notFound();
  }

  const tenantDb = createTenantDb(tenantRecord.id);

  const [metrics, membershipResult, activeCustomers] = await Promise.all([
    tenantDb.memberships.getMetrics(),
    tenantDb.memberships.list({
      q,
      status,
      type,
      page,
      limit: PAGE_SIZE,
    }),
    tenantDb.customers.search({ status: "active", pageSize: 200 }),
  ]);

  const rows: MembershipViewRow[] = membershipResult.rows.map((row) => ({
    id: row.id,
    customerName: row.customerName,
    customerPhone: row.customerPhone,
    customerEmail: row.customerEmail,
    type: row.type,
    status: row.status,
    price: row.price,
    startDate: row.startDate,
    endDate: row.endDate,
  }));

  const totalPages = Math.max(
    1,
    Math.ceil(membershipResult.total / PAGE_SIZE),
  );
  const safePage = Math.min(page, totalPages);

  const customerOptions: MembershipCustomerOption[] =
    activeCustomers.rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email ?? "",
    }));

  return (
    <div className="space-y-8">
      {/* Encabezado */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-[clamp(24px,4.4vw,34px)] font-bold leading-[1.12] tracking-[-0.02em] text-foreground">
            Membresías
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Planes y renovaciones de{" "}
            <span className="font-medium text-foreground/80">
              {tenantRecord.name}
            </span>
            .
          </p>
        </div>
        <NewMembershipButton
          tenantSlug={tenantSlug}
          customers={customerOptions}
        />
      </header>

      {/* Resumen */}
      <MembershipSummary metrics={metrics} />

      {/* Filtros + listado */}
      <section aria-labelledby="memberships-list-title" className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h2
              id="memberships-list-title"
              className="text-base font-semibold text-foreground"
            >
              Listado de membresías
            </h2>
            <p className="text-sm text-muted-foreground">
              {membershipResult.total}{" "}
              {membershipResult.total === 1
                ? "membresía registrada"
                : "membresías registradas"}
            </p>
          </div>
        </div>

        <MembershipFilters q={q} status={status} type={type} />

        <MembershipTable
          tenantSlug={tenantSlug}
          rows={rows}
          query={q}
          page={safePage}
          totalPages={totalPages}
        />
      </section>
    </div>
  );
}
