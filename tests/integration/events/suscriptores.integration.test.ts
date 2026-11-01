/**
 * Suscriptores de dominio del despachador de eventos (contrato `EventSubscriber`).
 * El despachador es de Core y no conoce ningún dominio: los suscriptores llegan como parámetro.
 */
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import { db } from "@/prisma/db";
import { dispatchPending, type EventSubscriber } from "@/lib/events/dispatcher";
import { emitEvent, type EventType } from "@/lib/events/outbox";
import { presenceSubscriber } from "@/lib/presence/subscribers";

const TEST_URL = process.env.TEST_DATABASE_URL;
const normalize = (url: string | undefined) => (url ?? "").replace(/\?.*$/, "");

describe("presenceSubscriber (el suscriptor real de presencia)", () => {
  test.each([
    ["sale.completed", true],
    ["sale.returned", true],
    ["provider.event_received", true],
    ["order.paid", false],
    ["presence.phase_changed", false],
    ["review.low", false],
  ])("%s → %s", (type, esperado) => {
    expect(presenceSubscriber.matches(type)).toBe(esperado);
  });
});

describe.skipIf(!TEST_URL)("despachador con suscriptores (integración)", () => {
  const suffix = Date.now().toString(36);
  const t: string[] = [];

  const emit = (tenantId: string, type: EventType) => db.transaction((tx) => emitEvent(tx, tenantId, { type, resourceType: "x", resourceId: "1", payload: {} }));
  const spy = (name: string, prefix: string) => {
    const handle = vi.fn(async (_tenantId: string) => {});
    const subscriber: EventSubscriber = { name, matches: (type) => type.startsWith(prefix), handle };
    return { subscriber, handle };
  };
  const run = (subscribers: EventSubscriber[]) => dispatchPending({ subscribers, tenantIds: t, resolveHost: async () => true });

  beforeAll(async () => {
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) throw new Error("DATABASE_URL debe ser igual a TEST_DATABASE_URL.");
    for (const n of ["a", "b", "c"]) t.push((await db.orm.public.Tenant.create({ name: `Suscriptores ${n}`, slug: `subs-${n}-${suffix}`, vertical: "general" })).id);
  });
  afterAll(async () => {
    for (const id of t) await db.orm.public.Tenant.where({ id }).delete();
  });

  test("llama una vez por negocio aunque haya varios eventos, y solo a los negocios con eventos que le interesan", async () => {
    const ventas = spy("ventas", "sale.");
    await emit(t[0], "sale.completed");
    await emit(t[0], "sale.returned"); // dos eventos del mismo negocio → una sola llamada
    await emit(t[1], "sale.completed");
    await emit(t[2], "order.paid"); //  no le interesa
    await run([ventas.subscriber]);
    expect(ventas.handle).toHaveBeenCalledTimes(2);
    expect(ventas.handle.mock.calls.map((c) => c[0]).sort()).toEqual([t[0], t[1]].sort());
  });

  test("cada suscriptor recibe solo sus eventos, de forma independiente", async () => {
    const ventas = spy("ventas", "sale.");
    const pedidos = spy("pedidos", "order.");
    await emit(t[0], "sale.completed");
    await emit(t[2], "order.paid");
    await run([ventas.subscriber, pedidos.subscriber]);
    expect(ventas.handle.mock.calls.map((c) => c[0])).toEqual([t[0]]);
    expect(pedidos.handle.mock.calls.map((c) => c[0])).toEqual([t[2]]);
  });

  test("un suscriptor que falla se registra y no detiene el reparto ni a los demás", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const roto: EventSubscriber = { name: "roto", matches: () => true, handle: vi.fn(async () => { throw new Error("falló a propósito"); }) };
    const sano = spy("sano", "sale.");
    await emit(t[0], "sale.completed");
    const result = await run([roto, sano.subscriber]);
    expect(sano.handle).toHaveBeenCalledWith(t[0]);
    expect(result.fannedOut).toBeGreaterThanOrEqual(0);
    expect(error).toHaveBeenCalledWith(expect.stringContaining("[eventos:roto]"), expect.any(Error));
    error.mockRestore();
    // El evento quedó procesado a pesar del fallo del suscriptor.
    expect(await db.orm.public.OutboxEvent.where({ tenantId: t[0] }).where((e) => e.processedAt.isNull()).all()).toHaveLength(0);
  });

  test("los eventos ya procesados no vuelven a disparar a los suscriptores en la corrida siguiente", async () => {
    const ventas = spy("ventas", "sale.");
    await emit(t[1], "sale.completed");
    await run([ventas.subscriber]);
    await run([ventas.subscriber]);
    expect(ventas.handle).toHaveBeenCalledTimes(1);
  });

  test("sin suscriptores se reparten los eventos y no se llama a nadie", async () => {
    await emit(t[0], "sale.completed");
    await run([]);
    expect(await db.orm.public.OutboxEvent.where({ tenantId: t[0] }).where((e) => e.processedAt.isNull()).all()).toHaveLength(0);
  });
});
