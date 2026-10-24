import { z } from "zod";
import { defineOperation, OperationError, type OperationDefinition } from "../types";

const status = z.enum(["DRAFT", "ORDERED", "PARTIAL", "RECEIVED", "CANCELED"]);
const orderSummary = z.object({ id: z.string(), code: z.string(), status, supplierName: z.string(), total: z.number(), expectedDate: z.string().nullable(), createdAt: z.string(), lineCount: z.number(), pendingUnits: z.number() });

export const purchaseOperations: OperationDefinition[] = [
  defineOperation({
    id: "purchases.list_orders",
    rest: { method: "GET", path: "/purchases/orders" },
    title: "Órdenes de compra",
    description: "Órdenes de compra a proveedores, de la más reciente a la más antigua, con lo que falta por recibir. Se puede filtrar por estado.",
    module: "purchases",
    permission: "business.manage",
    risk: "read",
    input: z.object({ status: status.optional(), limit: z.number().int().min(1).max(100).default(50) }),
    output: z.object({ items: z.array(orderSummary) }),
    handler: async (ctx, input) => {
      const { listOrders } = await import("@/lib/purchasing/purchases-db");
      const rows = await listOrders(ctx.tenantId, { status: input.status, limit: input.limit });
      return { items: rows.map(({ id, code, status: st, supplierName, total, expectedDate, createdAt, lineCount, pendingUnits }) => ({ id, code, status: st, supplierName, total, expectedDate, createdAt, lineCount, pendingUnits })) };
    },
  }),
  defineOperation({
    id: "purchases.get_order",
    rest: { method: "GET", path: "/purchases/orders/{orderId}" },
    title: "Detalle de una orden de compra",
    description: "Líneas de una orden de compra (producto, cantidad pedida y recibida, costo) y las facturas del proveedor registradas.",
    module: "purchases",
    permission: "business.manage",
    risk: "read",
    input: z.object({ orderId: z.string().min(1).max(80) }),
    output: orderSummary.extend({
      note: z.string().nullable(),
      subtotal: z.number(),
      taxTotal: z.number(),
      warehouseName: z.string(),
      lines: z.array(z.object({ id: z.string(), productId: z.string(), productName: z.string(), quantity: z.number(), receivedQuantity: z.number(), unitCost: z.number(), taxRatePct: z.number() })),
      invoices: z.array(z.object({ id: z.string(), number: z.string(), issueDate: z.string(), dueDate: z.string().nullable(), total: z.number(), status: z.string() })),
    }),
    handler: async (ctx, input) => {
      const { getOrder } = await import("@/lib/purchasing/purchases-db");
      const order = await getOrder(ctx.tenantId, input.orderId);
      if (!order) throw new OperationError("invalid_input", "La orden no existe en este negocio.", 404);
      return order;
    },
  }),
];
