import { afterAll, beforeAll, afterEach, describe, expect, test, vi } from "vitest";
import { db } from "@/prisma/db";
import { createAdminDb } from "@/lib/platform/admin/db";
import { deleteTenantCompletely } from "@/lib/core/tenancy/deletion";
import { connectProvider } from "@/lib/integrations/providers/connections";
import { applyStatus, listConversations, openConversation, replyTo } from "@/lib/integrations/channels/conversations-db";
import { receiveWebhookRequest, verifyWebhookRequest } from "@/lib/integrations/channels/webhook-handler";
import { signBody } from "@/lib/integrations/channels/whatsapp-cloud";
import { commercialTimeline } from "@/lib/business/growth/commercial-timeline";

/** HU-whatsapp-negocio-01: cada negocio envía y recibe por su propio número, sin mezclar conversaciones. Meta se simula (sin credenciales reales). */
const TEST_URL = process.env.TEST_DATABASE_URL;
const normalize = (url: string | undefined) => (url ?? "").replace(/\?.*$/, "");

describe.skipIf(!TEST_URL)("WhatsApp por negocio (integración, Meta simulado)", () => {
  const suffix = Date.now().toString(36);
  let a = "";
  let b = "";
  let connA = "";
  let connB = "";
  const credsA = { phoneNumberId: "100000000001", accessToken: "token-de-acceso-a-largo-largo", appSecret: "secreto-app-a-123456", verifyToken: "verifica-a-123" };
  const credsB = { phoneNumberId: "100000000002", accessToken: "token-de-acceso-b-largo-largo", appSecret: "secreto-app-b-123456", verifyToken: "verifica-b-123" };
  const body = (phoneNumberId: string, id: string, text: string, from = "573001112233", ts = String(Math.floor(Date.now() / 1000))) => JSON.stringify({ entry: [{ changes: [{ value: { metadata: { phone_number_id: phoneNumberId }, contacts: [{ wa_id: from, profile: { name: "Camila Torres" } }], messages: [{ from, id, timestamp: ts, type: "text", text: { body: text } }] } }] }] });
  const post = (conn: string, raw: string, secret: string, sig = signBody(raw, secret)) => receiveWebhookRequest(conn, raw, sig);

  beforeAll(async () => {
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) throw new Error("DATABASE_URL debe ser igual a TEST_DATABASE_URL.");
    process.env.WEBHOOK_ENCRYPTION_KEY = "d".repeat(64);
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ verified_name: "Mi negocio" }), { status: 200 })));
    const admin = createAdminDb();
    a = String((await admin.createTenant({ name: "Canal A", slug: `wa-${suffix}`, vertical: "retail", modules: ["crm", "whatsapp"], tenantType: "COMPANY", ownerEmail: `wa-${suffix}@ejemplo.com` })).id);
    b = String((await admin.createTenant({ name: "Canal B", slug: `wb-${suffix}`, vertical: "retail", modules: ["crm", "whatsapp"], tenantType: "COMPANY", ownerEmail: `wb-${suffix}@ejemplo.com` })).id);
    const ca = await connectProvider(a, { provider: "whatsapp_cloud", environment: "production", credentials: credsA });
    const cb = await connectProvider(b, { provider: "whatsapp_cloud", environment: "production", credentials: credsB });
    if (!ca.ok || !cb.ok) throw new Error("no se conectaron");
    connA = ca.row.id;
    connB = cb.row.id;
  });
  afterEach(() => vi.mocked(fetch).mockClear());
  afterAll(async () => {
    vi.unstubAllGlobals();
    for (const id of [a, b]) if (id) await deleteTenantCompletely(id);
    await db.close();
  });

  test("la conexión se verifica con Meta y guarda las credenciales cifradas", async () => {
    const row = await db.orm.public.ExternalConnection.where({ id: connA }).first();
    expect(row).toMatchObject({ kind: "MESSAGING", provider: "whatsapp_cloud", status: "CONNECTED" });
    expect(row?.credentialsEnc).toBeTruthy();
    expect(row?.credentialsEnc).not.toContain(credsA.accessToken);
    // Un token que Meta rechaza no deja la conexión activa (negocio aparte: el de arriba ya tiene la suya).
    const d = String((await createAdminDb().createTenant({ name: "Token malo", slug: `wd-${suffix}`, vertical: "retail", modules: ["crm"], tenantType: "COMPANY", ownerEmail: `wd-${suffix}@ejemplo.com` })).id);
    try {
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ error: { message: "Invalid OAuth" } }), { status: 401 }));
      expect(await connectProvider(d, { provider: "whatsapp_cloud", environment: "production", credentials: { ...credsB, accessToken: "token-malo-pero-largo-123" } })).toMatchObject({ ok: false, message: "Meta rechazó el token de acceso." });
    } finally {
      await deleteTenantCompletely(d);
    }
  });

  test("Meta suscribe el webhook solo con el token de verificación de ESA conexión", async () => {
    const ok = await verifyWebhookRequest(connA, new URLSearchParams({ "hub.mode": "subscribe", "hub.verify_token": credsA.verifyToken, "hub.challenge": "abc123" }));
    expect(ok.status).toBe(200);
    expect(await ok.text()).toBe("abc123");
    expect((await verifyWebhookRequest(connA, new URLSearchParams({ "hub.mode": "subscribe", "hub.verify_token": credsB.verifyToken, "hub.challenge": "x" }))).status).toBe(403);
    expect((await verifyWebhookRequest("no-es-una-conexion", new URLSearchParams({ "hub.mode": "subscribe", "hub.verify_token": credsA.verifyToken }))).status).toBe(403);
  });

  test("un mensaje entrante crea el contacto, la conversación y aparece en la ficha", async () => {
    const raw = body(credsA.phoneNumberId, "wamid.A1", "Hola, quiero 40 camisetas");
    expect((await post(connA, raw, credsA.appSecret)).status).toBe(200);
    const [convo] = await listConversations(a);
    expect(convo).toMatchObject({ contactHandle: "573001112233", unread: 1, windowOpen: true, customerName: "Camila Torres", lastBody: "Hola, quiero 40 camisetas" });
    const customer = await db.orm.public.Customer.where({ tenantId: a, phoneNorm: "573001112233" }).first();
    expect(customer).toMatchObject({ source: "WHATSAPP", stage: "PROSPECT" });
    expect(convo!.customerId).toBe(customer!.id);
    const events = await commercialTimeline(a, customer!.id);
    expect(events.find((e) => e.type === "message")).toMatchObject({ title: "WhatsApp · escribió", description: "Hola, quiero 40 camisetas" });
    // El mismo aviso repetido no duplica.
    await post(connA, raw, credsA.appSecret);
    expect((await openConversation(a, convo!.id))!.filter((m) => m.direction === "IN")).toHaveLength(1);
    expect((await listConversations(a))[0]!.unread).toBe(0);
  });

  test("firma inválida, número ajeno o conexión inexistente se rechazan sin guardar nada", async () => {
    const before = (await db.orm.public.BusinessMessage.where({ tenantId: a }).all()).length;
    const raw = body(credsA.phoneNumberId, "wamid.A2", "Intento falso");
    expect((await post(connA, raw, credsA.appSecret, "sha256=abc")).status).toBe(401);
    expect((await post(connA, raw, credsB.appSecret)).status).toBe(401);
    expect((await post("00000000-0000-0000-0000-000000000000", raw, credsA.appSecret)).status).toBe(404);
    // Firmado bien, pero el mensaje llegó a OTRO número: no es de este negocio.
    const foreign = body(credsB.phoneNumberId, "wamid.A3", "Era para el otro negocio");
    expect((await post(connA, foreign, credsA.appSecret)).status).toBe(200);
    expect((await db.orm.public.BusinessMessage.where({ tenantId: a }).all()).length).toBe(before);
  });

  test("dos negocios con el mismo contacto ven conversaciones separadas", async () => {
    await post(connB, body(credsB.phoneNumberId, "wamid.B1", "Hola negocio B"), credsB.appSecret);
    const ca = await listConversations(a);
    const cb = await listConversations(b);
    expect(ca).toHaveLength(1);
    expect(cb).toHaveLength(1);
    expect(ca[0]!.id).not.toBe(cb[0]!.id);
    expect(ca[0]!.lastBody).toBe("Hola, quiero 40 camisetas");
    expect(cb[0]!.lastBody).toBe("Hola negocio B");
    expect(await openConversation(b, ca[0]!.id)).toBeNull();
    expect(await replyTo(b, ca[0]!.id, "Intruso", "u")).toMatchObject({ ok: false });
  });

  test("responder dentro de las 24 h sale por la API; fuera de la ventana queda listo con un toque", async () => {
    const [convo] = await listConversations(a);
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ messages: [{ id: "wamid.OUT1" }] }), { status: 200 }));
    const sent = await replyTo(a, convo!.id, "¡Claro! Te cotizo hoy", "u");
    expect(sent).toMatchObject({ ok: true, delivery: "sent" });
    const call = vi.mocked(fetch).mock.calls.at(-1)!;
    expect(String(call[0])).toContain(`/${credsA.phoneNumberId}/messages`);
    expect(JSON.parse(String((call[1] as RequestInit).body))).toMatchObject({ to: "573001112233", type: "text" });
    expect((await openConversation(a, convo!.id))!.at(-1)).toMatchObject({ direction: "OUT", status: "SENT" });

    const late = await replyTo(a, convo!.id, "Mensaje tarde", "u", Date.now() + 25 * 3_600_000);
    expect(late).toMatchObject({ ok: true, delivery: "manual", link: expect.stringContaining("https://wa.me/573001112233") });
    expect(vi.mocked(fetch).mock.calls.length).toBe(1);
    expect((await openConversation(a, convo!.id))!.at(-1)).toMatchObject({ status: "MANUAL", error: "Fuera de la ventana de 24 h" });

    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ error: { message: "Token vencido" } }), { status: 401 }));
    expect(await replyTo(a, convo!.id, "Otro mensaje", "u")).toMatchObject({ ok: true, delivery: "manual", message: expect.stringContaining("Token vencido") });
    expect(await replyTo(a, convo!.id, "   ", "u")).toMatchObject({ ok: false });
  });

  test("los avisos de estado actualizan el mensaje y nunca bajan un estado ya alcanzado", async () => {
    const [convo] = await listConversations(a);
    expect(await applyStatus(a, { phoneNumberId: credsA.phoneNumberId, externalId: "wamid.OUT1", status: "DELIVERED", error: null })).toBe(true);
    expect(await applyStatus(a, { phoneNumberId: credsA.phoneNumberId, externalId: "wamid.OUT1", status: "SENT", error: null })).toBe(false);
    expect(await applyStatus(a, { phoneNumberId: credsA.phoneNumberId, externalId: "wamid.OUT1", status: "READ", error: null })).toBe(true);
    expect((await openConversation(a, convo!.id))!.find((m) => m.status === "READ")).toBeTruthy();
    expect(await applyStatus(b, { phoneNumberId: credsB.phoneNumberId, externalId: "wamid.OUT1", status: "FAILED", error: "x" })).toBe(false);
  });

  test("sin conexión, responder deja el mensaje listo con un toque", async () => {
    const admin = createAdminDb();
    const c = String((await admin.createTenant({ name: "Sin canal", slug: `wc-${suffix}`, vertical: "retail", modules: ["crm"], tenantType: "COMPANY", ownerEmail: `wc-${suffix}@ejemplo.com` })).id);
    try {
      const convo = await db.orm.public.BusinessConversation.create({ tenantId: c, connectionId: "ninguna", contactHandle: "573009998877", lastInboundAt: Temporal.Instant.fromEpochMilliseconds(Date.now()) });
      expect(await replyTo(c, convo.id, "Hola", "u")).toMatchObject({ ok: true, delivery: "manual", message: expect.stringContaining("Aún no conectas") });
      expect(vi.mocked(fetch)).not.toHaveBeenCalled();
    } finally {
      await deleteTenantCompletely(c);
    }
  });
});
