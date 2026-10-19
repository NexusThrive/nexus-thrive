import { db } from "@/prisma/db";
import { computePresence } from "./presence";
import { analyzeWebsite } from "./website";
import { countCatalogItems, latestPresenceRequest } from "./load";

/**
 * Escaneo de presencia de un negocio: verifica su sitio (el publicado por
 * NEXUS o el del negocio), calcula el puntaje y guarda un `PresenceScan`.
 * Lo comparten la acción del negocio y el reanálisis del Operations Center.
 * Devuelve el puntaje, o `null` si el negocio no existe.
 */
export async function scanTenantPresence(tenantId: string): Promise<number | null> {
  const tenant = await db.orm.public.Tenant.where({ id: tenantId }).first();
  if (!tenant) return null;

  const request = await latestPresenceRequest(tenantId);
  const publishedUrl = request?.status === "PUBLISHED" ? request.publishedUrl ?? null : null;
  const siteUrl = publishedUrl ?? tenant.websiteUrl ?? null;

  const [website, catalogItems] = await Promise.all([
    siteUrl ? analyzeWebsite(siteUrl) : Promise.resolve(null),
    countCatalogItems(tenantId),
  ]);

  const result = computePresence({
    name: tenant.name,
    address: tenant.address,
    whatsappNumber: tenant.whatsappNumber,
    latitude: tenant.latitude,
    longitude: tenant.longitude,
    googleBusinessUrl: tenant.googleBusinessUrl,
    instagramHandle: tenant.instagramHandle,
    catalogItems,
    websiteUrl: siteUrl,
    website,
  });

  await db.orm.public.PresenceScan.create({
    tenantId,
    score: result.score,
    state: result.state,
    source: "MANUAL",
    breakdown: result.checks as never,
    website: (website ?? null) as never,
  });

  return result.score;
}
