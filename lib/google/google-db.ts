import { toNumber } from "@/lib/format";
import { decryptCredentials, encryptCredentials } from "@/lib/providers/connections";
import { db } from "@/prisma/db";
import { PLACE_ID, PlacesError, fetchPlace, napCheck, type NapRow, type Place } from "./places";

/** Ficha de Google Business (servidor): conectar con la llave del negocio, sincronizar y comparar con lo que dice NEXUS. */
export type ListingView = { connected: boolean; placeId: string | null; status: "PENDING" | "OK" | "ERROR" | null; syncedAt: string | null; lastError: string | null; place: Place | null; nap: NapRow[]; napMatches: number; mapsUrl: string | null };

const mapsUrlOf = (placeId: string) => `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(placeId)}`;

export async function connectGoogle(tenantId: string, input: { placeId: string; apiKey: string }): Promise<{ ok: true } | { ok: false; message: string }> {
  const placeId = input.placeId.trim();
  if (!PLACE_ID.test(placeId)) return { ok: false, message: "El ID de lugar no parece válido (empieza por «ChIJ»). Búscalo en el buscador de IDs de lugar de Google." };
  if (input.apiKey.trim().length < 20) return { ok: false, message: "Pega la llave de API de Google (Places API (New))." };
  const enc = encryptCredentials({ apiKey: input.apiKey.trim() });
  await db.orm.public.ExternalConnection.upsert({
    create: { tenantId, kind: "LISTING", provider: "google", environment: "production", status: "CONNECTED", credentialsEnc: enc, credentialsKeyId: "v1" },
    update: { status: "CONNECTED", credentialsEnc: enc, lastError: null },
    conflictOn: { tenantId, kind: "LISTING", provider: "google", environment: "production" },
  });
  await db.orm.public.GoogleListing.upsert({ create: { tenantId, placeId }, update: { placeId, status: "PENDING", lastError: null }, conflictOn: { tenantId } });
  // Si el negocio no tenía enlace a su ficha, queda el de Maps (lo usan Presencia y el sitio).
  const t = await db.orm.public.Tenant.where({ id: tenantId }).select("googleBusinessUrl").first();
  if (t && !t.googleBusinessUrl) await db.orm.public.Tenant.where({ id: tenantId }).update({ googleBusinessUrl: mapsUrlOf(placeId) });
  return { ok: true };
}

/** Lee la ficha en Google y guarda lo leído. Un error se guarda legible (no pierde lo último que sí se leyó). */
export async function syncGoogle(tenantId: string, fetchImpl: typeof fetch = fetch): Promise<{ ok: true; place: Place } | { ok: false; message: string }> {
  const listing = await db.orm.public.GoogleListing.where({ tenantId }).first();
  const conn = await db.orm.public.ExternalConnection.where({ tenantId, kind: "LISTING", provider: "google", environment: "production" }).first();
  if (!listing || !conn?.credentialsEnc) return { ok: false, message: "Conecta primero tu ficha de Google." };
  try {
    const place = await fetchPlace(listing.placeId, decryptCredentials(conn.credentialsEnc).apiKey ?? "", fetchImpl);
    await db.orm.public.GoogleListing.where({ tenantId }).update({ status: "OK", name: place.name, address: place.address, phone: place.phone, website: place.website, rating: place.rating === null ? null : place.rating.toFixed(1), ratingCount: place.ratingCount, syncedAt: Temporal.Instant.fromEpochMilliseconds(Date.now()), lastError: null });
    return { ok: true, place };
  } catch (error) {
    const message = error instanceof PlacesError ? error.message : "No se pudo leer la ficha.";
    await db.orm.public.GoogleListing.where({ tenantId }).update({ status: "ERROR", lastError: message });
    return { ok: false, message };
  }
}

export async function disconnectGoogle(tenantId: string): Promise<void> {
  await db.orm.public.GoogleListing.where({ tenantId }).deleteAll();
  await db.orm.public.ExternalConnection.where({ tenantId, kind: "LISTING", provider: "google" }).deleteAll();
}

export async function listingView(tenantId: string): Promise<ListingView> {
  const [l, t] = await Promise.all([db.orm.public.GoogleListing.where({ tenantId }).first(), db.orm.public.Tenant.where({ id: tenantId }).select("name", "address", "city", "whatsappNumber", "websiteUrl").first()]);
  if (!l || !t) return { connected: false, placeId: null, status: null, syncedAt: null, lastError: null, place: null, nap: [], napMatches: 0, mapsUrl: null };
  const place: Place | null = l.status === "OK" ? { name: l.name, address: l.address, phone: l.phone, website: l.website, rating: l.rating === null ? null : toNumber(l.rating), ratingCount: l.ratingCount } : null;
  const nap = place ? napCheck({ name: t.name, address: [t.address, t.city].filter(Boolean).join(", ") || null, phone: t.whatsappNumber, website: t.websiteUrl }, place) : [];
  return { connected: true, placeId: l.placeId, status: l.status as ListingView["status"], syncedAt: l.syncedAt ? String(l.syncedAt) : null, lastError: l.lastError, place, nap, napMatches: nap.filter((r) => r.match).length, mapsUrl: mapsUrlOf(l.placeId) };
}
