/**
 * Informes de obra: Informe Cero, semanal y BOM.
 * Extraído de `lib/tenant-db.ts`; `createTenantDb` lo compone. Todo
 * acceso va acotado al `tenantId` recibido.
 */
import {
  db,
} from "@/prisma/db";
import {
  type InformeCeroData,
  type WeeklyReportData,
  type BomResource,
} from "@/lib/report-engine";
import {
  loadBudgetTree,
  loadFieldLog,
  loadLeanPlan,
} from "./shared";

export function createReportsDb(tenantId: string) {
  return {
      /**
       * Obtiene los datos consolidados para el Informe Cero (Línea Base).
       */
      getInformeCeroData: async (projectId: string): Promise<InformeCeroData | null> => {
        const project = await db.orm.public.Project
          .where({ id: projectId, tenantId })
          .first();
        if (!project) {
          return null;
        }

        const budget = await db.orm.public.ProjectBudget
          .where({ projectId, tenantId })
          .first();

        // Cargar árbol completo del presupuesto si existe
        let budgetData = null;
        if (budget) {
          budgetData = await loadBudgetTree(budget);
        }

        const [customer, tenant] = await Promise.all([
          db.orm.public.Customer
            .where({ id: project.customerId, tenantId })
            .select("name")
            .first(),
          db.orm.public.Tenant
            .where({ id: tenantId })
            .select("name", "legalName", "taxId", "address", "city")
            .first(),
        ]);

        // Cargar header del proyecto (no tiene tenantId directo, usa projectId)
        const header = await db.orm.public.ProjectHeader
          .where({ projectId })
          .first();

        const projectData = {
          id: project.id,
          code: project.code,
          name: project.name,
          description: project.description,
          status: project.status,
          createdAt: project.createdAt.toString(),
          updatedAt: project.updatedAt.toString(),
          customerName: customer?.name ?? "",
          header: header ? {
            clientTaxName: header.clientTaxName,
            clientTaxId: header.clientTaxId,
            clientTaxDv: header.clientTaxDv,
            clientAddress: header.clientAddress,
            clientCity: header.clientCity,
            clientBillingEmail: header.clientBillingEmail,
            legalRepName: header.legalRepName,
            siteAddress: header.siteAddress,
            siteCity: header.siteCity,
            siteDepartment: header.siteDepartment,
            projectType: header.projectType,
            siteAccessNotes: header.siteAccessNotes,
            technicalContact: header.technicalContact,
            technicalPhone: header.technicalPhone,
            projectLeaderName: header.projectLeaderName,
            projectLeaderProfessionalId: header.projectLeaderProfessionalId,
            supervisorName: header.supervisorName,
          } : null,
        };

        const { buildInformeCeroData } = await import("@/lib/report-engine");
        return buildInformeCeroData(projectData, budgetData, tenant
          ? {
              name: tenant.legalName?.trim() || tenant.name,
              nit: tenant.taxId ?? null,
              address: tenant.address ?? null,
              city: tenant.city ?? null,
            }
          : null);
      },

      /**
       * Obtiene los datos consolidados para el Informe Semanal.
       */
      getWeeklyReportData: async (
        projectId: string,
        weekNumber: number,
        year: number,
      ): Promise<WeeklyReportData | null> => {
        const project = await db.orm.public.Project
          .where({ id: projectId, tenantId })
          .first();
        if (!project) {
          return null;
        }

        const [budget, plan, fieldLog] = await Promise.all([
          db.orm.public.ProjectBudget.where({ projectId, tenantId }).first(),
          db.orm.public.ProjectPlan.where({ projectId, tenantId }).first(),
          db.orm.public.FieldLog.where({ projectId, tenantId }).first(),
        ]);

        const budgetData = budget ? await loadBudgetTree(budget) : null;

        let planData = null;
        if (plan) {
          planData = await loadLeanPlan(plan);
        }

        let fieldLogData = null;
        if (fieldLog) {
          fieldLogData = await loadFieldLog(fieldLog, tenantId);
        }

        const projectData = {
          id: project.id,
          code: project.code,
          name: project.name,
          description: project.description,
          status: project.status,
          createdAt: project.createdAt.toString(),
          updatedAt: project.updatedAt.toString(),
          customerName: "",
          header: null, // Se cargaría si es necesario
        };

        const { buildWeeklyReportData } = await import("@/lib/report-engine");
        return buildWeeklyReportData(
          projectData,
          budgetData,
          planData,
          fieldLogData,
          weekNumber,
          year,
        );
      },

      /**
       * Obtiene la explosión de materiales (BOM) para exportación CSV.
       */
      getBomExportData: async (projectId: string): Promise<BomResource[]> => {
        const budget = await db.orm.public.ProjectBudget
          .where({ projectId, tenantId })
          .first();
        if (!budget) {
          return [];
        }

        const budgetData = await loadBudgetTree(budget);
        const { buildBomExportData } = await import("@/lib/report-engine");
        return buildBomExportData(budgetData);
      },
  };
}
