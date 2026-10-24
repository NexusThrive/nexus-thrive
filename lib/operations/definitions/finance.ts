import { z } from "zod";
import { defineOperation, type OperationDefinition } from "../types";

const totals = z.object({ income: z.number(), expenses: z.number(), balance: z.number(), count: z.number() });

export const financeOperations: OperationDefinition[] = [
  defineOperation({
    id: "finance.get_summary",
    rest: { method: "GET", path: "/finance/summary" },
    title: "Resumen de ingresos y gastos",
    description: "Ingresos, gastos y balance de hoy, de los últimos 7 o de los últimos 30 días, con el periodo anterior para comparar.",
    module: "finance",
    permission: "money.handle",
    risk: "read",
    input: z.object({ days: z.union([z.literal(1), z.literal(7), z.literal(30)]).default(7) }),
    output: z.object({ days: z.number(), current: totals, previous: totals }),
    handler: async (ctx, input) => {
      const { createTenantDb } = await import("@/lib/tenant/db");
      const series = await createTenantDb(ctx.tenantId).finance.getSeries(input.days);
      return { days: input.days, current: series.current, previous: series.previous };
    },
  }),
  defineOperation({
    id: "sales.list_recent",
    rest: { method: "GET", path: "/sales/recent" },
    title: "Movimientos recientes",
    description: "Últimos cobros y gastos del negocio, del más reciente al más antiguo.",
    module: "finance",
    permission: "money.handle",
    risk: "read",
    input: z.object({ limit: z.number().int().min(1).max(20).default(10) }),
    output: z.object({
      items: z.array(z.object({ id: z.string(), type: z.enum(["payment", "expense"]), title: z.string(), description: z.string(), amount: z.number(), date: z.string() })),
    }),
    handler: async (ctx, input) => {
      const { createTenantDb } = await import("@/lib/tenant/db");
      const rows = await createTenantDb(ctx.tenantId).finance.getRecentActivity(input.limit);
      return {
        items: rows.map((r) => ({
          id: r.id,
          type: r.type,
          title: r.title,
          description: r.description,
          amount: Math.abs(Number(r.amount)),
          date: new Date(r.date).toISOString(),
        })),
      };
    },
  }),
];
