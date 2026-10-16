import type { Metadata } from "next";
import { headers } from "next/headers";
import { createAdminDb, type TenantSortKey } from "@/lib/admin-db";
import { isVertical } from "@/lib/admin-catalogs";
import AdminHeader from "./_components/admin-header";
import ExecutiveKpis from "./_components/executive-kpis";
import TenantToolbar from "./_components/tenant-toolbar";
import TenantTable from "./_components/tenant-table";
import ActivityFeed from "./_components/activity-feed";
import AuditLog from "./_components/audit-log";

export const metadata: Metadata = {
  title: "Centro de comando · Nexus Thrive",
};

const PAGE_SIZE = 10;

const SORTS: TenantSortKey[] = [
  "created_desc",
  "created_asc",
  "name_asc",
  "name_desc",
  "activity_desc",
  "activity_asc",
];

function firstString(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function firstNumber(value: string | string[] | undefined): number {
  const parsed = Number.parseInt(firstString(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

/**
 * Centro de comando del CEO / SuperAdmin (host `admin.lvh.me` → rewrite de
 * `proxy.ts`).
 *
 * El gate de autorización (sesión + rol) vive en `app/admin/layout.tsx`.
 * Esta page solo resuelve datos y filtros; la URL es la fuente de verdad:
 * `q`, `vertical`, `status`, `attention`, `sort` y `page`.
 *
 * Todos los datos son reales (`lib/admin-db.ts`); lo que no tiene fuente
 * (MRR, trials, último login) se declara explícitamente en la UI.
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
  const attentionOnly = firstString(sp.attention) === "1";
  const sortRaw = firstString(sp.sort);
  const sort: TenantSortKey = SORTS.includes(sortRaw as TenantSortKey)
    ? (sortRaw as TenantSortKey)
    : "created_desc";
  const requestedPage = firstNumber(sp.page);

  const host = (await headers()).get("host") ?? "localhost:3000";
  const adminDb = createAdminDb();

  const [metrics, listResult, attentionResult, activity, audit] =
    await Promise.all([
      adminDb.getExecutiveMetrics(),
      adminDb.listTenants({
        host,
        q,
        vertical,
        activeStatus,
        attentionOnly,
        sort,
        page: requestedPage,
        limit: PAGE_SIZE,
      }),
      adminDb.listTenants({ host, attentionOnly: true, limit: 1 }),
      adminDb.getActivityFeed({ limit: 8 }),
      adminDb.listAuditLogs(6),
    ]);

  const totalPages = Math.max(1, Math.ceil(listResult.total / PAGE_SIZE));
  const safePage = Math.min(requestedPage, totalPages);

  return (
    <div className="space-y-8">
      <AdminHeader />

      <section id="resumen" className="scroll-mt-20">
        <ExecutiveKpis metrics={metrics} />
      </section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <section
          id="negocios"
          className="scroll-mt-20 space-y-4 lg:col-span-2"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-lg font-semibold text-foreground">
              Negocios de la plataforma
            </h2>
            <p className="text-sm text-muted-foreground">
              {listResult.total}{" "}
              {listResult.total === 1
                ? "negocio registrado"
                : "negocios registrados"}
            </p>
          </div>

          <TenantToolbar
            q={q}
            vertical={vertical}
            status={activeStatus === "all" ? undefined : activeStatus}
            sort={sort}
            attentionOnly={attentionOnly}
            attentionCount={attentionResult.total}
          />

          <TenantTable
            rows={listResult.rows}
            sort={sort}
            page={safePage}
            totalPages={totalPages}
            total={listResult.total}
          />
        </section>

        <aside className="space-y-8">
          <section
            id="actividad"
            className="scroll-mt-20 rounded-lg border border-border bg-card p-5"
          >
            <h2 className="font-display text-base font-semibold text-foreground">
              Actividad de la plataforma
            </h2>
            <p className="text-xs text-muted-foreground">
              Últimos movimientos reales de los negocios.
            </p>
            <div className="mt-4">
              <ActivityFeed items={activity} />
            </div>
          </section>

          <section
            id="auditoria"
            className="scroll-mt-20 rounded-lg border border-border bg-card p-5"
          >
            <h2 className="font-display text-base font-semibold text-foreground">
              Auditoría
            </h2>
            <p className="text-xs text-muted-foreground">
              Acciones administrativas recientes.
            </p>
            <div className="mt-4">
              <AuditLog rows={audit} />
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
