import { db } from "@/prisma/db";
import { computePresence, type PresenceResult, type WebsiteSignal } from "./presence";
import { toIso } from "./dates";

/**
 * Carga del estado de Presence Thrive de un negocio. Lo usan el tablero
 * (server component) y la acción de análisis: leen el último `PresenceScan`,
 * la solicitud de sitio publicada y el catálogo, y devuelven el puntaje junto
 * con los datos que la UI necesita para pintar los canales.
 */

export type PresenceTenant = {
  id: string;
  name: string;
  address?: string | null;
  whatsappNumber?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  googleBusinessUrl?: string | null;
  instagramHandle?: string | null;
  websiteUrl?: string | null;
};

export type PresenceSnapshot = PresenceResult & {
  /** Señales del sitio del último escaneo (null si no se ha escaneado). */
  website: WebsiteSignal | null;
  /** URL del sitio que se verifica: la publicada por NEXUS o la del negocio. */
  siteUrl: string | null;
  /** URL publicada por NEXUS (alimenta la vista previa). */
  publishedUrl: string | null;
  /** Estado de la última solicitud de sitio: PENDING | DESIGN | REVIEW | PUBLISHED | CANCELLED. */
  requestStatus: string | null;
  /** Fecha ISO del último escaneo (null si nunca se analizó). */
  scannedAt: string | null;
  catalogItems: number;
  /** Canales declarados, para pintar los tiles sin otra consulta. */
  instagramHandle: string | null;
  googleBusinessUrl: string | null;
  whatsappNumber: string | null;
};

function asWebsiteSignal(value: unknown): WebsiteSignal | null {
  if (!value || typeof value !== "object") return null;
  const signal = value as Partial<WebsiteSignal>;
  if (typeof signal.url !== "string") return null;
  return {
    url: signal.url,
    reachable: Boolean(signal.reachable),
    https: Boolean(signal.https),
    statusCode: typeof signal.statusCode === "number" ? signal.statusCode : null,
    title: typeof signal.title === "string" ? signal.title : null,
    description: typeof signal.description === "string" ? signal.description : null,
    viewport: Boolean(signal.viewport),
  };
}

export async function countCatalogItems(tenantId: string): Promise<number> {
  const row = await db.orm.public.Product.where({ tenantId, active: true }).aggregate((aggregate) => ({
    total: aggregate.count(),
  }));
  return Number(row?.total ?? 0);
}

/** Última solicitud de sitio del negocio (la más reciente por fecha). */
export async function latestPresenceRequest(tenantId: string) {
  return db.orm.public.PresenceRequest.where({ tenantId })
    .orderBy((request) => request.createdAt.desc())
    .first();
}

/** Último escaneo de presencia del negocio. */
export async function latestPresenceScan(tenantId: string) {
  return db.orm.public.PresenceScan.where({ tenantId })
    .orderBy((scan) => scan.createdAt.desc())
    .first();
}

/**
 * Resuelve el puntaje y los datos de canales para el tablero, sin salir a la
 * red: usa el último escaneo guardado. Si no hay escaneo, el sitio queda sin
 * verificar (no suma) y la UI invita a analizar.
 */
export async function loadPresence(tenant: PresenceTenant): Promise<PresenceSnapshot> {
  const [scan, request, catalogItems] = await Promise.all([
    latestPresenceScan(tenant.id),
    latestPresenceRequest(tenant.id),
    countCatalogItems(tenant.id),
  ]);

  const publishedUrl = request?.status === "PUBLISHED" ? request.publishedUrl ?? null : null;
  const siteUrl = publishedUrl ?? tenant.websiteUrl ?? null;
  const website = siteUrl ? asWebsiteSignal(scan?.website) : null;

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

  return {
    ...result,
    website,
    siteUrl,
    publishedUrl,
    requestStatus: request?.status ?? null,
    scannedAt: toIso(scan?.createdAt),
    catalogItems,
    instagramHandle: tenant.instagramHandle ?? null,
    googleBusinessUrl: tenant.googleBusinessUrl ?? null,
    whatsappNumber: tenant.whatsappNumber ?? null,
  };
}
