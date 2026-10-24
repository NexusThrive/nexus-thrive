import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { db } from "@/prisma/db";
import { createAdminDb } from "@/lib/admin/db";
import { deleteTenantCompletely } from "@/lib/tenant/deletion";
import { runOperation } from "@/lib/operations/engine";
import { OPERATIONS } from "@/lib/operations/registry";
import { emitEvent } from "./outbox";
import { listEvents } from "./feed";

/** El respaldo de los webhooks: ponerse al día leyendo el outbox, sin perder ni repetir. */
const TEST_URL = process.env.TEST_DATABASE_URL;
const normalize = (url: string | undefined) => (url ?? "").replace(/\?.*$/, "");

describe.skipIf(!TEST_URL)("feed de eventos (integración)", () => {
  const suffix = Date.now().toString(36);
  let a = "";
  let b = "";

  beforeAll(async () => {
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) throw new Error("DATABASE_URL debe ser igual a TEST_DATABASE_URL.");
    const make = (name: string, slug: string) => createAdminDb().createTenant({ name, slug, vertical: "gym", modules: ["crm"], tenantType: "COMPANY", ownerEmail: `${slug}@ejemplo.com` });
    a = String((await make("Gym A", `fd-a-${suffix}`)).id);
    b = String((await make("Gym B", `fd-b-${suffix}`)).id);
    // 7 eventos de A dentro de UNA transacción (misma marca de tiempo) y 2 de B.
    await db.transaction(async (tx) => {
      for (let i = 1; i <= 7; i++) await emitEvent(tx, a, { type: "sale.completed", payload: { n: i } });
      await emitEvent(tx, b, { type: "sale.completed", payload: { n: 99 } });
      await emitEvent(tx, b, { type: "provider.event_received", payload: { n: 98 } });
    });
  });
  afterAll(async () => {
    for (const id of [a, b]) if (id) await deleteTenantCompletely(id);
    await db.close();
  });

  test("paginar con el cursor trae todo una vez, aunque compartan la misma fecha", async () => {
    const seen: string[] = [];
    let after: string | undefined;
    for (let page = 0; page < 10; page++) {
      const feed = await listEvents(a, { after, limit: 3 });
      if ("error" in feed) throw new Error(feed.error);
      if (!feed.events.length) break;
      seen.push(...feed.events.map((e) => e.id));
      after = feed.next ?? undefined;
    }
    expect(seen).toHaveLength(7);
    expect(new Set(seen).size).toBe(7);
    const all = await listEvents(a, { limit: 100 });
    if ("error" in all) throw new Error(all.error);
    expect(seen.slice().sort()).toEqual(all.events.map((e) => e.id).sort());
  });

  test("sin novedades devuelve vacío y conserva el cursor", async () => {
    const all = await listEvents(a, { limit: 100 });
    if ("error" in all) throw new Error();
    const last = all.events.at(-1)!.id;
    expect(await listEvents(a, { after: last })).toEqual({ events: [], next: last });
  });

  test("cada negocio ve solo lo suyo y no puede usar un cursor ajeno", async () => {
    const fb = await listEvents(b, { limit: 100 });
    if ("error" in fb) throw new Error();
    expect(fb.events.map((e) => (e.data as { n: number }).n).sort()).toEqual([98, 99]);
    const fa = await listEvents(a, { limit: 100 });
    if ("error" in fa) throw new Error();
    expect(await listEvents(b, { after: fa.events[0].id })).toMatchObject({ error: expect.stringContaining("no existe") });
  });

  test("filtra por tipo y valida la fecha", async () => {
    const f = await listEvents(b, { type: "provider.event_received" });
    if ("error" in f) throw new Error();
    expect(f.events).toHaveLength(1);
    expect(await listEvents(a, { since: "ayer" })).toMatchObject({ error: expect.any(String) });
  });

  test("la operación exige permiso de gestión del negocio", async () => {
    const ctx = (role: string) => ({ tenantId: a, role, activeModules: ["crm"], actor: { type: "API_KEY" as const, id: "k" } });
    expect(await runOperation(OPERATIONS, ctx("OWNER"), "events.list", { limit: 2 })).toMatchObject({ events: expect.any(Array) });
    await expect(runOperation(OPERATIONS, ctx("ADVISOR"), "events.list", {})).rejects.toMatchObject({ code: "forbidden" });
  });
});
