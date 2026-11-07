/**
 * Operaciones de escritura de los pedidos de la tienda en línea para API, MCP y automatizaciones (HU-operaciones-01).
 * Usan las mismas funciones que la pantalla (`cancelOrder`); los estados válidos salen de `ORDER_TRANSITIONS`.
 */
import { z } from "zod";
import { defineOperation, OperationError, type OperationDefinition } from "@/lib/core/operations/types";
import { advanceOrder } from "./fulfillment-db";
import { FULFILLMENT_STATES } from "./fulfillment";
import { cancelOrder } from "./store-db";

export const storeOperations: OperationDefinition[] = [
  defineOperation({
    id: "orders.update_status",
    rest: { method: "POST", path: "/orders/{orderId}/status" },
    title: "Cambiar el estado de un pedido de la tienda",
    description:
      "Cambia el cumplimiento de un pedido de la tienda: RECEIVED → CONFIRMED → IN_PRODUCTION → READY → SHIPPED → DELIVERED (o CANCELED). Una transición inválida se rechaza y cada cambio queda en el historial. Cancelar un pedido ya pagado no devuelve el dinero: eso se hace desde Cobros en línea.",
    module: "website",
    permission: "money.handle",
    risk: "write",
    idempotent: true,
    emits: ["order.status_changed.v1", "order.canceled.v1"],
    input: z.object({ orderId: z.string().uuid(), status: z.enum(FULFILLMENT_STATES.filter((s) => s !== "RECEIVED") as [string, ...string[]]), note: z.string().trim().max(200).optional() }),
    output: z.object({ id: z.string(), status: z.string() }),
    handler: async (ctx, input) => {
      // Cancelar también cancela el pago pendiente y anula sus obligaciones (misma función que la pantalla); lo demás solo mueve el cumplimiento.
      if (input.status === "CANCELED") {
        const result = await cancelOrder(ctx.tenantId, input.orderId);
        if (!result.ok) throw new OperationError(/No se encontró/.test(result.message) ? "not_found" : "rule_violation", result.message, /No se encontró/.test(result.message) ? 404 : 422);
        return { id: input.orderId, status: "CANCELED" };
      }
      const moved = await advanceOrder(ctx.tenantId, input.orderId, input.status, `${ctx.actor.type.toLowerCase()}:${ctx.actor.id}`, input.note);
      if (!moved.ok) throw new OperationError(/No se encontró/.test(moved.message) ? "not_found" : "rule_violation", moved.message, /No se encontró/.test(moved.message) ? 404 : 422);
      return { id: input.orderId, status: moved.to };
    },
  }),
];
