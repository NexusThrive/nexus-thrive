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
  defineOperation({
    id: "products.find_by_barcode",
    rest: { method: "GET", path: "/products/barcode/{code}" },
    title: "Buscar por código de barras",
    description: "Encuentra el producto (y la variante) de un código de barras con su precio de venta. Con `priceListId` usa esa lista de precios; si no, la predeterminada.",
    module: "inventory",
    permission: null,
    risk: "read",
    input: z.object({ code: z.string().trim().min(3).max(48), priceListId: z.string().max(80).optional() }),
    output: z.object({
      product: z.object({ id: z.string(), name: z.string(), sku: z.string().nullable(), kind: z.string(), category: z.string().nullable(), active: z.boolean(), trackStock: z.boolean(), stock: z.number().nullable() }),
      variant: z.object({ id: z.string(), name: z.string(), sku: z.string().nullable(), attributes: z.record(z.string(), z.string()) }).nullable(),
      price: z.number(),
      priceSource: z.enum(["list_variant", "list_product", "variant", "product"]),
    }),
    handler: async (ctx, input) => {
      const { findByBarcode } = await import("@/lib/catalog/catalog-db");
      const hit = await findByBarcode(ctx.tenantId, input.code, input.priceListId);
      if (!hit) throw new OperationError("invalid_input", "No hay un producto con ese código.", 404);
      return hit;
    },
  }),
  defineOperation({
    id: "inventory.kardex",
    rest: { method: "GET", path: "/products/{productId}/kardex" },
    title: "Kardex de un producto",
    description: "Movimientos de inventario de un producto, del más reciente al más antiguo, con costo unitario, valor y saldo después de cada movimiento.",
    module: "inventory",
    permission: "money.handle",
    risk: "read",
    input: z.object({ productId: z.string().min(1).max(80), warehouseId: z.string().max(80).optional(), limit: z.number().int().min(1).max(200).default(50) }),
    output: z.object({
      lines: z.array(z.object({ id: z.string(), date: z.string(), kind: z.string(), quantity: z.number(), unitCost: z.number().nullable(), value: z.number().nullable(), balance: z.number().nullable(), warehouseId: z.string().nullable(), note: z.string().nullable(), documentType: z.string().nullable(), documentId: z.string().nullable() })),
      byWarehouse: z.array(z.object({ warehouse: z.string(), quantity: z.number(), avgCost: z.number(), value: z.number() })),
    }),
    handler: async (ctx, input) => {
      const { getProduct } = await import("@/lib/business/products-db");
      if (!(await getProduct(ctx.tenantId, input.productId))) throw new OperationError("invalid_input", "El producto no existe en este negocio.", 404);
      const { kardex, stockByWarehouse } = await import("@/lib/inventory/kardex");
      const [lines, levels] = await Promise.all([kardex(ctx.tenantId, input.productId, { warehouseId: input.warehouseId, limit: input.limit }), stockByWarehouse(ctx.tenantId, input.productId)]);
      return { lines, byWarehouse: levels.map((l) => ({ warehouse: l.warehouse, quantity: l.quantity, avgCost: l.avgCost, value: l.value })) };
    },
  }),
  defineOperation({
    id: "inventory.list_warehouses",
    rest: { method: "GET", path: "/warehouses" },
    title: "Bodegas",
    description: "Bodegas activas del negocio y cuál es la principal.",
    module: "inventory",
    permission: null,
    risk: "read",
    input: z.object({}),
    output: z.object({ items: z.array(z.object({ id: z.string(), name: z.string(), code: z.string().nullable(), isDefault: z.boolean() })) }),
    handler: async (ctx) => {
      const { listWarehouses } = await import("@/lib/inventory/kardex");
      return { items: await listWarehouses(ctx.tenantId) };
    },
  }),
  defineOperation({
    id: "inventory.reorder_suggestions",
    rest: { method: "GET", path: "/inventory/reorder" },
    title: "Qué conviene reponer",
    description: "Productos con inventario que llegaron a su punto de reposición, con lo que ya está pedido a proveedores y cuánto conviene pedir para llegar al máximo.",
    module: "inventory",
    permission: "business.manage",
    risk: "read",
    input: z.object({ onlyNeeded: z.boolean().default(true) }),
    output: z.object({ items: z.array(z.object({ productId: z.string(), name: z.string(), stock: z.number(), minStock: z.number(), maxStock: z.number().nullable(), reorderPoint: z.number().nullable(), onOrder: z.number(), suggested: z.number() })) }),
    handler: async (ctx, input) => {
      const { reorderOverview } = await import("@/lib/inventory/stock-docs-db");
      const rows = await reorderOverview(ctx.tenantId);
      return { items: rows.filter((r) => !input.onlyNeeded || r.needsOrder).map(({ needsOrder: _n, ...r }) => r) };
    },
  }),
];
