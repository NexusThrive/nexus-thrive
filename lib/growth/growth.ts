import { randomBytes } from "node:crypto";

/**
 * Atribución y reputación (reglas puras): enlaces con UTM, origen de un cliente y reporte de inversión contra lo que trajo.
 * El origen es lo que el cliente trae en la URL (`utm_*`); lo que no trae es «Directo». Nada se infiere de datos personales.
 */
export type Origin = { source: string; medium: string; campaign: string };
export const DIRECT: Origin = { source: "directo", medium: "ninguno", campaign: "" };

const clean = (v: string | null | undefined, max = 60) => (v ?? "").trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, max);

/** Origen desde los parámetros de una URL; sin `utm_source` es directo. */
export function originFromParams(p: { get(name: string): string | null }): Origin {
  const source = clean(p.get("utm_source"));
  if (!source) return DIRECT;
  return { source, medium: clean(p.get("utm_medium")) || "ninguno", campaign: clean(p.get("utm_campaign")) };
}

export const sameOrigin = (a: Origin, b: Origin) => a.source === b.source && a.medium === b.medium && a.campaign === b.campaign;
export const originLabel = (o: Origin) => (o.source === DIRECT.source ? "Directo" : `${o.source} / ${o.medium}${o.campaign ? ` / ${o.campaign}` : ""}`);

/** Lo que llega del navegador como origen: se vuelve a limpiar (nunca se confía). */
export function sanitizeOrigin(raw: unknown): Origin {
  if (!raw || typeof raw !== "object") return DIRECT;
  const o = raw as Partial<Origin>;
  const source = clean(typeof o.source === "string" ? o.source : "");
  return source ? { source, medium: clean(typeof o.medium === "string" ? o.medium : "") || "ninguno", campaign: clean(typeof o.campaign === "string" ? o.campaign : "") } : DIRECT;
}

const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
/** Código corto de un enlace: 7 caracteres legibles (≈ 34 bits) con reintento por colisión en la base. */
export function newShortCode(): string {
  return [...randomBytes(7)].map((b) => ALPHABET[b % ALPHABET.length]).join("");
}

export function validateLink(i: { name: string; utmSource: string; utmMedium: string; utmCampaign: string; spend: number; path: string }): string | null {
  if (i.name.trim().length < 3) return "Ponle un nombre a la campaña.";
  if (!clean(i.utmSource)) return "Indica el origen (por ejemplo «instagram»).";
  if (!clean(i.utmMedium)) return "Indica el medio (por ejemplo «social» o «correo»).";
  if (!clean(i.utmCampaign)) return "Indica el nombre de la campaña (por ejemplo «lanzamiento-octubre»).";
  if (!(i.spend >= 0 && i.spend <= 1e10)) return "La inversión no puede ser negativa.";
  if (i.path && !/^(\/p\/[0-9a-f-]{36})?$/.test(i.path)) return "Ese destino no es válido.";
  return null;
}

/** URL final del enlace: la del sitio (o producto) con sus UTM. */
export function destinationUrl(baseUrl: string, siteSlug: string, l: { path: string; utmSource: string; utmMedium: string; utmCampaign: string }): string {
  const u = new URL(`${baseUrl}/s/${siteSlug}${l.path}`);
  u.searchParams.set("utm_source", clean(l.utmSource));
  u.searchParams.set("utm_medium", clean(l.utmMedium));
  u.searchParams.set("utm_campaign", clean(l.utmCampaign));
  return u.toString();
}

/* ------------------------------- Reporte por origen ------------------------------- */

export type OriginRow = { origin: Origin; label: string; spend: number; clicks: number; leads: number; orders: number; revenue: number; costPerLead: number | null; roas: number | null };

/** Une, por origen, lo invertido y los clics (de los enlaces) con los contactos y las ventas pagadas que llegaron. */
export function originReport(input: {
  links: { utmSource: string; utmMedium: string; utmCampaign: string; spend: number; clicks: number }[];
  leads: { origin: Origin }[];
  orders: { origin: Origin; total: number }[];
}): OriginRow[] {
  const key = (o: Origin) => `${o.source}|${o.medium}|${o.campaign}`;
  const rows = new Map<string, OriginRow>();
  const row = (o: Origin) => {
    const k = key(o);
    if (!rows.has(k)) rows.set(k, { origin: o, label: originLabel(o), spend: 0, clicks: 0, leads: 0, orders: 0, revenue: 0, costPerLead: null, roas: null });
    return rows.get(k)!;
  };
  for (const l of input.links) {
    const r = row({ source: clean(l.utmSource), medium: clean(l.utmMedium), campaign: clean(l.utmCampaign) });
    r.spend += l.spend;
    r.clicks += l.clicks;
  }
  for (const l of input.leads) row(l.origin).leads++;
  for (const o of input.orders) {
    const r = row(o.origin);
    r.orders++;
    r.revenue += o.total;
  }
  return [...rows.values()]
    .map((r) => ({ ...r, costPerLead: r.leads > 0 && r.spend > 0 ? Math.round(r.spend / r.leads) : null, roas: r.spend > 0 ? Math.round((r.revenue / r.spend) * 100) / 100 : null }))
    .sort((a, b) => b.revenue - a.revenue || b.leads - a.leads || b.spend - a.spend);
}

/* ------------------------------- Reseñas ------------------------------- */

export const LOW_RATING = 2;
export const isLowRating = (rating: number) => rating >= 1 && rating <= LOW_RATING;

export function validateReview(i: { rating: number; comment: string }): string | null {
  if (!Number.isInteger(i.rating) || i.rating < 1 || i.rating > 5) return "Elige de 1 a 5 estrellas.";
  if (i.comment.length > 600) return "El comentario es muy largo (máximo 600 caracteres).";
  return null;
}

/** Promedio y cantidad de varias fuentes (cada una con su promedio y su número de reseñas), ponderado por cantidad. */
export function combineRatings(sources: readonly { average: number; count: number }[]): { average: number; count: number } | null {
  const valid = sources.filter((s) => s.count > 0);
  const count = valid.reduce((n, s) => n + s.count, 0);
  if (!count) return null;
  return { count, average: Math.round((valid.reduce((n, s) => n + s.average * s.count, 0) / count) * 100) / 100 };
}

/** Enlace para dejar una reseña en Google (abre la ventana de reseña del lugar). */
export const googleReviewUrl = (placeId: string) => `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
