"use server";

import { listProducts } from "@/lib/business/catalog/products-db";
import { searchOpportunities } from "@/lib/business/growth/pipeline-read";
import { formatCurrency } from "@/lib/foundation/format";
import { requireTenantContext } from "@/lib/core/tenancy/context";

export type SearchHit = {
  id: string;
  kind: "customer" | "product" | "payment" | "expense" | "opportunity";
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

  const [crm, inventory, finance, pipeline] = await Promise.all([
    requireTenantContext(tenantSlug, "/contactos"),
    requireTenantContext(tenantSlug, "/inventario/productos"),
    requireTenantContext(tenantSlug, "/finanzas"),
    requireTenantContext(tenantSlug, "/crm"),
  ]);
  if (!crm && !inventory && !finance && !pipeline) return { ok: false };

  try {
    const [customers, products, payments, expenses, opportunities] = await Promise.all([
      crm ? crm.tenantDb.customers.search({ q, pageSize: PER_KIND }) : null,
      inventory ? listProducts(inventory.tenantId, { q, activeOnly: true, limit: PER_KIND }) : [],
      // Pagos por concepto o referencia; gastos por descripción o proveedor (los anulados no se ofrecen).
      finance ? finance.tenantDb.finance.listPayments({ q, status: "APPROVED", limit: PER_KIND }) : null,
      finance ? finance.tenantDb.finance.listExpenses({ q, limit: PER_KIND }) : null,
      // Oportunidades por nombre o por cliente (CRM).
      pipeline ? searchOpportunities(pipeline.tenantId, q) : [],
    ]);
    const hits: SearchHit[] = [
      ...opportunities.map((o) => ({ id: o.id, kind: "opportunity" as const, title: o.title, subtitle: o.subtitle || "Oportunidad", href: `/crm/oportunidades/${o.id}` })),
      ...(customers?.rows ?? []).map((c) => ({
        id: c.id,
        kind: "customer" as const,
        title: c.name,
        subtitle: c.email || c.phone || "Cliente",
        href: `/contactos/${c.id}`,
      })),
      ...products.map((p) => ({
        id: p.id,
        kind: "product" as const,
        title: p.name,
        subtitle: p.sku ? `${p.sku}` : "Catálogo",
        href: `/inventario/productos`,
      })),
      ...(payments?.rows ?? []).map((p) => ({
        id: p.id,
        kind: "payment" as const,
        title: `${formatCurrency(p.amount)} · ${p.customerName ?? "Venta de mostrador"}`,
        subtitle: p.description?.trim() || p.providerRefId || "Cobro registrado",
        href: `/finanzas`,
      })),
      ...(expenses?.rows ?? [])
        .filter((e) => !e.voided)
        .map((e) => ({
          id: e.id,
          kind: "expense" as const,
          title: e.description,
          subtitle: `${e.category} · ${formatCurrency(e.amount)}`,
          href: `/finanzas`,
        })),
    ];
    return { ok: true, hits };
  } catch {
    return { ok: false };
  }
}
