import { createMembershipsDb } from "@/lib/industry/gym/memberships-repo";
import { listProducts } from "@/lib/business/catalog/products-db";
import {
  MEMBERSHIP_STATUSES,
  MEMBERSHIP_TYPES,
  type MembershipStatusValue,
  type MembershipTypeValue,
} from "@/lib/industry/gym/memberships";
import MembershipTypes, { type MembershipTypeRow } from "./_components/membership-types";
import MembershipSummary from "./_components/membership-summary";
import MembershipFilters from "./_components/membership-filters";
import MembershipTable, {
  type MembershipViewRow,
} from "./_components/membership-table";
import { PageHeader } from "@/components/molecules/page-header";
import { requirePageContext } from "@/lib/core/tenancy/context";
import { can } from "@/lib/core/auth/permissions";

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

  // Sesión + negocio activo + membresía activa (SEC-03): no basta el layout.
  const pageCtx = await requirePageContext(tenantSlug, "/memberships");
  const tenantRecord = pageCtx.tenant;

  const memberships = createMembershipsDb(tenantRecord.id);

  const [metrics, membershipResult, plans] = await Promise.all([
    memberships.getMetrics(),
    memberships.list({
      q,
      status,
      type,
      page,
      limit: PAGE_SIZE,
    }),
    listProducts(tenantRecord.id, { kind: "PLAN" }),
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
    hold: row.hold,
  }));

  const totalPages = Math.max(
    1,
    Math.ceil(membershipResult.total / PAGE_SIZE),
  );
  const safePage = Math.min(page, totalPages);

  const typeRows: MembershipTypeRow[] = plans.map((plan) => ({
    id: plan.id,
    name: plan.name,
    price: plan.price,
    durationDays: plan.durationDays,
    active: plan.active,
  }));

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Encabezado */}
      <PageHeader
        title="Membresías"
        description={<>Tipos, socios y renovaciones de{" "}
            <span className="font-medium text-foreground/80">
              {tenantRecord.name}
            </span>
            .</>}
      />

      {/* Resumen */}
      <MembershipSummary metrics={metrics} />

      <MembershipTypes tenantSlug={tenantSlug} types={typeRows} canEdit={can(pageCtx.role, "business.manage")} />

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
          canSell={can(pageCtx.role, "money.handle")}
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
