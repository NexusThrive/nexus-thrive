import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarDays, Construction, User } from "lucide-react";
import { db } from "@/prisma/db";
import { createTenantDb } from "@/lib/tenant-db";
import { PROJECT_TABS, parseProjectTab } from "@/lib/projects";
import { ProjectStatusBadge } from "../_components/project-status-badge";
import ProjectTabs from "./_components/project-tabs";
import ProjectHeaderForm from "./_components/project-header-form";
import BudgetWorkspace from "./_components/budget-workspace";
import LeanWorkspace from "./_components/lean-workspace";
import FieldLogWorkspace from "./_components/field-log-workspace";
import { getOrCreateProjectBudgetAction } from "./budget/actions";
import { getOrCreateFieldLogAction } from "./field-log/actions";

function firstString(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "America/Bogota",
  }).format(date);
}

/** Placeholder de las pestañas que llegan en fases posteriores del vertical. */
function TabPlaceholder({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center">
      <Construction
        aria-hidden="true"
        className="mx-auto h-6 w-6 text-muted-foreground"
      />
      <p className="mt-3 text-sm font-medium text-foreground">{label}</p>
      <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
        Esta sección llega en una próxima fase del vertical de construcción.
        FASE 1 entrega el contenedor y la ficha del proyecto (tab “Ficha y
        cliente”).
      </p>
    </div>
  );
}

/**
 * Contenedor del proyecto de obra (XI.00). Pestaña activa vía `?tab=`
 * (FASE 1: solo `ficha` tiene contenido).
 */
export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string; projectId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { tenant: tenantSlug, projectId } = await params;
  const sp = await searchParams;
  const tab = parseProjectTab(firstString(sp.tab));

  const tenantRecord = await db.orm.public.Tenant.where({
    slug: tenantSlug,
    active: true,
  }).first();
  if (!tenantRecord) {
    notFound();
  }

  const tenantDb = createTenantDb(tenantRecord.id);
  const project = await tenantDb.projects.get(projectId);
  if (!project) {
    notFound();
  }

  const activeLabel =
    PROJECT_TABS.find((entry) => entry.value === tab)?.label ?? "";

  // El presupuesto (Tab 2) se asegura/crea solo cuando se visita esa pestaña.
  const budget =
    tab === "presupuesto"
      ? await getOrCreateProjectBudgetAction(tenantSlug, projectId)
      : null;
  const plan = tab === "planificador" ? await tenantDb.lean.getOrCreatePlan(projectId) : null;
  const fieldLog = tab === "bitacora" || tab === "campo"
    ? await tenantDb.fieldLog.getOrCreateLog(projectId)
    : null;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link
          href={`/${tenantSlug}/quotes/projects`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Volver a proyectos
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-medium text-accent-text">
                {project.code}
              </span>
              <ProjectStatusBadge status={project.status} />
            </div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {project.name}
            </h1>
            {project.description ? (
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                {project.description}
              </p>
            ) : null}
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <User aria-hidden="true" className="h-3.5 w-3.5" />
                {project.customerName}
              </span>
              <span className="inline-flex items-center gap-1">
                <CalendarDays aria-hidden="true" className="h-3.5 w-3.5" />
                Creado el {formatDate(project.createdAt)}
              </span>
            </div>
          </div>
        </div>
      </header>

      <ProjectTabs activeTab={tab}>
        {tab === "ficha" ? (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <ProjectHeaderForm
                tenantSlug={tenantSlug}
                projectId={project.id}
                header={project.header}
              />
            </div>
            <aside className="space-y-4">
              <div className="rounded-lg border border-border bg-card p-5">
                <h2 className="text-sm font-semibold text-foreground">
                  Resumen del proyecto
                </h2>
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Código</dt>
                    <dd className="font-mono text-xs font-medium text-foreground">
                      {project.code}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Cliente</dt>
                    <dd className="truncate font-medium text-foreground">
                      {project.customerName}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-muted-foreground">Estado</dt>
                    <dd>
                      <ProjectStatusBadge status={project.status} />
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Actualizado</dt>
                    <dd className="text-foreground">
                      {formatDate(project.updatedAt)}
                    </dd>
                  </div>
                </dl>
              </div>
              <div className="rounded-lg border border-dashed border-border bg-card p-5 text-xs text-muted-foreground">
                El maestro del cliente vive en el{" "}
                <Link
                  href={`/${tenantSlug}/crm`}
                  className="font-medium text-accent-text hover:underline"
                >
                  CRM
                </Link>
                . Esta ficha guarda el snapshot que aplica a esta obra.
              </div>
            </aside>
          </div>
        ) : tab === "presupuesto" ? (
          budget ? (
            <BudgetWorkspace
              tenantSlug={tenantSlug}
              projectId={project.id}
              budget={budget}
            />
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center">
              <p className="text-sm font-medium text-foreground">
                No se pudo cargar el presupuesto
              </p>
              <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
                Verifica tus permisos sobre este negocio o vuelve a intentarlo.
              </p>
            </div>
          )
        ) : tab === "planificador" ? (
          plan ? (
            <LeanWorkspace _tenantSlug={tenantSlug} _projectId={project.id} plan={plan} />
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center">
              <p className="text-sm font-medium text-foreground">No se pudo cargar el plan operativo</p>
            </div>
          )
        ) : tab === "bitacora" || tab === "campo" ? (
          fieldLog ? (
            <FieldLogWorkspace tenantSlug={tenantSlug} projectId={project.id} log={fieldLog} />
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center">
              <p className="text-sm font-medium text-foreground">No se pudo cargar la bitácora</p>
            </div>
          )
        ) : (
          <TabPlaceholder label={activeLabel} />
        )}
      </ProjectTabs>
    </div>
  );
}