import { createBudgetsDb } from "@/lib/construction/budget";
import { createCatalogDb } from "@/lib/construction/catalog";
import { createFieldLogDb } from "@/lib/construction/field-log";
import { createPlanDb } from "@/lib/construction/plan";
import { createProgressDb } from "@/lib/construction/progress";
import { createProjectHeadersDb } from "@/lib/construction/project-headers";
import { createProjectQuotesDb } from "@/lib/construction/project-quotes";
import { createProjectsDb } from "@/lib/construction/projects";
import { createQuotesDb } from "@/lib/construction/quotes";
import { createReportsDb } from "@/lib/construction/reports";

/**
 * Capa de datos del rubro construcción, ligada a un negocio.
 *
 * Antes estas fábricas colgaban de `createTenantDb` (Core), de modo que toda
 * pantalla, fuera cual fuera su rubro, cargaba el código de obra. Ahora las
 * compone quien las necesita (las pantallas y acciones de obra) y Core no
 * conoce este módulo. Las propiedades conservan sus nombres anteriores:
 *
 * - `apu`: banco de insumos y biblioteca de actividades (APU)
 * - `quotes`, `projectQuotes`: cotizaciones heredadas y versionadas
 * - `progress`: avance de obra
 * - `projects`, `projectHeaders`: proyectos y su ficha
 * - `budgets`: presupuestos
 * - `lean`: planificador Lean (Last Planner System)
 * - `fieldLog`: bitácora de campo
 * - `reports`: informes y exportaciones
 */
export function createConstructionDb(tenantId: string) {
  if (!tenantId || tenantId.trim() === "") {
    throw new Error("Se requiere un tenantId válido para inicializar la capa de datos de construcción.");
  }

  return {
    apu: createCatalogDb(tenantId),
    quotes: createQuotesDb(tenantId),
    projectQuotes: createProjectQuotesDb(tenantId),
    progress: createProgressDb(tenantId),
    projects: createProjectsDb(tenantId),
    projectHeaders: createProjectHeadersDb(tenantId),
    budgets: createBudgetsDb(tenantId),
    lean: createPlanDb(tenantId),
    fieldLog: createFieldLogDb(tenantId),
    reports: createReportsDb(tenantId),
  };
}

export type ConstructionDb = ReturnType<typeof createConstructionDb>;
