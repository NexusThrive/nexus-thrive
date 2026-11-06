/**
 * Operaciones de escritura de los pedidos de la tienda en línea para API, MCP y automatizaciones (HU-operaciones-01).
 * Usan las mismas funciones que la pantalla (`cancelOrder`); los estados válidos salen de `ORDER_TRANSITIONS`.
 */
import { z } from "zod";
import { defineOperation, OperationError, type OperationDefinition } from "@/lib/core/operations/types";
import { cancelOrder } from "./store-db";

export const storeOperations: OperationDefinition[] = [
  defineOperation({
    id: "orders.update_status",
    rest: { method: "POST", path: "/orders/{orderId}/status" },
    title: "Cambiar el estado de un pedido de la tienda",
    description:
      "Cambia el estado de un pedido de la tienda en línea. Por ahora solo permite `CANCELED` para un pedido que aún no se pagó; un pedido pagado se devuelve desde Cobros en línea.",
    module: "website",
    permission: "money.handle",
    risk: "write",
    idempotent: true,
    emits: ["order.canceled.v1"],
    input: z.object({ orderId: z.string().uuid(), status: z.enum(["CANCELED"]) }),
    output: z.object({ id: z.string(), status: z.enum(["CANCELED"]) }),
    handler: async (ctx, input) => {
      const result = await cancelOrder(ctx.tenantId, input.orderId);
      if (!result.ok) throw new OperationError(/No se encontró/.test(result.message) ? "not_found" : "rule_violation", result.message, /No se encontró/.test(result.message) ? 404 : 422);
      return { id: input.orderId, status: "CANCELED" as const };
    },
  }),
];
