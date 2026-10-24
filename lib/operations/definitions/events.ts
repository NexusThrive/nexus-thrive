import { z } from "zod";
import { defineOperation, OperationError, type OperationDefinition } from "../types";

export const eventOperations: OperationDefinition[] = [
  defineOperation({
    id: "events.list",
    rest: { method: "GET", path: "/events" },
    title: "Eventos del negocio",
    description:
      "Lista los eventos del negocio (ventas, eventos de proveedores…) en orden, para ponerse al día. Pasa `after` con el id del último evento visto para recibir solo los nuevos; `next` es el cursor para la siguiente consulta.",
    module: null,
    permission: "business.manage",
    risk: "read",
    input: z.object({
      after: z.string().max(80).optional().describe("Id del último evento ya procesado."),
      since: z.string().max(40).optional().describe("Fecha ISO 8601 (solo si no hay `after`)."),
      type: z.string().max(60).optional().describe("Filtra por tipo, p. ej. sale.completed."),
      limit: z.number().int().min(1).max(100).default(50),
    }),
    output: z.object({
      events: z.array(z.object({ id: z.string(), type: z.string(), version: z.number(), createdAt: z.string(), data: z.unknown() })),
      next: z.string().nullable(),
    }),
    handler: async (ctx, input) => {
      const { listEvents } = await import("@/lib/events/feed");
      const feed = await listEvents(ctx.tenantId, input);
      if ("error" in feed) throw new OperationError("invalid_input", feed.error, 422);
      return feed;
    },
  }),
];
