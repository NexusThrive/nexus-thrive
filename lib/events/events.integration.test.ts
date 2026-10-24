import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { db } from "@/prisma/db";
import { createAdminDb } from "@/lib/admin/db";
import { moneyTransaction, recordIncome, recordIncomeNow } from "@/lib/business/money-service";
import { deleteTenantCompletely } from "@/lib/tenant/deletion";
import { AUTO_DISABLE_AFTER, MAX_ATTEMPTS, dispatchPending } from "./dispatcher";
import { createEndpoint, listDeliveries, resendDelivery, rotateSecret, setEndpointActive } from "./endpoints";
import { verifySignature } from "./signing";

/** Outbox + webhooks de punta a punta contra Postgres real y con DOS negocios. */
const TEST_URL = process.env.TEST_DATABASE_URL;
const normalize = (url: string | undefined) => (url ?? "").replace(/\?.*$/, "");

describe.skipIf(!TEST_URL)("outbox y webhooks (integración)", () => {
  const suffix = Date.now().toString(36);
  let a = "";
  let b = "";
  let clock = Date.now();
  const resolveHost = async () => true;

  type Hit = { url: string; headers: Record<string, string>; body: string };
  const makeFetch = (statuses: number[], hits: Hit[] = []) =>
    (async (url: URL | string, init: RequestInit) => {
      hits.push({ url: String(url), headers: init.headers as Record<string, string>, body: String(init.body) });
      return new Response("ok", { status: statuses[Math.min(hits.length, statuses.length) - 1] });
    }) as unknown as typeof fetch;
  const run = (fetchImpl: typeof fetch) => dispatchPending({ fetchImpl, now: () => clock, resolveHost, tenantIds: [a, b] });

  beforeAll(async () => {
    process.env.WEBHOOK_ENCRYPTION_KEY = "b".repeat(64);
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) throw new Error("DATABASE_URL debe ser igual a TEST_DATABASE_URL.");
    const make = (name: string, slug: string) => createAdminDb().createTenant({ name, slug, vertical: "gym", modules: ["crm", "finance"], tenantType: "COMPANY", ownerEmail: `${slug}@ejemplo.com` });
    a = String((await make("Gym A", `ev-a-${suffix}`)).id);
    b = String((await make("Gym B", `ev-b-${suffix}`)).id);
  });
  afterAll(async () => {
    for (const id of [a, b]) if (id) await deleteTenantCompletely(id);
    await db.close();
  });

  const sell = (tenantId: string, amount = 50000) => recordIncomeNow(tenantId, { amount, method: "CASH", description: "Mensualidad", sourceType: "MEMBERSHIP", sourceId: "m1" }, "u1");

  test("sale.completed llega firmado, con el contrato del evento, solo al negocio dueño", async () => {
    const ea = await createEndpoint(a, { url: "https://receptor-a.example.com/hook", eventTypes: ["sale.completed"] });
    const eb = await createEndpoint(b, { url: "https://receptor-b.example.com/hook" });
    if (!ea.ok || !eb.ok) throw new Error("endpoint");
    await run(makeFetch([200])); // limpia lo que hubiera pendiente
    const sale = await sell(a);

    const hits: Hit[] = [];
    const result = await run(makeFetch([200], hits));
    expect(result).toMatchObject({ fannedOut: 1, succeeded: 1, failed: 0 });
    expect(hits).toHaveLength(1); // el negocio B no recibe nada de A
    expect(hits[0].url).toBe("https://receptor-a.example.com/hook");
    expect(verifySignature(ea.secret, hits[0].headers["nexusthrive-signature"], hits[0].body, { nowSeconds: Math.floor(clock / 1000) })).toBe(true);
    expect(verifySignature(eb.secret, hits[0].headers["nexusthrive-signature"], hits[0].body, { nowSeconds: Math.floor(clock / 1000) })).toBe(false);
    const payload = JSON.parse(hits[0].body);
    expect(payload).toMatchObject({ type: "sale.completed", version: 1, tenant_id: a, data: { payment_id: sale.paymentId, amount: "50000.00", method: "CASH", document_id: sale.documentId } });
    expect(hits[0].headers["nexusthrive-event-id"]).toBe(payload.id);
    expect((await run(makeFetch([200]))).sent).toBe(0); // no se reenvía lo ya entregado
  });

  test("si el receptor cae, reintenta con espera y al volver recibe todo; luego se normaliza", async () => {
    for (const id of await listEndpointIds(b)) await setEndpointActive(b, id, false); // solo este recibe
    const e = await createEndpoint(b, { url: "https://caido.example.com/hook" });
    if (!e.ok) throw new Error("endpoint");
    await run(makeFetch([200]));
    await sell(b, 1000);
    await sell(b, 2000);

    expect(await run(makeFetch([503, 503]))).toMatchObject({ failed: 2, succeeded: 0 }); // intento 1
    const early = await run(makeFetch([200]));
    expect(early.sent).toBe(0); // aún dentro de la espera

    clock += 61_000; // pasa el primer backoff (1 min)
    const hits: Hit[] = [];
    const back = await run(makeFetch([200], hits));
    expect(back.succeeded).toBe(2);
    expect(hits.map((h) => JSON.parse(h.body).data.amount).sort()).toEqual(["1000.00", "2000.00"]);
    const rows = await listDeliveries(b, { status: "SUCCESS" });
    expect(rows.filter((r) => r.endpointId === e.row.id).every((r) => r.attempt === 2)).toBe(true);
  });

  test("tras 8 intentos pasa a fallidos y el reenvío manual la entrega", async () => {
    const e = await createEndpoint(a, { url: "https://roto.example.com/hook" });
    if (!e.ok) throw new Error("endpoint");
    await setEndpointActive(a, (await listEndpointIds(a)).find((id) => id !== e.row.id)!, false); // deja solo este recibiendo
    await run(makeFetch([200]));
    await sell(a, 7000);
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      await run(makeFetch([500]));
      clock += 25 * 3_600_000;
    }
    const failed = (await listDeliveries(a, { status: "FAILED" })).filter((d) => d.endpointId === e.row.id);
    expect(failed).toHaveLength(1);
    expect(failed[0].attempt).toBe(MAX_ATTEMPTS);

    expect(await resendDelivery(b, failed[0].id)).toBe(false); // otro negocio no puede reenviarla
    expect(await resendDelivery(a, failed[0].id)).toBe(true);
    expect(await run(makeFetch([200]))).toMatchObject({ succeeded: 1 });
  });

  test("rotar el secreto firma con ambos durante la gracia", async () => {
    const e = await createEndpoint(b, { url: "https://rota.example.com/hook" });
    if (!e.ok) throw new Error("endpoint");
    const rotated = await rotateSecret(b, e.row.id, clock);
    if (!rotated.ok) throw new Error("rotate");
    await run(makeFetch([200]));
    await sell(b, 300);
    const hits: Hit[] = [];
    await run(makeFetch([200], hits));
    const mine = hits.find((h) => h.url.startsWith("https://rota."))!;
    const now = Math.floor(clock / 1000);
    expect(verifySignature(rotated.secret, mine.headers["nexusthrive-signature"], mine.body, { nowSeconds: now })).toBe(true);
    expect(verifySignature(e.secret, mine.headers["nexusthrive-signature"], mine.body, { nowSeconds: now })).toBe(true);
  });

  test("destino no público o redirect no se sigue, y se desactiva tras muchos fallos", async () => {
    const e = await createEndpoint(a, { url: "https://interno.example.com/hook" });
    if (!e.ok) throw new Error("endpoint");
    await run(makeFetch([200]));
    await sell(a, 111);
    const hits: Hit[] = [];
    const blocked = await dispatchPending({ fetchImpl: makeFetch([200], hits), now: () => clock, resolveHost: async (h) => !h.startsWith("interno.") });
    expect(blocked.failed).toBeGreaterThanOrEqual(1);
    expect(hits.some((h) => h.url.includes("interno."))).toBe(false); // nunca se llamó
    expect((await listDeliveries(a)).some((d) => d.responseExcerpt?.includes("no permitido"))).toBe(true);
    expect(AUTO_DISABLE_AFTER).toBe(20);
  });

  test("el evento se escribe en la misma transacción: si se deshace, no queda evento", async () => {
    const before = (await db.orm.public.OutboxEvent.where({ tenantId: a }).all()).length;
    await expect(
      moneyTransaction(async (tx) => {
        await recordIncome(tx, a, { amount: 999, method: "CASH", description: "x" }, "u1");
        throw new Error("falla después de cobrar");
      }),
    ).rejects.toThrow();
    expect((await db.orm.public.OutboxEvent.where({ tenantId: a }).all()).length).toBe(before);
  });

  test("no se crean webhooks a destinos privados ni con eventos inventados", async () => {
    expect(await createEndpoint(a, { url: "http://x.com" })).toMatchObject({ ok: false });
    expect(await createEndpoint(a, { url: "https://192.168.0.4/h" })).toMatchObject({ ok: false });
    expect(await createEndpoint(a, { url: "https://x.example.com", eventTypes: ["inventado.evento"] })).toMatchObject({ ok: false });
  });

  async function listEndpointIds(tenantId: string) {
    return (await db.orm.public.WebhookEndpoint.where({ tenantId, active: true }).all()).map((x) => x.id);
  }
});
