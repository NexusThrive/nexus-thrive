"use server";

import { listProducts } from "@/lib/business/products-db";
import { requireTenantContext } from "@/lib/tenant/context";

export type SearchHit = {
  id: string;
  kind: "customer" | "product";
  title: string;
  subtitle: string;
  /** Ruta relativa al negocio (sin el slug). */
  href: string;
};

export type SearchResult = { ok: true; hits: SearchHit[] } | { ok: false };

const MIN_CHARS = 2;
const PER_KIND = 5;

/**
 * Búsqueda de la paleta de comandos. Cada fuente se consulta solo si el
 * negocio tiene activo su módulo (`requireTenantContext` con la ruta) y
 * siempre filtrada por `tenantId`: nunca devuelve datos de otro negocio.
 * Máximo `PER_KIND` resultados por tipo; la consulta la limita la base.
 */
export async function searchEntitiesAction(tenantSlug: string, query: string): Promise<SearchResult> {
  const q = query.trim().slice(0, 80);
  if (q.length < MIN_CHARS) return { ok: true, hits: [] };

  const [crm, inventory] = await Promise.all([
    requireTenantContext(tenantSlug, "/crm"),
    requireTenantContext(tenantSlug, "/inventory"),
  ]);
  if (!crm && !inventory) return { ok: false };

  try {
    const [customers, products] = await Promise.all([
      crm ? crm.tenantDb.customers.search({ q, pageSize: PER_KIND }) : null,
      inventory ? listProducts(inventory.tenantId, { q, activeOnly: true, limit: PER_KIND }) : [],
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
    ];
    return { ok: true, hits };
  } catch {
    return { ok: false };
  }
}
