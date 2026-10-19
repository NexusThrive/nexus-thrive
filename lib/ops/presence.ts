import { db } from "@/prisma/db";
import { computePresence, type PresenceCheck, type PresenceState, type WebsiteSignal } from "@/lib/presence/presence";
import { toIso } from "@/lib/presence/dates";

/**
 * Vista del Operations Center: presencia digital de cada negocio. Reúne en
 * pocas consultas el último escaneo, la solicitud de sitio y el catálogo, y
 * recalcula el puntaje con el mismo motor que ve el negocio.
 */

export type PresenceRequestRow = {
  id: string;
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  status: string;
  businessName: string;
  domain: string | null;
  contactName: string;
  contactPhone: string;
  contactEmail: string | null;
  publishedUrl: string | null;
  priceCop: number | null;
  paidAt: string | null;
  services: string[];
  createdAt: string;
};

export type PresenceOverviewRow = {
  id: string;
  name: string;
  slug: string;
  vertical: string;
  score: number;
  state: PresenceState;
  siteUrl: string | null;
  scannedAt: string | null;
  checks: PresenceCheck[];
};

export type PresenceOverview = {
  rows: PresenceOverviewRow[];
  requests: PresenceRequestRow[];
  staff: { manage: boolean };
};

function latestByTenant<T extends { tenantId: string }>(rows: T[]): Map<string, T> {
  const map = new Map<string, T>();
  for (const row of rows) {
    if (!map.has(row.tenantId)) map.set(row.tenantId, row);
  }
  return map;
}

export async function presenceOverview(): Promise<{
  rows: PresenceOverviewRow[];
  requests: PresenceRequestRow[];
}> {
  const [tenants, requests, scans, catalog] = await Promise.all([
    db.orm.public.Tenant.where({})
      .select(
        "id",
        "name",
        "slug",
        "vertical",
        "address",
        "whatsappNumber",
        "latitude",
        "longitude",
        "googleBusinessUrl",
        "instagramHandle",
        "websiteUrl",
      )
      .all(),
    db.orm.public.PresenceRequest.where({})
      .orderBy((request) => request.createdAt.desc())
      .all(),
    db.orm.public.PresenceScan.where({})
      .orderBy((scan) => scan.createdAt.desc())
      .select("tenantId", "score", "state", "website", "createdAt")
      .all(),
    db.orm.public.Product.where({ active: true })
      .groupBy("tenantId")
      .aggregate((aggregate) => ({ total: aggregate.count() })),
  ]);

  const latestRequest = latestByTenant(requests);
  const latestScan = latestByTenant(scans);

  const catalogByTenant = new Map<string, number>();
  for (const row of catalog as unknown as { tenantId: string; total: number }[]) {
    catalogByTenant.set(row.tenantId, Number(row.total ?? 0));
  }

  const rows: PresenceOverviewRow[] = tenants.map((tenant) => {
    const request = latestRequest.get(tenant.id);
    const publishedUrl = request?.status === "PUBLISHED" ? request.publishedUrl ?? null : null;
    const siteUrl = publishedUrl ?? tenant.websiteUrl ?? null;
    const scan = latestScan.get(tenant.id);
    const website = (siteUrl ? (scan?.website as unknown as WebsiteSignal | null) : null) ?? null;

    const result = computePresence({
      name: tenant.name,
      address: tenant.address,
      whatsappNumber: tenant.whatsappNumber,
      latitude: tenant.latitude,
      longitude: tenant.longitude,
      googleBusinessUrl: tenant.googleBusinessUrl,
      instagramHandle: tenant.instagramHandle,
      catalogItems: catalogByTenant.get(tenant.id) ?? 0,
      websiteUrl: siteUrl,
      website: website as WebsiteSignal | null,
    });

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      vertical: tenant.vertical,
      score: result.score,
      state: result.state,
      checks: result.checks,
      siteUrl,
      scannedAt: toIso(scan?.createdAt),
    };
  });

  const tenantById = new Map(tenants.map((t) => [t.id, t]));
  const requestRows: PresenceRequestRow[] = requests.map((request) => {
    const tenant = tenantById.get(request.tenantId);
    return {
      id: request.id,
      tenantId: request.tenantId,
      tenantName: tenant?.name ?? "Negocio",
      tenantSlug: tenant?.slug ?? "",
      status: request.status,
      businessName: request.businessName,
      domain: request.domain ?? null,
      contactName: request.contactName,
      contactPhone: request.contactPhone,
      contactEmail: request.contactEmail ?? null,
      publishedUrl: request.publishedUrl ?? null,
      priceCop: request.priceCop ?? null,
      paidAt: toIso(request.paidAt),
      services: [...(request.services ?? [])],
      createdAt: toIso(request.createdAt) ?? "",
    };
  });

  return { rows, requests: requestRows };
}
