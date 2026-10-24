import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { db } from "@/prisma/db";
import { createAdminDb } from "@/lib/admin/db";
import { presenceV2 } from "@/lib/presence/pillars-db";
import { deleteTenantCompletely } from "@/lib/tenant/deletion";
import { connectGoogle, disconnectGoogle, listingView, syncGoogle } from "./google-db";

/** Ficha de Google contra Postgres real y DOS negocios, con la API de Google simulada. */
const TEST_URL = process.env.TEST_DATABASE_URL;
const normalize = (url: string | undefined) => (url ?? "").replace(/\?.*$/, "");
const ID = "ChIJN1t_tDeuEmsRUsoyG83frY4";
const KEY = "AIzaSyLLAVE-DE-PRUEBA-1234567890";
const google = (status: number, body: unknown = {}) => (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;
const OK = { displayName: { text: "Simplapp Gym" }, formattedAddress: "Cl. 80 #12-34, Bogotá, Colombia", internationalPhoneNumber: "+57 300 123 4567", websiteUri: "https://www.simplapp.co/", rating: 4.6, userRatingCount: 128 };

describe.skipIf(!TEST_URL)("ficha de Google (integración)", () => {
  const suffix = Date.now().toString(36);
  let a = "";
  let b = "";

  beforeAll(async () => {
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) throw new Error("DATABASE_URL debe ser igual a TEST_DATABASE_URL.");
    process.env.WEBHOOK_ENCRYPTION_KEY = "d".repeat(64);
    const make = (name: string, slug: string) => createAdminDb().createTenant({ name, slug, vertical: "gym", modules: ["inventory"], tenantType: "COMPANY", ownerEmail: `${slug}@ejemplo.com` });
    a = String((await make("Simplapp Gym", `gg-a-${suffix}`)).id);
    b = String((await make("Otro Negocio", `gg-b-${suffix}`)).id);
    await db.orm.public.Tenant.where({ id: a }).update({ address: "Calle 80 # 12-34", city: "Bogotá", whatsappNumber: "+573001234567", websiteUrl: "https://simplapp.co" });
  });
  afterAll(async () => {
    for (const id of [a, b]) if (id) await deleteTenantCompletely(id);
    await db.close();
  });

  test("sin conectar: nada medido en el pilar Google", async () => {
    expect((await listingView(a)).connected).toBe(false);
    expect((await presenceV2(a)).pillars.find((p) => p.key === "google")!.score).toBeNull();
    expect(await syncGoogle(a)).toMatchObject({ ok: false });
  });

  test("conectar valida el ID y la llave, la guarda cifrada y deja el enlace de Maps", async () => {
    expect(await connectGoogle(a, { placeId: "malo", apiKey: KEY })).toMatchObject({ ok: false });
    expect(await connectGoogle(a, { placeId: ID, apiKey: "corta" })).toMatchObject({ ok: false });
    expect(await connectGoogle(a, { placeId: ID, apiKey: KEY })).toEqual({ ok: true });
    const conn = await db.orm.public.ExternalConnection.where({ tenantId: a, kind: "LISTING", provider: "google" }).first();
    expect(conn!.credentialsEnc).toBeTruthy();
    expect(conn!.credentialsEnc).not.toContain("LLAVE-DE-PRUEBA");
    expect((await db.orm.public.Tenant.where({ id: a }).first())!.googleBusinessUrl).toContain(`place_id:${ID}`);
  });

  test("sincronizar guarda la ficha, compara con tus datos y sube el pilar Google", async () => {
    expect(await syncGoogle(a, google(200, OK))).toMatchObject({ ok: true });
    const v = await listingView(a);
    expect(v).toMatchObject({ status: "OK", napMatches: 4, place: { rating: 4.6, ratingCount: 128 } });
    expect((await presenceV2(a)).pillars.find((p) => p.key === "google")!.score).toBe(100);
    // Un teléfono distinto en Google baja la coincidencia y el pilar.
    await syncGoogle(a, google(200, { ...OK, internationalPhoneNumber: "+57 311 000 0000" }));
    expect((await listingView(a)).napMatches).toBe(3);
    expect((await presenceV2(a)).pillars.find((p) => p.key === "google")!.score).toBe(90);
  });

  test("un error de Google se guarda legible, no borra lo último leído y pone el pilar en cero", async () => {
    expect(await syncGoogle(a, google(403))).toMatchObject({ ok: false, message: expect.stringContaining("Places API") });
    const v = await listingView(a);
    expect(v).toMatchObject({ status: "ERROR", lastError: expect.stringContaining("Places API") });
    expect((await presenceV2(a)).pillars.find((p) => p.key === "google")!.score).toBe(0);
    expect(await syncGoogle(a, google(200, OK))).toMatchObject({ ok: true }); // se recupera
  });

  test("aislamiento: B no ve la ficha de A y desconectar borra credencial y ficha", async () => {
    expect((await listingView(b)).connected).toBe(false);
    expect(await syncGoogle(b, google(200, OK))).toMatchObject({ ok: false });
    await disconnectGoogle(a);
    expect((await listingView(a)).connected).toBe(false);
    expect(await db.orm.public.ExternalConnection.where({ tenantId: a, kind: "LISTING" }).first()).toBeNull();
  });
});
