import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { db } from "@/prisma/db";
import { createAdminDb } from "@/lib/admin/db";
import { dispatchPending } from "@/lib/events/dispatcher";
import { emitEvent } from "@/lib/events/outbox";
import { runOperation } from "@/lib/operations/engine";
import { OPERATIONS } from "@/lib/operations/registry";
import { confirmIntent, createIntent } from "@/lib/payments/intents-db";
import { deleteTenantCompletely } from "@/lib/tenant/deletion";
import { todayCO } from "@/lib/tax/tax";
import { presenceV2, refreshPresence } from "./pillars-db";

/** Presencia v2 contra Postgres real y DOS negocios: pilares con datos reales, foto diaria, tendencia y evento. */
const TEST_URL = process.env.TEST_DATABASE_URL;
const normalize = (url: string | undefined) => (url ?? "").replace(/\?.*$/, "");

describe.skipIf(!TEST_URL)("presencia v2 (integración)", () => {
  const suffix = Date.now().toString(36);
  let a = "";
  let b = "";

  beforeAll(async () => {
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) throw new Error("DATABASE_URL debe ser igual a TEST_DATABASE_URL.");
    const make = (name: string, slug: string) => createAdminDb().createTenant({ name, slug, vertical: "retail", modules: ["inventory", "payments"], tenantType: "COMPANY", ownerEmail: `${slug}@ejemplo.com` });
    a = String((await make("Tienda A", `pv-a-${suffix}`)).id);
    b = String((await make("Tienda B", `pv-b-${suffix}`)).id);
  });
  afterAll(async () => {
    for (const id of [a, b]) if (id) await deleteTenantCompletely(id);
    await db.close();
  });

  test("sin nada conectado: venta en línea en cero, reputación y atribución sin medir, cobertura 70 %", async () => {
    const r = await presenceV2(a);
    const by = Object.fromEntries(r.pillars.map((p) => [p.key, p.score]));
    expect(by).toMatchObject({ onlineSales: 0, reputation: null, attribution: null });
    expect(r.phase).toMatchObject({ coverage: 70, phase: "A" });
    expect(r.trend).toMatchObject({ direction: "flat", days: 0 });
  });

  test("publicar productos, conectar una pasarela y cobrar en línea sube el pilar de venta en línea", async () => {
    await db.orm.public.Product.create({ tenantId: a, name: "Camiseta", price: "50000.00", publishedOnline: true });
    expect((await presenceV2(a)).pillars.find((p) => p.key === "onlineSales")!.score).toBe(40);
    await db.orm.public.ExternalConnection.create({ tenantId: a, kind: "PAYMENT", provider: "sandbox", environment: "sandbox", status: "CONNECTED" });
    expect((await presenceV2(a)).pillars.find((p) => p.key === "onlineSales")!.score).toBe(70);
    const intent = await createIntent(a, { amount: 50_000, description: "Camiseta" }, "u");
    if (!intent.ok) throw new Error(intent.message);
    await confirmIntent(a, intent.reference, { kind: "MANUAL", evidence: "Transferencia 123456", userId: "u" });
    expect((await presenceV2(a)).pillars.find((p) => p.key === "onlineSales")!.score).toBe(100);
    // El otro negocio no se mueve.
    expect((await presenceV2(b)).pillars.find((p) => p.key === "onlineSales")!.score).toBe(0);
  });

  test("la foto de hoy es una sola por día (se actualiza) y la tendencia lee las anteriores", async () => {
    await refreshPresence(a);
    await refreshPresence(a);
    const today = todayCO();
    expect((await db.orm.public.PresenceSnapshot.where({ tenantId: a }).all()).filter((s) => s.day === today)).toHaveLength(1);
    // Sembrar una foto de hace 30 días más baja: la tendencia sube.
    const old = new Date(Date.parse(`${today}T00:00:00Z`) - 30 * 86_400_000).toISOString().slice(0, 10);
    await db.orm.public.PresenceSnapshot.create({ tenantId: a, day: old, score: 10, coverage: 70, phase: "A", pillars: [] as never });
    const r = await presenceV2(a);
    expect(r.trend.direction).toBe("up");
    expect(r.trend.delta).toBeGreaterThan(10);
    expect(r.trend.series.length).toBeGreaterThanOrEqual(2);
  });

  test("se recalcula por eventos: el despachador refresca la presencia del negocio con una venta", async () => {
    await db.orm.public.PresenceSnapshot.where({ tenantId: b }).deleteAll();
    await db.transaction((tx) => emitEvent(tx, b, { type: "sale.completed", resourceType: "payment", resourceId: "p", payload: {} }));
    await dispatchPending({ tenantIds: [b] });
    expect((await db.orm.public.PresenceSnapshot.where({ tenantId: b }).all()).length).toBe(1);
  });

  test("get por la API/MCP: misma información, solo del negocio de la llave", async () => {
    const op = OPERATIONS.find((o) => o.id === "presence.get")!;
    expect(op.risk).toBe("read");
    const out = (await runOperation(OPERATIONS, { tenantId: a, role: "OWNER", activeModules: ["inventory", "payments"], origin: "api", actorId: "k" } as never, "presence.get", {})) as { score: number; phase: string; pillars: { key: string }[] };
    expect(out.pillars.map((p) => p.key)).toEqual(["site", "onlineSales", "reputation", "attribution", "basics"]);
    expect(out.score).toBeGreaterThan(0);
  });
});
