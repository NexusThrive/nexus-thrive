import { emitEvent } from "@/lib/events/outbox";
import { toNumber } from "@/lib/format";
import { db } from "@/prisma/db";
import { DIRECT, combineRatings, isLowRating, newShortCode, originReport, sanitizeOrigin, validateLink, validateReview, type Origin, type OriginRow } from "./growth";

/** Atribución y reputación (servidor). Lo público se resuelve por la dirección del sitio; todo lo demás va por `tenantId`. */
export type LinkRow = { id: string; code: string; name: string; path: string; utmSource: string; utmMedium: string; utmCampaign: string; spend: number; clicks: number; active: boolean };
const toLink = (l: Record<string, unknown>): LinkRow => ({ id: String(l.id), code: String(l.code), name: String(l.name), path: String(l.path ?? ""), utmSource: String(l.utmSource), utmMedium: String(l.utmMedium), utmCampaign: String(l.utmCampaign), spend: toNumber(l.spend as never), clicks: Number(l.clicks), active: Boolean(l.active) });

export async function createLink(tenantId: string, input: { name: string; utmSource: string; utmMedium: string; utmCampaign: string; spend: number; path?: string }): Promise<{ ok: true; code: string } | { ok: false; message: string }> {
  const path = input.path ?? "";
  const problem = validateLink({ ...input, path });
  if (problem) return { ok: false, message: problem };
  if (path) {
    const id = path.slice(3);
    if (!(await db.orm.public.Product.where({ tenantId, id }).select("id").first())) return { ok: false, message: "Ese producto no existe en tu negocio." };
  }
  const o = sanitizeOrigin({ source: input.utmSource, medium: input.utmMedium, campaign: input.utmCampaign });
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const l = await db.orm.public.TrackedLink.create({ tenantId, code: newShortCode(), name: input.name.trim().slice(0, 80), path, utmSource: o.source, utmMedium: o.medium, utmCampaign: o.campaign, spend: input.spend.toFixed(2) });
      return { ok: true, code: l.code };
    } catch (error) {
      if (!/unique|duplicate/i.test(String((error as Error)?.message ?? error))) throw error;
    }
  }
  return { ok: false, message: "No se pudo generar un código libre. Inténtalo de nuevo." };
}

export async function listLinks(tenantId: string): Promise<LinkRow[]> {
  return (await db.orm.public.TrackedLink.where({ tenantId }).orderBy((l) => l.createdAt.desc()).limit(100).all()).map((l) => toLink(l as unknown as Record<string, unknown>));
}

export async function setLinkActive(tenantId: string, id: string, active: boolean): Promise<boolean> {
  if (!(await db.orm.public.TrackedLink.where({ tenantId, id }).select("id").first())) return false;
  await db.orm.public.TrackedLink.where({ tenantId, id }).update({ active });
  return true;
}

/** El enlace corto público: devuelve a dónde ir y cuenta el clic (sin perder clics si dos llegan a la vez). */
export async function resolveLink(code: string): Promise<{ siteSlug: string; path: string; utmSource: string; utmMedium: string; utmCampaign: string } | null> {
  if (!/^[a-z0-9]{5,12}$/.test(code)) return null;
  const link = await db.orm.public.TrackedLink.where({ code, active: true }).first();
  if (!link) return null;
  const site = await db.orm.public.SiteConfig.where({ tenantId: link.tenantId, enabled: true }).first();
  if (!site) return null;
  for (let i = 0; i < 5; i++) {
    const cur = await db.orm.public.TrackedLink.where({ id: link.id }).select("clicks").first();
    const plan = db.sql.public.TrackedLink.update({ clicks: (cur?.clicks ?? 0) + 1 }).where((f, fns) => fns.and(fns.eq(f.id, link.id), fns.eq(f.clicks, cur?.clicks ?? 0))).returning("id").build();
    if ((await db.transaction((tx) => tx.query(plan))).length > 0) break;
  }
  return { siteSlug: site.siteSlug, path: link.path, utmSource: link.utmSource, utmMedium: link.utmMedium, utmCampaign: link.utmCampaign };
}

async function siteTenant(siteSlug: string) {
  const cfg = await db.orm.public.SiteConfig.where({ siteSlug, enabled: true }).first();
  const tenant = cfg ? await db.orm.public.Tenant.where({ id: cfg.tenantId, active: true }).first() : null;
  return tenant ? { tenantId: tenant.id, name: tenant.name } : null;
}

/** Contacto desde el formulario público del sitio. */
export async function createLead(siteSlug: string, input: { name: string; phone: string; email: string; message: string; origin: unknown }): Promise<{ ok: true } | { ok: false; message: string; fields?: Record<string, string> }> {
  const fields: Record<string, string> = {};
  if (input.name.trim().length < 3) fields.name = "Escribe tu nombre.";
  if (input.phone.replace(/\D/g, "").length < 10) fields.phone = "Escribe un celular de 10 dígitos.";
  if (input.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(input.email.trim())) fields.email = "Ese correo no parece válido.";
  if (input.message.length > 500) fields.message = "El mensaje es muy largo (máximo 500).";
  if (Object.keys(fields).length) return { ok: false, message: "Revisa los datos marcados.", fields };
  const site = await siteTenant(siteSlug);
  if (!site) return { ok: false, message: "Este sitio no está disponible." };
  const origin = sanitizeOrigin(input.origin);
  const lead = await db.transaction(async (tx) => {
    const l = await tx.orm.public.ContactLead.create({ tenantId: site.tenantId, name: input.name.trim().slice(0, 120), phone: input.phone.trim().slice(0, 30), email: input.email.trim().toLowerCase().slice(0, 120) || null, message: input.message.trim().slice(0, 500) || null, origin: origin as never });
    await emitEvent(tx, site.tenantId, { type: "lead.created", resourceType: "contact_lead", resourceId: l.id, payload: { lead_id: l.id, name: l.name, phone: l.phone, email: l.email, origin } });
    return l;
  });
  void lead;
  return { ok: true };
}

