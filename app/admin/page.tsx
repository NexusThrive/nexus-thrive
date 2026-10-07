import type { Metadata } from "next";
import { headers } from "next/headers";
import { createAdminDb } from "@/lib/admin-db";
import { isVertical } from "@/lib/admin-catalogs";
import AdminHeader from "./_components/admin-header";
import PlatformMetrics from "./_components/platform-metrics";
import TenantFilters from "./_components/tenant-filters";
import TenantTable from "./_components/tenant-table";

export const metadata: Metadata = {
  title: "Panel CEO · Nexus Thrive",
};

const PAGE_SIZE = 10;

function firstString(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function firstNumber(value: string | string[] | undefined): number {
  const parsed = Number.parseInt(firstString(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

/**
 * Panel CEO / SuperAdmin (host `admin.lvh.me` → rewrite de `proxy.ts`).
 *
 * El gate de autorización (sesión + rol) vive en `app/admin/layout.tsx`.
 * Esta page solo resuelve datos y filtros; la URL es la fuente de verdad:
 * `q` (búsqueda), `vertical`, `status` y `page`.
 */
export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const q = firstString(sp.q).trim();
  const verticalRaw = firstString(sp.vertical);
  const vertical = isVertical(verticalRaw) ? verticalRaw : undefined;
  const statusRaw = firstString(sp.status);
  const activeStatus =
    statusRaw === "active" || statusRaw === "inactive" ? statusRaw : "all";
  const page = firstNumber(sp.page);

  const host = (await headers()).get("host") ?? "localhost:3000";
  const adminDb = createAdminDb();

  const [metrics, listResult] = await Promise.all([
    adminDb.getPlatformMetrics(),
    adminDb.listTenants({
      host,
      q,
      vertical,
      activeStatus,
      page,
      limit: PAGE_SIZE,
    }),
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(listResult.total / PAGE_SIZE),
  );
  const safePage = Math.min(page, totalPages);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        {/* Encabezado (incluye botón de alta) */}
        <AdminHeader />

        {/* Métricas globales */}
        <PlatformMetrics metrics={metrics} />

        {/* Filtros + listado */}
        <section aria-labelledby="admin-tenants-title" className="space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <h2
                id="admin-tenants-title"
                className="text-base font-semibold text-slate-900"
              >
                Negocios de la plataforma
              </h2>
              <p className="text-sm text-slate-500">
                {listResult.total}{" "}
                {listResult.total === 1
                  ? "negocio registrado"
                  : "negocios registrados"}
              </p>
            </div>
          </div>

          <TenantFilters
            q={q}
            vertical={vertical}
            status={activeStatus === "all" ? undefined : activeStatus}
          />

          <TenantTable
            rows={listResult.rows}
            query={q}
            page={safePage}
            totalPages={totalPages}
            total={listResult.total}
          />
        </section>
      </div>
    </div>
  );
}
