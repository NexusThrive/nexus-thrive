import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { db } from "@/prisma/db";
import { createAdminDb } from "@/lib/admin/db";
import { deleteTenantCompletely } from "@/lib/tenant/deletion";
import { dispatchPending } from "@/lib/events/dispatcher";
import { createEndpoint } from "@/lib/events/endpoints";
import { connectProvider, disconnectProvider, listConnections } from "./connections";
import { MAX_BODY_BYTES, processPendingProviderEvents, receiveProviderWebhook } from "./inbound";
import { sandboxSignature } from "./sandbox";

/** Webhook entrante de punta a punta contra Postgres real y con DOS negocios. */
const TEST_URL = process.env.TEST_DATABASE_URL;
const normalize = (url: string | undefined) => (url ?? "").replace(/\?.*$/, "");

describe.skipIf(!TEST_URL)("conexiones y webhooks entrantes (integración)", () => {
  const suffix = Date.now().toString(36);
  let a = "";
  let b = "";
  let conn = { id: "", secret: "" };
  let connB = { id: "", secret: "" };

  const evt = (id: string, type = "payment.succeeded") => JSON.stringify({ id, type, reference: "pay_1", amount: "50000" });
  const send = (c: { id: string; secret: string }, raw: string, opts: { sig?: string; provider?: string } = {}) =>
    receiveProviderWebhook({ provider: opts.provider ?? "sandbox", connectionId: c.id, rawBody: raw, headers: new Headers({ "x-sandbox-signature": opts.sig ?? sandboxSignature(c.secret, raw) }) });
  const stored = (tenantId: string) => db.orm.public.ProviderEvent.where({ tenantId }).all();

  beforeAll(async () => {
    process.env.WEBHOOK_ENCRYPTION_KEY = "d".repeat(64);
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) throw new Error("DATABASE_URL debe ser igual a TEST_DATABASE_URL.");
    const make = (name: string, slug: string) => createAdminDb().createTenant({ name, slug, vertical: "gym", modules: ["crm"], tenantType: "COMPANY", ownerEmail: `${slug}@ejemplo.com` });
    a = String((await make("Gym A", `pv-a-${suffix}`)).id);
    b = String((await make("Gym B", `pv-b-${suffix}`)).id);
    const ca = await connectProvider(a, { provider: "sandbox", environment: "sandbox" });
    const cb = await connectProvider(b, { provider: "sandbox", environment: "sandbox" });
    if (!ca.ok || !cb.ok) throw new Error("conexión");
    conn = { id: ca.row.id, secret: ca.generated!.webhookSecret };
    connB = { id: cb.row.id, secret: cb.generated!.webhookSecret };
  });
  afterAll(async () => {
    for (const id of [a, b]) if (id) await deleteTenantCompletely(id);
    await db.close();
  });

  test("conectar genera el secreto una vez, lo guarda cifrado y no lo expone en la lista", async () => {
    const row = await db.orm.public.ExternalConnection.where({ id: conn.id }).first();
    expect(row?.credentialsEnc).toBeTruthy();
    expect(row?.credentialsEnc).not.toContain(conn.secret);
    const list = await listConnections(a);
    expect(list).toHaveLength(1);
    expect(JSON.stringify(list)).not.toContain(conn.secret);
    expect(list[0]).toMatchObject({ provider: "sandbox", status: "CONNECTED", webhookPath: `/api/webhooks/providers/sandbox/${conn.id}` });
    expect(await connectProvider(a, { provider: "sandbox", environment: "sandbox" })).toMatchObject({ ok: false });
    expect(await connectProvider(a, { provider: "wompi", environment: "sandbox" })).toMatchObject({ ok: false });
  });

  test("firma válida: se guarda una vez y se procesa (queda en el outbox para n8n)", async () => {
    const raw = evt("evt_ok_1");
    expect(await send(conn, raw)).toEqual({ status: 200, body: { received: true, processed: true } });
    const rows = await stored(a);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ externalId: "evt_ok_1", eventType: "payment.succeeded", provider: "sandbox" });
    expect(rows[0].processedAt).toBeTruthy();
    const out = await db.orm.public.OutboxEvent.where({ tenantId: a, type: "provider.event_received" }).all();
    expect(out).toHaveLength(1);
    expect(out[0].payload).toMatchObject({ external_id: "evt_ok_1", event_type: "payment.succeeded", reference: "pay_1", connection_id: conn.id });
  });

  test("el mismo evento otra vez no se duplica ni se reprocesa (ni 10 a la vez)", async () => {
    const raw = evt("evt_dup");
    const results = await Promise.all(Array.from({ length: 10 }, () => send(conn, raw)));
    expect(results.filter((r) => r.body.duplicate).length).toBe(9);
    expect((await stored(a)).filter((e) => e.externalId === "evt_dup")).toHaveLength(1);
    expect((await db.orm.public.OutboxEvent.where({ tenantId: a, type: "provider.event_received" }).all()).filter((e) => (e.payload as { external_id: string }).external_id === "evt_dup")).toHaveLength(1);
  });

  test("firma inválida: 401 y NO se guarda nada (no se pueden ocupar ids ajenos)", async () => {
    const before = (await stored(a)).length;
    expect((await send(conn, evt("evt_bad"), { sig: "sha256=00" })).status).toBe(401);
    expect((await send(conn, evt("evt_bad"), { sig: sandboxSignature("otro-secreto", evt("evt_bad")) })).status).toBe(401);
    expect((await stored(a)).length).toBe(before);
    // y el evento legítimo con ese mismo id sigue entrando después
    expect((await send(conn, evt("evt_bad"))).status).toBe(200);
  });

  test("aislamiento: el secreto de un negocio no sirve en la conexión de otro", async () => {
    const raw = evt("evt_cross");
    expect((await send({ id: connB.id, secret: conn.secret }, raw)).status).toBe(401); // firma de A en la conexión de B
    expect((await send(connB, raw)).status).toBe(200);
    expect((await stored(a)).some((e) => e.externalId === "evt_cross")).toBe(false);
    expect((await stored(b)).some((e) => e.externalId === "evt_cross")).toBe(true);
  });

  test("conexión inexistente, proveedor equivocado, evento que no usamos y cuerpo enorme", async () => {
    expect((await send({ id: "no-existe", secret: "x" }, evt("e"))).status).toBe(404);
    expect((await send(conn, evt("e"), { provider: "wompi" })).status).toBe(404);
    expect((await send(conn, '{"id":"x","type":"user.deleted"}')).body).toEqual({ ignored: true });
    expect((await send(conn, "x".repeat(MAX_BODY_BYTES + 1))).status).toBe(413);
  });

  test("desconectar borra credenciales y corta los webhooks; otro negocio no puede desconectar", async () => {
    expect(await disconnectProvider(b, conn.id)).toBe(false);
    expect(await disconnectProvider(a, conn.id)).toBe(true);
    const row = await db.orm.public.ExternalConnection.where({ id: conn.id }).first();
    expect(row).toMatchObject({ status: "DISCONNECTED", credentialsEnc: null });
    expect((await send(conn, evt("evt_after"))).status).toBe(404);
  });

  test("un evento guardado sin procesar se reintenta y llega por webhook de salida", async () => {
    const ev = await db.orm.public.ProviderEvent.create({ tenantId: b, connectionId: connB.id, provider: "sandbox", kind: "PAYMENT", eventType: "payment.failed", externalId: "evt_stuck", rawBody: evt("evt_stuck", "payment.failed") });
    expect(ev.processedAt).toBeNull();
    expect(await processPendingProviderEvents(50, [a, b])).toBeGreaterThanOrEqual(1);
    expect((await db.orm.public.ProviderEvent.where({ id: ev.id }).first())?.processedAt).toBeTruthy();

    const hook = await createEndpoint(b, { url: "https://receptor.example.com/h", eventTypes: ["provider.event_received"] });
    if (!hook.ok) throw new Error("endpoint");
    const hits: string[] = [];
    await send(connB, evt("evt_to_n8n"));
    const result = await dispatchPending({ tenantIds: [a, b], resolveHost: async () => true, fetchImpl: (async (_u: unknown, init: RequestInit) => (hits.push(String(init.body)), new Response("ok"))) as unknown as typeof fetch });
    expect(result.succeeded).toBeGreaterThanOrEqual(1);
    expect(hits.some((h) => h.includes("evt_to_n8n"))).toBe(true);
  });
});
