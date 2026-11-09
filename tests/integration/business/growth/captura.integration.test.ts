import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import { db } from "@/prisma/db";
import { createAdminDb } from "@/lib/platform/admin/db";
import { deleteTenantCompletely } from "@/lib/core/tenancy/deletion";
import { resetAttempts } from "@/lib/foundation/rate-limit";
import { captureFromForm, createLeadForm, listLeadForms, preflightOrigin, rotateLeadFormKey, setLeadFormEnabled } from "@/lib/business/growth/lead-forms-db";
import { listOpportunities } from "@/lib/business/growth/opportunities-db";
import { POST, OPTIONS } from "@/app/api/lead-capture/[key]/route";

/** HU-lead-capture-01: un formulario de WordPress crea la oportunidad con su origen; otro dominio se rechaza. */
const TEST_URL = process.env.TEST_DATABASE_URL;
const normalize = (url: string | undefined) => (url ?? "").replace(/\?.*$/, "");

describe.skipIf(!TEST_URL)("captura de interesados (integración)", () => {
  const suffix = Date.now().toString(36);
  let a = "";
  let b = "";
  let key = "";
  let formId = "";
  const ORIGIN = "https://mitienda.com";
  const good = { name: "Camila Torres", phone: "300 111 2233", email: "camila@ejemplo.com", message: "Quiero 40 camisetas", consent: true, source: "wordpress", medium: "formulario", campaign: "lanzamiento" };

  beforeAll(async () => {
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) throw new Error("DATABASE_URL debe ser igual a TEST_DATABASE_URL.");
    const admin = createAdminDb();
    a = String((await admin.createTenant({ name: "Captura A", slug: `la-${suffix}`, vertical: "retail", modules: ["crm"], tenantType: "COMPANY", ownerEmail: `la-${suffix}@ejemplo.com` })).id);
    b = String((await admin.createTenant({ name: "Captura B", slug: `lb-${suffix}`, vertical: "retail", modules: ["crm"], tenantType: "COMPANY", ownerEmail: `lb-${suffix}@ejemplo.com` })).id);
    const created = await createLeadForm(a, { name: "Landing", origins: [ORIGIN, "https://www.mitienda.com/"], campaign: "por-omision" });
    if (!created.ok) throw new Error(created.message);
    key = created.form.publicKey;
    formId = created.form.id;
  });
  afterAll(async () => {
    for (const id of [a, b]) if (id) await deleteTenantCompletely(id);
    await db.close();
  });
  beforeEach(() => resetAttempts(`lead:${key}`));

  test("desde un dominio permitido crea el contacto y la oportunidad con su origen", async () => {
    const r = await captureFromForm(key, ORIGIN, "1.1.1.1", good);
    expect(r).toMatchObject({ status: 200, body: { ok: true }, allowOrigin: ORIGIN });
    const [opp] = await listOpportunities(a);
    expect(opp).toMatchObject({ customerName: "Camila Torres", interest: "Quiero 40 camisetas", source: "FORM:Landing", stage: "NEW" });
    const lead = await db.orm.public.ContactLead.where({ tenantId: a }).first();
    expect(lead?.origin).toMatchObject({ source: "wordpress", medium: "formulario", campaign: "lanzamiento" });
    const customer = await db.orm.public.Customer.where({ tenantId: a }).first();
    expect(customer).toMatchObject({ phoneNorm: "573001112233", source: "WEB", stage: "PROSPECT" });
    expect(customer?.consentAt).toBeTruthy();
  });

  test("sin origen en la petición usa los datos del formulario (campaña por omisión)", async () => {
    await captureFromForm(key, ORIGIN, "1.1.1.2", { ...good, name: "Andrés Gómez", phone: "310 555 0000", source: "", medium: "", campaign: "" });
    const lead = (await db.orm.public.ContactLead.where({ tenantId: a }).all()).find((l) => l.name === "Andrés Gómez");
    expect(lead?.origin).toMatchObject({ source: "formulario-landing", campaign: "por-omision" });
  });

  test("otro dominio, sin Origin o una clave inexistente se rechazan y no guardan nada", async () => {
    const before = (await listOpportunities(a)).length;
    expect(await captureFromForm(key, "https://evil.com", "2.2.2.2", good)).toMatchObject({ status: 403, allowOrigin: null });
    expect(await captureFromForm(key, null, "2.2.2.2", good)).toMatchObject({ status: 403 });
    expect(await captureFromForm("lf_00000000000000000000000000000000", ORIGIN, "2.2.2.2", good)).toMatchObject({ status: 404 });
    expect(await captureFromForm("no-es-una-clave", ORIGIN, "2.2.2.2", good)).toMatchObject({ status: 404 });
    expect((await listOpportunities(a)).length).toBe(before);
  });

  test("el spam responde como éxito para no dar pistas, pero no guarda nada; los datos malos se explican", async () => {
    const before = (await listOpportunities(a)).length;
    expect(await captureFromForm(key, ORIGIN, "3.3.3.3", { ...good, website: "http://spam.com" })).toMatchObject({ status: 200, body: { ok: true } });
    expect((await listOpportunities(a)).length).toBe(before);
    expect(await captureFromForm(key, ORIGIN, "3.3.3.4", { ...good, consent: false })).toMatchObject({ status: 422, body: { field: "consent" } });
    expect(await captureFromForm(key, ORIGIN, "3.3.3.4", { ...good, phone: "12" })).toMatchObject({ status: 422, body: { field: "phone" } });
  });

  test("el límite de envíos por IP frena la ráfaga", async () => {
    const results = [];
    for (let i = 0; i < 7; i++) results.push((await captureFromForm(key, ORIGIN, "4.4.4.4", { ...good, name: `Ráfaga ${i}`, phone: `3201112${String(i).padStart(3, "0")}` })).status);
    expect(results.slice(0, 5)).toEqual([200, 200, 200, 200, 200]);
    expect(results.slice(5)).toEqual([429, 429]);
    expect((await captureFromForm(key, ORIGIN, "5.5.5.5", { ...good, name: "Otra IP", phone: "3209990000" })).status).toBe(200);
  });

  test("apagar el formulario rechaza todo; cambiar la clave invalida la anterior; nada cruza de negocio", async () => {
    expect(await setLeadFormEnabled(b, formId, false)).toMatchObject({ ok: false });
    expect(await rotateLeadFormKey(b, formId)).toMatchObject({ ok: false });
    expect(await setLeadFormEnabled(a, formId, false)).toEqual({ ok: true });
    expect(await captureFromForm(key, ORIGIN, "6.6.6.6", good)).toMatchObject({ status: 404 });
    expect(await preflightOrigin(key, ORIGIN)).toBeNull();
    await setLeadFormEnabled(a, formId, true);
    const rotated = await rotateLeadFormKey(a, formId);
    if (!rotated.ok) throw new Error(rotated.message);
    expect(await captureFromForm(key, ORIGIN, "6.6.6.7", good)).toMatchObject({ status: 404 });
    expect(await captureFromForm(rotated.publicKey, ORIGIN, "6.6.6.7", { ...good, name: "Con clave nueva", phone: "3157778888" })).toMatchObject({ status: 200 });
    key = rotated.publicKey;
    expect(await listLeadForms(b)).toEqual([]);
    expect(await listOpportunities(b)).toEqual([]);
  });

  test("contrato HTTP: CORS solo para el origen permitido, preflight y JSON inválido", async () => {
    const ctx = { params: Promise.resolve({ key }) };
    const req = (origin: string | null, body: unknown, method = "POST") => new Request(`http://localhost/api/lead-capture/${key}`, { method, headers: { "content-type": "application/json", ...(origin ? { origin } : {}) }, body: method === "POST" ? (typeof body === "string" ? body : JSON.stringify(body)) : undefined });
    const ok = await POST(req(ORIGIN, { ...good, name: "Por HTTP", phone: "3161112222" }), ctx);
    expect(ok.status).toBe(200);
    expect(ok.headers.get("access-control-allow-origin")).toBe(ORIGIN);
    expect(ok.headers.get("vary")).toBe("Origin");
    const denied = await POST(req("https://evil.com", good), ctx);
    expect(denied.status).toBe(403);
    expect(denied.headers.get("access-control-allow-origin")).toBeNull();
    expect((await POST(req(ORIGIN, "{no es json"), ctx)).status).toBe(400);
    const pre = await OPTIONS(req(ORIGIN, null, "OPTIONS"), ctx);
    expect(pre.status).toBe(204);
    expect(pre.headers.get("access-control-allow-origin")).toBe(ORIGIN);
    expect(pre.headers.get("access-control-allow-methods")).toContain("POST");
    expect((await OPTIONS(req("https://evil.com", null, "OPTIONS"), ctx)).status).toBe(403);
    expect((await OPTIONS(req("https://evil.com", null, "OPTIONS"), ctx)).headers.get("access-control-allow-origin")).toBeNull();
  });
});
