import { z } from "zod";
import { defineOperation, OperationError, type OperationDefinition } from "../types";

const productSummary = z.object({
  id: z.string(),
  name: z.string(),
  sku: z.string().nullable(),
  kind: z.string(),
  price: z.number(),
  trackStock: z.boolean(),
  stock: z.number().nullable(),
});

export const inventoryOperations: OperationDefinition[] = [
  defineOperation({
    id: "products.search",
    rest: { method: "GET", path: "/products" },
    title: "Buscar productos",
    description: "Busca productos y servicios activos del catálogo por nombre.",
    module: "inventory",
    permission: null,
    risk: "read",
    input: z.object({ q: z.string().trim().min(2).max(80), limit: z.number().int().min(1).max(25).default(10) }),
    output: z.object({ items: z.array(productSummary) }),
    handler: async (ctx, input) => {
      const { listProducts } = await import("@/lib/business/products-db");
      const rows = await listProducts(ctx.tenantId, { q: input.q, activeOnly: true, limit: input.limit });
      return {
        items: rows.map((p) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          kind: p.kind,
          price: Number(p.price),
          trackStock: p.trackStock,
          stock: p.trackStock ? p.stock : null,
        })),
      };
    },
  }),
  defineOperation({
    id: "inventory.check_stock",
    rest: { method: "GET", path: "/products/{productId}/stock" },
    title: "Consultar existencias",
    description: "Existencias actuales de un producto y si está por debajo del mínimo.",
    module: "inventory",
    permission: null,
    risk: "read",
    input: z.object({ productId: z.string().min(1) }),
    output: z.object({ id: z.string(), name: z.string(), trackStock: z.boolean(), stock: z.number().nullable(), minStock: z.number(), low: z.boolean() }),
    handler: async (ctx, input) => {
      const { getProduct } = await import("@/lib/business/products-db");
      const p = await getProduct(ctx.tenantId, input.productId);
      if (!p) throw new OperationError("invalid_input", "El producto no existe en este negocio.", 404);
      return {
        id: p.id,
        name: p.name,
        trackStock: p.trackStock,
        stock: p.trackStock ? p.stock : null,
        minStock: p.minStock,
        low: p.trackStock && p.stock <= p.minStock,
      };
    },
  }),
];
