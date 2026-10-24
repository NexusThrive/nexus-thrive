import { z } from "zod";
import { defineOperation, type OperationDefinition } from "../types";

const customerSummary = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  city: z.string().nullable(),
});

/** Clientes del negocio. Datos personales: solo lo mínimo para reconocer a la persona. */
export const customerOperations: OperationDefinition[] = [
  defineOperation({
    id: "customers.search",
    title: "Buscar clientes",
    description: "Busca clientes activos por nombre, correo, teléfono, documento o ciudad. Devuelve lo mínimo para reconocerlos.",
    module: "crm",
    permission: null,
    risk: "read",
    input: z.object({
      q: z.string().trim().min(2, "Escribe al menos 2 letras.").max(80),
      limit: z.number().int().min(1).max(25).default(10),
    }),
    output: z.object({ total: z.number(), items: z.array(customerSummary) }),
    handler: async (ctx, input) => {
      const { createTenantDb } = await import("@/lib/tenant/db");
      const { rows, total } = await createTenantDb(ctx.tenantId).customers.search({ q: input.q, pageSize: input.limit });
      return {
        total,
        items: rows.map((c) => ({ id: c.id, name: c.name, email: c.email ?? null, phone: c.phone ?? null, city: c.city ?? null })),
      };
    },
  }),
];
