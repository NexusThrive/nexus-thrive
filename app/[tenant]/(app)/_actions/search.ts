"use server";

import { listProducts } from "@/lib/business/products-db";
import { formatCurrency } from "@/lib/format";
import { requireTenantContext } from "@/lib/tenant/context";

export type SearchHit = {
  id: string;
  kind: "customer" | "product" | "payment" | "expense";
  title: string;
  subtitle: string;
  /** Ruta relativa al negocio (sin el slug). */
  href: string;
};

export type SearchResult = { ok: true; hits: SearchHit[] } | { ok: false };

const MIN_CHARS = 2;
const PER_KIND = 5;

/**
 * Búsqueda de la paleta de comandos y del buscador de la navbar: clientes,
 * productos, pagos y gastos. Cada fuente se consulta solo si el
 * negocio tiene activo su módulo (`requireTenantContext` con la ruta) y
 * siempre filtrada por `tenantId`: nunca devuelve datos de otro negocio.
 * Máximo `PER_KIND` resultados por tipo; la consulta la limita la base.
 */
export async function searchEntitiesAction(tenantSlug: string, query: string): Promise<SearchResult> {
  const q = query.trim().slice(0, 80);
  if (q.length < MIN_CHARS) return { ok: true, hits: [] };

  const [crm, inventory, finance] = await Promise.all([
    requireTenantContext(tenantSlug, "/crm"),
    requireTenantContext(tenantSlug, "/inventory"),
    requireTenantContext(tenantSlug, "/finance"),
  ]);
  if (!crm && !inventory && !finance) return { ok: false };

  try {
    const [customers, products, payments, expenses] = await Promise.all([
      crm ? crm.tenantDb.customers.search({ q, pageSize: PER_KIND }) : null,
      inventory ? listProducts(inventory.tenantId, { q, activeOnly: true, limit: PER_KIND }) : [],
      // Pagos por concepto o referencia; gastos por descripción o proveedor (los anulados no se ofrecen).
      finance ? finance.tenantDb.finance.listPayments({ q, status: "APPROVED", limit: PER_KIND }) : null,
      finance ? finance.tenantDb.finance.listExpenses({ q, limit: PER_KIND }) : null,
    ]);
    const hits: SearchHit[] = [
      ...(customers?.rows ?? []).map((c) => ({
        id: c.id,
        kind: "customer" as const,
        title: c.name,
        subtitle: c.email || c.phone || "Cliente",
        href: `/crm/${c.id}`,
      })),
      ...products.map((p) => ({
        id: p.id,
        kind: "product" as const,
        title: p.name,
        subtitle: p.sku ? `${p.sku}` : "Catálogo",
        href: `/inventory`,
      })),
      ...(payments?.rows ?? []).map((p) => ({
        id: p.id,
        kind: "payment" as const,
        title: `${formatCurrency(p.amount)} · ${p.customerName ?? "Venta de mostrador"}`,
        subtitle: p.description?.trim() || p.providerRefId || "Pago recibido",
        href: `/finance`,
      })),
      ...(expenses?.rows ?? [])
        .filter((e) => !e.voided)
        .map((e) => ({
          id: e.id,
          kind: "expense" as const,
          title: e.description,
          subtitle: `${e.category} · ${formatCurrency(e.amount)}`,
          href: `/finance`,
        })),
    ];
    return { ok: true, hits };
  } catch {
    return { ok: false };
  }
}
