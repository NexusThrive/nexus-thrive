import { z } from "zod";
import { can } from "@/lib/business/permissions";
import { defineOperation, OperationError, type OperationDefinition } from "../types";

export const businessOperations: OperationDefinition[] = [
  defineOperation({
    id: "business.get_summary",
    title: "Resumen del negocio",
    description: "Nombre, rubro y módulos activos del negocio; si la persona puede ver dinero, también los totales de los últimos 7 días.",
    module: null,
    permission: null,
    risk: "read",
    input: z.object({}),
    output: z.object({
      name: z.string(),
      slug: z.string(),
      vertical: z.string(),
      modules: z.array(z.string()),
      last7Days: z.object({ income: z.number(), expenses: z.number(), balance: z.number(), count: z.number() }).optional(),
    }),
    handler: async (ctx) => {
      const [{ tenantWithModules }, { createTenantDb }] = await Promise.all([import("@/lib/tenant/membership"), import("@/lib/tenant/db")]);
      const tenant = await tenantWithModules(ctx.tenantId);
      if (!tenant) throw new OperationError("internal", "No se encontró el negocio.", 500);
      const summary = {
        name: tenant.name,
        slug: tenant.slug,
        vertical: String(tenant.vertical),
        modules: tenant.modules.filter((m) => m.active).map((m) => String(m.moduleName)),
      };
      // El dinero solo lo ve quien puede manejarlo: el permiso decide qué campos salen.
      if (!can(ctx.role, "money.handle") || !ctx.activeModules.includes("finance")) return summary;
      const series = await createTenantDb(ctx.tenantId).finance.getSeries(7);
      return { ...summary, last7Days: series.current };
    },
  }),
];
