import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  FolderKanban,
  Hammer,
  ListChecks,
} from "lucide-react";
import { db } from "@/prisma/db";
import { createTenantDb } from "@/lib/tenant-db";
import { PROJECT_STATUSES, isValidProjectStatus } from "@/lib/projects";
import { cn } from "@/lib/cn";
import SearchInput from "@/app/components/tenant/search-input";
import FilterSelect from "@/app/components/tenant/filter-select";
import ProjectsTable from "./_components/projects-table";
import NewProjectModal from "./_components/new-project-modal";

const PROJECTS_PAGE_SIZE = 12;

function firstString(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function card(
  icon: React.ReactNode,
  title: string,
  value: string,
  description: string,
  tone: string,
) {
  return (
    <article className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-muted-foreground">
            {title}
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {value}
          </p>
        </div>
        <span
          aria-hidden="true"
          className={cn(
            "grid h-10 w-10 shrink-0 place-items-center rounded-lg",
            tone,
          )}
        >
          {icon}
        </span>
      </div>
      <p className="mt-3 border-t border-border pt-2 text-xs text-muted-foreground">
        {description}
      </p>
    </article>
  );
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
      <header className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Link
            href={`/${tenantSlug}/quotes`}
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Volver a presupuestos
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Proyectos de obra
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Contenedor de proyectos de{" "}
            <span className="font-medium text-foreground/80">
              {tenantRecord.name}
            </span>
            : ficha del cliente y de la obra, y las bases para presupuestar y
            hacer seguimiento.
          </p>
        </div>
        <div className="mt-3 flex shrink-0 items-center gap-2 sm:mt-0">
          <NewProjectModal
            tenantSlug={tenantSlug}
            customers={customerOptions}
          />
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {card(
          <FolderKanban aria-hidden="true" className="h-5 w-5 text-accent-text" />,
          "Proyectos",
          String(metrics.total),
          "Total registrados",
          "bg-accent-subtle text-accent-text",
        )}
        {card(
          <Hammer aria-hidden="true" className="h-5 w-5 text-success" />,
          "En ejecución",
          String(metrics.inExecution),
          "Obras activas",
          "bg-success/10 text-success",
        )}
        {card(
          <CheckCircle2 aria-hidden="true" className="h-5 w-5 text-gold-700" />,
          "Aprobados",
          String(metrics.approved),
          "Listos para iniciar",
          "bg-gold-100 text-gold-700",
        )}
        {card(
          <ListChecks
            aria-hidden="true"
            className="h-5 w-5 text-muted-foreground"
          />,
          "Completados",
          String(metrics.completed),
          "Obras finalizadas",
          "bg-muted text-muted-foreground",
        )}
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
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