/** Reseña desde el enlace público del negocio. Las de 1–2 estrellas quedan en alerta y disparan `review.low`. */
export async function createReview(siteSlug: string, input: { rating: number; comment: string; name: string; contact: string }): Promise<{ ok: true; low: boolean; googleReviewUrl: string | null } | { ok: false; message: string }> {
  const problem = validateReview(input);
  if (problem) return { ok: false, message: problem };
  const site = await siteTenant(siteSlug);
  if (!site) return { ok: false, message: "Este sitio no está disponible." };
  const low = isLowRating(input.rating);
  await db.transaction(async (tx) => {
    const r = await tx.orm.public.Review.create({ tenantId: site.tenantId, rating: input.rating, comment: input.comment.trim().slice(0, 600) || null, customerName: input.name.trim().slice(0, 120) || null, contact: input.contact.trim().slice(0, 120) || null, status: low ? "ALERTED" : "NEW" });
    if (low) await emitEvent(tx, site.tenantId, { type: "review.low", resourceType: "review", resourceId: r.id, payload: { review_id: r.id, rating: r.rating, comment: r.comment, customer: { name: r.customerName, contact: r.contact } } });
  });
  const listing = !low ? await db.orm.public.GoogleListing.where({ tenantId: site.tenantId }).first() : null;
  return { ok: true, low, googleReviewUrl: listing ? (await import("./growth")).googleReviewUrl(listing.placeId) : null };
}

export type ReviewRow = { id: string; source: string; rating: number; comment: string | null; customerName: string | null; contact: string | null; status: string; createdAt: string };

export async function listReviews(tenantId: string): Promise<ReviewRow[]> {
  const rows = await db.orm.public.Review.where({ tenantId }).orderBy((r) => r.createdAt.desc()).limit(100).all();
  return rows.map((r) => ({ id: r.id, source: r.source, rating: r.rating, comment: r.comment, customerName: r.customerName, contact: r.contact, status: r.status, createdAt: String(r.createdAt) }));
}

export async function handleReview(tenantId: string, id: string): Promise<boolean> {
  if (!(await db.orm.public.Review.where({ tenantId, id }).select("id").first())) return false;
  await db.orm.public.Review.where({ tenantId, id }).update({ status: "HANDLED", handledAt: Temporal.Instant.fromEpochMilliseconds(Date.now()) });
  return true;
}

/** Reputación del negocio: reseñas internas + la calificación de su ficha de Google, ponderadas por cantidad. */
export async function reputationOf(tenantId: string): Promise<{ average: number; count: number; internal: { average: number; count: number } | null; google: { average: number; count: number } | null; alerts: number } | null> {
  const [reviews, listing] = await Promise.all([db.orm.public.Review.where({ tenantId }).all(), db.orm.public.GoogleListing.where({ tenantId, status: "OK" }).first()]);
  const internal = reviews.length ? { average: reviews.reduce((s, r) => s + r.rating, 0) / reviews.length, count: reviews.length } : null;
  const google = listing?.rating != null && listing.ratingCount ? { average: toNumber(listing.rating), count: listing.ratingCount } : null;
  const both = combineRatings([internal, google].filter((x): x is { average: number; count: number } => x !== null));
  return both ? { ...both, internal, google, alerts: reviews.filter((r) => r.status === "ALERTED").length } : null;
}

const day = (n: number) => Temporal.Instant.fromEpochMilliseconds(Date.now() - n * 86_400_000);
const originOf = (raw: unknown): Origin => sanitizeOrigin(raw ?? DIRECT);

/** Inversión contra lo que trajo cada origen en los últimos días (contactos y ventas pagadas de la tienda). */
export async function growthReport(tenantId: string, days = 90): Promise<{ rows: OriginRow[]; totals: { spend: number; leads: number; orders: number; revenue: number } }> {
  const since = day(days);
  const [links, leads, orders] = await Promise.all([
    listLinks(tenantId),
    db.orm.public.ContactLead.where({ tenantId }).where((l) => l.createdAt.gte(since)).all(),
    db.orm.public.StoreOrder.where({ tenantId, status: "PAID" }).where((o) => o.createdAt.gte(since)).all(),
  ]);
  const rows = originReport({ links, leads: leads.map((l) => ({ origin: originOf(l.origin) })), orders: orders.map((o) => ({ origin: originOf(o.origin), total: toNumber(o.total) })) });
  return { rows, totals: { spend: rows.reduce((s, r) => s + r.spend, 0), leads: rows.reduce((s, r) => s + r.leads, 0), orders: rows.reduce((s, r) => s + r.orders, 0), revenue: rows.reduce((s, r) => s + r.revenue, 0) } };
}

/** Pilar de atribución: de los contactos y ventas digitales, cuántos llegan con una campaña identificada. `null` si no hay ninguno. */
export async function attributionStats(tenantId: string, days = 90): Promise<{ withOrigin: number; total: number } | null> {
  const since = day(days);
  const [leads, orders] = await Promise.all([db.orm.public.ContactLead.where({ tenantId }).where((l) => l.createdAt.gte(since)).all(), db.orm.public.StoreOrder.where({ tenantId, status: "PAID" }).where((o) => o.createdAt.gte(since)).all()]);
  const all = [...leads.map((l) => originOf(l.origin)), ...orders.map((o) => originOf(o.origin))];
  return all.length ? { withOrigin: all.filter((o) => o.source !== DIRECT.source).length, total: all.length } : null;
}
