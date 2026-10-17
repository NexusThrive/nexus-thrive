import { notFound } from "next/navigation";
import {
  CheckCircle2,
  FolderKanban,
  Hammer,
  ListChecks,
} from "lucide-react";
import { db } from "@/prisma/db";
import { createTenantDb } from "@/lib/tenant-db";
import { PROJECT_STATUSES, isValidProjectStatus } from "@/lib/projects";
import { KpiCard } from "@/components/molecules/kpi-card";
import { PageHeader } from "@/components/molecules/page-header";
import SearchInput from "@/components/molecules/search-input";
import FilterSelect from "@/components/molecules/filter-select";
import ProjectsTable from "./_components/projects-table";
import NewProjectModal from "./_components/new-project-modal";

const PROJECTS_PAGE_SIZE = 12;

function firstString(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}


/**
 * Contenedor de proyectos de obra (FASE 1 del vertical construcción).
 * La URL es la fuente de verdad del listado (`?pq=&ps=&ppage=`) y cada
 * Server Action llama `revalidatePath`. El acceso (tenant activo + miembro)
 * está garantizado por el layout de `app/[tenant]/layout.tsx`.
 */
export default async function ProjectsPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { tenant: tenantSlug } = await params;
  const sp = await searchParams;

  const tenantRecord = await db.orm.public.Tenant.where({
    slug: tenantSlug,
    active: true,
  }).first();
  if (!tenantRecord) {
    notFound();
  }

  const tenantDb = createTenantDb(tenantRecord.id);

  const q = firstString(sp.pq).trim();
  const statusRaw = firstString(sp.ps);
  const status = isValidProjectStatus(statusRaw) ? statusRaw : undefined;
  const pageRaw = Number.parseInt(firstString(sp.ppage), 10);
  const requestedPage = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;

  const [metrics, result, customersResult] = await Promise.all([
    tenantDb.projects.getMetrics(),
    tenantDb.projects.list({
      q,
      status,
      page: requestedPage,
      limit: PROJECTS_PAGE_SIZE,
    }),
    tenantDb.customers.search({ status: "active", pageSize: 100 }),
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(result.total / PROJECTS_PAGE_SIZE),
  );
  const safePage = Math.min(requestedPage, totalPages);

  const customerOptions = customersResult.rows.map((customer) => ({
    id: customer.id,
    name: customer.name,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Construcción"
        title="Obras"
        description={
          <>
            Ficha del cliente y de la obra, presupuesto y seguimiento de{" "}
            <span className="font-medium text-foreground">{tenantRecord.name}</span>.
          </>
        }
        actions={<NewProjectModal tenantSlug={tenantSlug} customers={customerOptions} />}
      />

      <section aria-label="Resumen de obras" className="grid grid-cols-2 gap-3.5 xl:grid-cols-4">
        <KpiCard index={0} label="Obras" value={metrics.total} icon={FolderKanban} hint="Total registradas" />
        <KpiCard index={1} label="En ejecución" value={metrics.inExecution} icon={Hammer} hint="Obras activas" />
        <KpiCard index={2} label="Aprobadas" value={metrics.approved} icon={CheckCircle2} hint="Listas para iniciar" />
        <KpiCard index={3} label="Completadas" value={metrics.completed} icon={ListChecks} hint="Obras finalizadas" />
      </section>

      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex w-full flex-wrap items-center gap-2">
            <SearchInput
              paramKey="pq"
              pageParam="ppage"
              ariaLabel="Buscar proyectos"
              placeholder="Buscar proyecto o código…"
              defaultValue={q}
            />
            <FilterSelect
              paramKey="ps"
              pageParam="ppage"
              allLabel="Todos los estados"
              options={PROJECT_STATUSES}
              value={status ?? ""}
            />
          </div>
        </div>
        <ProjectsTable
          tenantSlug={tenantSlug}
          rows={result.rows}
          total={result.total}
          page={safePage}
        />
      </div>
    </div>
  );
}