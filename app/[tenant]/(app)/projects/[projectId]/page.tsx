import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { ArrowLeft, CalendarDays, User } from "lucide-react";
import { createTenantDb } from "@/lib/tenant/db";
import { PROJECT_TABS, parseProjectTab } from "@/lib/construction/project-domain";
import { ProjectStatusBadge } from "../_components/project-status-badge";
import ProjectTabs from "./_components/project-tabs";
import ProjectHeaderForm from "./_components/project-header-form";
import ProjectLifecycle from "./_components/project-lifecycle";
import BudgetWorkspace from "./_components/budget-workspace";
import LeanWorkspace from "./_components/lean-workspace";
import FieldLogWorkspace from "./_components/field-log-workspace";
import { ReportsWorkspace } from "./_components/reports-workspace";
import { prepareProjectAction } from "../actions";
import PrepareProject from "./_components/prepare-project";
import ProjectQuotesWorkspace from "./_components/project-quotes-workspace";
import { EmptyState } from "@/components/molecules/empty-state";
import { requirePageContext } from "@/lib/tenant/context";

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
    <EmptyState
      className="rounded-lg border border-border bg-card"
      title={label}
      description="Esta sección llega en una próxima fase del vertical de construcción. FASE 1 entrega el contenedor y la ficha del proyecto (tab “Ficha y cliente”)."
    />
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

  // Sesión + negocio activo + membresía activa (SEC-03): no basta el layout.
  const pageCtx = await requirePageContext(tenantSlug);
  const tenantRecord = pageCtx.tenant;

  const tenantDb = createTenantDb(tenantRecord.id);
  const project = await tenantDb.projects.get(projectId);
  if (!project) {
    notFound();
  }

  const activeLabel =
    PROJECT_TABS.find((entry) => entry.value === tab)?.label ?? "";

  // Solo lectura: los contenedores nacen con la obra (ensureProjectContainers).
  // Si una obra antigua no los tiene, la pestaña ofrece "Preparar obra".
  const budget =
    tab === "presupuesto" || tab === "cotizaciones" ? await tenantDb.budgets.get(projectId) : null;
  const [quotes, followUps] =
    tab === "cotizaciones"
      ? await Promise.all([
          tenantDb.projectQuotes.list(projectId),
          tenantDb.projectQuotes.listFollowUps(projectId),
        ])
      : [[], []];
  const baselines = await tenantDb.budgets.listBaselines(projectId);
  const hasApprovedBaseline = baselines.length > 0;
  const plan = tab === "planificador" ? await tenantDb.lean.getPlan(projectId) : null;
  // Partidas del presupuesto: para enlazar tareas/compromisos/bitácora y para
  // registrar el avance de obra.
  const itemProgress =
    tab === "planificador" || tab === "bitacora" || tab === "campo"
      ? await tenantDb.progress.listByItem(projectId)
      : [];
  const budgetItemOptions = itemProgress.map((item) => ({
    id: item.itemId,
    label: `${item.code} · ${item.description}`,
  }));
  const fieldLog = tab === "bitacora" || tab === "campo"
    ? await tenantDb.fieldLog.getLog(projectId)
    : null;
  const prepareAction = prepareProjectAction.bind(null, tenantSlug, projectId);

  // Autor de la bitácora y rol D7: del usuario en sesión (todas las pestañas).
  const { userId } = await auth();
  const member = userId ? await tenantDb.users.findByClerkUserId(userId) : null;
  const currentUserRole = member?.role ?? "STAFF";
  const canGovernBudget =
    currentUserRole === "OWNER" || currentUserRole === "SUPERADMIN";
  const canChangeStatus = canGovernBudget;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link
          href={`/${tenantSlug}/projects`}
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
            <h1 className="mt-1 font-display text-[clamp(24px,4.4vw,34px)] font-bold leading-[1.12] tracking-[-0.02em] text-foreground">
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
            <div className="mt-3">
              <ProjectLifecycle
                tenantSlug={tenantSlug}
                projectId={project.id}
                name={project.name}
                description={project.description ?? ""}
                status={project.status}
                canChangeStatus={canChangeStatus}
                hasApprovedBaseline={hasApprovedBaseline}
              />
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
              baselines={baselines}
              canGovern={canGovernBudget}
            />
          ) : (
            <PrepareProject action={prepareAction} />
          )
        ) : tab === "cotizaciones" ? (
          <ProjectQuotesWorkspace
            tenantSlug={tenantSlug}
            projectId={project.id}
            projectStatus={project.status}
            quotes={quotes}
            followUps={followUps}
            budgetRevision={budget?.revision ?? null}
            budgetGrandTotal={budget?.grandTotal ?? null}
            budgetHasItems={Boolean(budget?.chapters.some((chapter) => chapter.items.length > 0))}
            canGovern={canGovernBudget}
          />
        ) : tab === "planificador" ? (
          plan ? (
            <LeanWorkspace tenantSlug={tenantSlug} projectId={project.id} plan={plan} budgetItems={budgetItemOptions} />
          ) : (
            <PrepareProject action={prepareAction} />
          )
        ) : tab === "bitacora" || tab === "campo" ? (
          fieldLog ? (
            <FieldLogWorkspace
              tenantSlug={tenantSlug}
              projectId={project.id}
              log={fieldLog}
              itemProgress={itemProgress}
              contracted={project.status === "APPROVED" || project.status === "IN_EXECUTION"}
            />
          ) : (
            <PrepareProject action={prepareAction} />
          )
        ) : tab === "informes" ? (
          <ReportsWorkspace />
        ) : (
          <TabPlaceholder label={activeLabel} />
        )}
      </ProjectTabs>
    </div>
  );
}