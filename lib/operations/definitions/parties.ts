import { z } from "zod";
import { defineOperation, type OperationDefinition } from "../types";

export const partyOperations: OperationDefinition[] = [
  defineOperation({
    id: "parties.search",
    rest: { method: "GET", path: "/parties" },
    title: "Buscar terceros",
    description: "Busca personas y empresas del negocio (clientes, proveedores…) por nombre, documento o correo. Se puede filtrar por rol.",
    module: null,
    permission: "business.manage",
    risk: "read",
    input: z.object({
      q: z.string().max(80).optional(),
      role: z.enum(["CUSTOMER", "SUPPLIER", "EMPLOYEE", "CONTACT"]).optional(),
      limit: z.number().int().min(1).max(50).default(20),
    }),
    output: z.object({
      items: z.array(z.object({ id: z.string(), legalName: z.string(), kind: z.string(), documentType: z.string().nullable(), documentNumber: z.string().nullable(), email: z.string().nullable(), phone: z.string().nullable(), roles: z.array(z.string()) })),
    }),
    handler: async (ctx, input) => {
      const { listParties } = await import("@/lib/parties/parties-db");
      return { items: await listParties(ctx.tenantId, input) };
    },
  }),
];
