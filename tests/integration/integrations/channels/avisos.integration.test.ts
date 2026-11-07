import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from "vitest";
import { db } from "@/prisma/db";
import { createAdminDb } from "@/lib/platform/admin/db";
import { deleteTenantCompletely } from "@/lib/core/tenancy/deletion";
import { connectProvider } from "@/lib/integrations/providers/connections";
import { collectNotices, ensureDefaultTemplates, listNotices, listTemplates, noticeSubscriber, processNotices, queueNotice, saveTemplate, setMetaStatus, setOptOut } from "@/lib/integrations/channels/notices-db";
import { ingestInbound } from "@/lib/integrations/channels/conversations-db";
import { emitFinanceEvent } from "@/lib/business/sales/money-service";

/** HU-whatsapp-negocio-02: avisos que cumplen las reglas de Meta. Meta se simula (sin credenciales reales). */
const TEST_URL = process.env.TEST_DATABASE_URL;
const normalize = (url: string | undefined) => (url ?? "").replace(/\?.*$/, "");

describe.skipIf(!TEST_URL)("plantillas y avisos de WhatsApp (integración, Meta simulado)", () => {
  const suffix = Date.now().toString(36);
  let a = "";
  let b = "";
  let connA = "";
  let camila = "";
  let andres = "";
  const creds = { phoneNumberId: "200000000001", accessToken: "token-de-acceso-largo-largo-aaa", appSecret: "secreto-app-aviso-123", verifyToken: "verifica-aviso-1" };
  const order = (customerId: string, code: string) => db.orm.public.StoreOrder.create({ tenantId: a, number: Math.floor(Math.random() * 1e6), customerId, customerName: "X", phone: "3000000000", total: "140000.00", ...(code ? {} : {}) });
  const emit = async (type: "order.paid" | "order.created" | "cart.abandoned", customerId: string) => {
    const o = await order(customerId, "");
    await db.transaction((tx) => emitFinanceEvent(tx, a, { type, resourceType: "store_order", resourceId: o.id, payload: { order_id: o.id, code: `T-${String(o.number).padStart(4, "0")}`, total: 140000 } }));
    return o;
  };

  beforeAll(async () => {
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) throw new Error("DATABASE_URL debe ser igual a TEST_DATABASE_URL.");
    process.env.WEBHOOK_ENCRYPTION_KEY = "d".repeat(64);
    let n = 0;
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ verified_name: "Mi negocio", messages: [{ id: `wamid.AVISO.${++n}` }] }), { status: 200 })));
    const admin = createAdminDb();
    a = String((await admin.createTenant({ name: "Avisos A", slug: `av-${suffix}`, vertical: "retail", modules: ["crm", "whatsapp"], tenantType: "COMPANY", ownerEmail: `av-${suffix}@ejemplo.com` })).id);
    b = String((await admin.createTenant({ name: "Avisos B", slug: `aw-${suffix}`, vertical: "retail", modules: ["crm"], tenantType: "COMPANY", ownerEmail: `aw-${suffix}@ejemplo.com` })).id);
    const conn = await connectProvider(a, { provider: "whatsapp_cloud", environment: "production", credentials: creds });
    if (!conn.ok) throw new Error(conn.message);
    connA = conn.row.id;
    camila = (await db.orm.public.Customer.create({ tenantId: a, name: "Camila Torres", phone: "3001112233", phoneNorm: "573001112233", consentAt: Temporal.Instant.fromEpochMilliseconds(Date.now()) })).id;
    andres = (await db.orm.public.Customer.create({ tenantId: a, name: "Andrés Gómez", phone: "3105550000", phoneNorm: "573105550000" })).id;
  });
  afterEach(() => vi.mocked(fetch).mockClear());
  afterAll(async () => {
    vi.unstubAllGlobals();
    for (const id of [a, b]) if (id) await deleteTenantCompletely(id);
    await db.close();
  });

  test("las plantillas de partida se crean una vez y editar el texto invalida la aprobación de Meta", async () => {
    await ensureDefaultTemplates(a);
    await ensureDefaultTemplates(a);
    const list = await listTemplates(a);
    expect(list.map((t) => t.key)).toEqual(["carrito_abandonado", "pedido_confirmado", "pedido_creado", "pedido_entregado", "pedido_enviado", "pedido_listo", "pedido_pagado"]);
    const paid = list.find((t) => t.key === "pedido_pagado")!;
    expect(await setMetaStatus(a, paid.id, "APPROVED", "")).toMatchObject({ ok: false });
    expect(await setMetaStatus(a, paid.id, "APPROVED", "pedido_pagado_v1")).toEqual({ ok: true });
    expect((await listTemplates(a)).find((t) => t.key === "pedido_pagado")).toMatchObject({ metaStatus: "APPROVED", metaName: "pedido_pagado_v1" });
    expect(await saveTemplate(a, { key: "pedido_pagado", title: paid.title, body: paid.body, event: "order.paid" })).toEqual({ ok: true });
    expect((await listTemplates(a)).find((t) => t.key === "pedido_pagado")!.metaStatus).toBe("APPROVED");
    expect(await saveTemplate(a, { key: "pedido_pagado", title: paid.title, body: "Hola {{nombre}}, gracias por pagar {{codigo}} — {{negocio}}", event: "order.paid" })).toEqual({ ok: true });
    expect((await listTemplates(a)).find((t) => t.key === "pedido_pagado")).toMatchObject({ metaStatus: "NONE", metaName: "pedido_pagado_v1" });
    await setMetaStatus(a, paid.id, "APPROVED", "pedido_pagado_v2");
    expect(await saveTemplate(a, { key: "x", title: "ab", body: "hola" })).toMatchObject({ ok: false });
    expect(await listTemplates(b)).toHaveLength(7);
    expect(await setMetaStatus(b, paid.id, "APPROVED", "ajena_v1")).toMatchObject({ ok: false });
  });

  test("un hecho avisa una sola vez; la ventana cerrada con plantilla aprobada sale por plantilla", async () => {
    await emit("order.paid", camila);
    expect(await collectNotices(a)).toBe(1);
    expect(await collectNotices(a)).toBe(0);
    const r = await processNotices(a);
    expect(r).toMatchObject({ sent: 1, manual: 0 });
    const call = vi.mocked(fetch).mock.calls.at(-1)!;
    const sent = JSON.parse(String((call[1] as RequestInit).body));
    expect(sent).toMatchObject({ to: "573001112233", type: "template", template: { name: "pedido_pagado_v2", language: { code: "es" } } });
    expect(sent.template.components[0].parameters.map((p: { text: string }) => p.text)).toEqual(["Camila", expect.stringMatching(/^T-/), "Avisos A"]);
    expect((await listNotices(a))[0]).toMatchObject({ status: "SENT", customerName: "Camila Torres" });
    expect(await processNotices(a)).toEqual({ sent: 0, manual: 0, blocked: 0, failed: 0 });
  });

  test("los cambios de cumplimiento avisan al cliente solo en los pasos que le importan", async () => {
    const o = await order(camila, "");
    const status = (to: string, from: string) => db.transaction((tx) => emitFinanceEvent(tx, a, { type: "order.status_changed", resourceType: "store_order", resourceId: o.id, payload: { order_id: o.id, code: "T-0099", total: 1000, from, to } }));
    await status("IN_PRODUCTION", "CONFIRMED"); // no se le avisa
    await status("CANCELED", "RECEIVED"); // tampoco
    await status("READY", "IN_PRODUCTION");
    await status("SHIPPED", "READY");
    const before = (await listNotices(a)).length;
    expect(await collectNotices(a)).toBe(2);
    const events = (await listNotices(a)).slice(0, (await listNotices(a)).length - before).map((n) => n.event);
    expect(events).toEqual(expect.arrayContaining(["order.ready", "order.shipped"]));
    expect(events).not.toContain("order.status_changed");
    await processNotices(a); // deja la cola vacía para las pruebas siguientes
  });

  test("sin plantilla aprobada, el aviso queda listo para enviar con un toque", async () => {
    await emit("order.created", camila);
    await collectNotices(a);
    expect(await processNotices(a)).toMatchObject({ sent: 0, manual: 1 });
    const notice = (await listNotices(a)).find((n) => n.event === "order.created")!;
    expect(notice).toMatchObject({ status: "MANUAL", reason: expect.stringContaining("plantilla aprobada") });
    expect(notice.link).toContain("https://wa.me/573001112233?text=");
    expect(notice.text).toContain("Camila");
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  test("dentro de la ventana de 24 h sale texto libre, aunque no haya plantilla aprobada", async () => {
    await ingestInbound(a, connA, { phoneNumberId: creds.phoneNumberId, handle: "573001112233", name: "Camila Torres", body: "Hola", externalId: `wamid.IN.${suffix}`, at: Date.now() });
    await emit("cart.abandoned", camila);
    await collectNotices(a);
    expect(await processNotices(a)).toMatchObject({ sent: 1 });
    expect(JSON.parse(String((vi.mocked(fetch).mock.calls.at(-1)![1] as RequestInit).body))).toMatchObject({ type: "text" });
  });

  test("sin consentimiento nunca sale solo; escribir BAJA detiene los envíos y devolver el consentimiento los reabre", async () => {
    await emit("order.paid", andres);
    await collectNotices(a);
    expect(await processNotices(a)).toMatchObject({ manual: 1 });
    expect((await listNotices(a)).find((n) => n.customerId === andres)).toMatchObject({ status: "MANUAL", reason: expect.stringContaining("consentimiento") });

    // Camila escribe BAJA: el siguiente aviso se bloquea, incluso dentro de la ventana.
    await ingestInbound(a, connA, { phoneNumberId: creds.phoneNumberId, handle: "573001112233", name: null, body: "BAJA", externalId: `wamid.BAJA.${suffix}`, at: Date.now() });
    expect((await db.orm.public.Customer.where({ tenantId: a, id: camila }).first())?.optOutAt).toBeTruthy();
    await emit("order.paid", camila);
    await collectNotices(a);
    expect(await processNotices(a)).toMatchObject({ blocked: 1, sent: 0 });
    expect((await listNotices(a)).find((n) => n.status === "BLOCKED")).toMatchObject({ customerName: "Camila Torres", link: null });
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
    expect(await setOptOut(a, camila, false)).toEqual({ ok: true });
    expect(await setOptOut(b, camila, true)).toMatchObject({ ok: false });
  });

  test("Meta que falla deja el aviso listo con un toque; un aviso sin contacto o con datos faltantes falla con motivo", async () => {
    await emit("order.created", camila);
    await collectNotices(a);
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ error: { message: "Token vencido" } }), { status: 401 }));
    const r = await processNotices(a);
    expect(r).toMatchObject({ sent: 0, manual: 1 });
    expect((await listNotices(a))[0]).toMatchObject({ status: "MANUAL", reason: expect.stringContaining("Token vencido") });

    await db.transaction((tx) => queueNotice(tx, a, "order.paid", `sin-codigo-${suffix}`, camila, {}));
    expect(await processNotices(a)).toMatchObject({ failed: 1 });
    expect((await listNotices(a))[0]).toMatchObject({ status: "FAILED", reason: expect.stringContaining("faltan datos") });
    const noPhone = (await db.orm.public.Customer.create({ tenantId: a, name: "Sin Teléfono" })).id;
    await db.transaction((tx) => queueNotice(tx, a, "order.paid", `sin-tel-${suffix}`, noPhone, { codigo: "T-1", total: "$ 1", negocio: "A" }));
    expect(await processNotices(a)).toMatchObject({ failed: 1 });
  });

  test("el suscriptor del despachador procesa los hechos y los avisos no cruzan de negocio", async () => {
    expect(noticeSubscriber.matches("order.paid")).toBe(true);
    expect(noticeSubscriber.matches("sale.completed")).toBe(false);
    await emit("order.created", camila);
    await noticeSubscriber.handle(a);
    expect((await listNotices(a)).length).toBeGreaterThan(0);
    expect(await listNotices(b)).toEqual([]);
    await noticeSubscriber.handle(b);
    expect(await listNotices(b)).toEqual([]);
  });
});
