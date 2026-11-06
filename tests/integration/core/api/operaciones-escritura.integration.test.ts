import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { db } from "@/prisma/db";
import { createAdminDb } from "@/lib/platform/admin/db";
import { deleteTenantCompletely } from "@/lib/core/tenancy/deletion";
import { handleApi, type ApiDeps } from "@/lib/core/api/handler";
import { idempotencyStore } from "@/lib/core/api/idempotency-db";
import { authenticateApiKey, createApiKey } from "@/lib/core/api/keys";
import { resetRateLimits } from "@/lib/core/api/rate-limit";
import { tenantWithModules } from "@/lib/core/tenancy/membership";
import { OPERATIONS } from "@/lib/runtime/operations";

/** HU-operaciones-01: operaciones de escritura por API, con idempotencia, permisos y aislamiento entre negocios. */
const TEST_URL = process.env.TEST_DATABASE_URL;
const normalize = (url: string | undefined) => (url ?? "").replace(/\?.*$/, "");

type Json = { data?: Record<string, unknown>; code?: string };

describe.skipIf(!TEST_URL)("operaciones de escritura (integración)", () => {
  const suffix = Date.now().toString(36);
  let a = "";
  let b = "";
  let keyA = "";
  let keyAConfirm = "";
  let keyB = "";
  let keyBConfirm = "";
  let keyAdvisor = "";

  const deps: ApiDeps = {
    operations: OPERATIONS,
    authenticate: (header) => authenticateApiKey(header),
    loadTenant: async (tenantId) => {
      const t = await tenantWithModules(tenantId);
      return t ? { active: t.active, modules: t.modules.filter((m) => m.active).map((m) => String(m.moduleName)) } : null;
    },
    log: () => undefined,
    idempotency: idempotencyStore,
  };
  let seq = 0;
  const post = async (secret: string, path: string, body: unknown, idem: string | null = `idem-${suffix}-${++seq}-aaaa`) => {
    resetRateLimits();
    const res = await handleApi(new Request(`http://localhost/api/v1${path}`, { method: "POST", body: JSON.stringify(body), headers: { authorization: `Bearer ${secret}`, ...(idem ? { "idempotency-key": idem } : {}) } }), deps);
    return { status: res.status, json: (await res.json()) as Json, replayed: res.headers.get("idempotent-replayed") === "true" };
  };

  beforeAll(async () => {
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) throw new Error("DATABASE_URL debe ser igual a TEST_DATABASE_URL.");
    process.env.WEBHOOK_ENCRYPTION_KEY = "d".repeat(64);
    const make = (name: string, slug: string) =>
      createAdminDb().createTenant({ name, slug, vertical: "retail", modules: ["crm", "website", "online_payments"], tenantType: "COMPANY", ownerEmail: `${slug}@ejemplo.com` });
    a = String((await make("Escritura A", `ea-${suffix}`)).id);
    b = String((await make("Escritura B", `eb-${suffix}`)).id);
    const mk = async (tenant: string, scopes: string[], role = "OWNER") => (await createApiKey(tenant, { name: "n8n", environment: "live", scopes, createdById: "u1", createdByRole: role })).secret;
    keyA = await mk(a, ["*"]);
    keyAConfirm = await mk(a, ["payments.confirm", "payments.create_intent"]);
    keyB = await mk(b, ["*"]);
    keyBConfirm = await mk(b, ["payments.confirm"]);
    keyAdvisor = await mk(a, ["*"], "ADVISOR");
  });
  afterAll(async () => {
    for (const id of [a, b]) if (id) await deleteTenantCompletely(id);
    await db.close();
  });

  test("customers.upsert crea, luego actualiza al mismo cliente por correo y no cruza negocios", async () => {
    const created = await post(keyA, "/customers", { name: "Camila Torres", email: "Camila@Ejemplo.com", phone: "3001112233" });
    expect(created.status).toBe(200);
    expect(created.json.data).toMatchObject({ created: true });
    const id = String(created.json.data!.id);
    const again = await post(keyA, "/customers", { email: "camila@ejemplo.com", city: "Cartagena" });
    expect(again.json.data).toEqual({ id, created: false });
    expect(await db.orm.public.Customer.where({ tenantId: a, email: "camila@ejemplo.com" }).all()).toHaveLength(1);
    expect((await db.orm.public.Customer.where({ tenantId: a, id }).first())?.city).toBe("Cartagena");
    const other = await post(keyB, "/customers", { name: "Camila Torres", email: "camila@ejemplo.com" });
    expect(other.json.data).toMatchObject({ created: true });
    expect(String(other.json.data!.id)).not.toBe(id);
    expect((await post(keyA, "/customers", { email: "nuevo@ejemplo.com" })).status).toBe(422);
  });

  test("sin Idempotency-Key se rechaza; con la misma llave se ejecuta una vez", async () => {
    expect((await post(keyA, "/customers", { name: "Sin Llave" }, null)).json.code).toBe("idempotency_key_required");
    const key = `repetida-${suffix}-0001`;
    const first = await post(keyA, "/customers", { name: "Una Vez", email: "unavez@ejemplo.com" }, key);
    const second = await post(keyA, "/customers", { name: "Una Vez", email: "unavez@ejemplo.com" }, key);
    expect(second.replayed).toBe(true);
    expect(second.json).toEqual(first.json);
    expect(await db.orm.public.Customer.where({ tenantId: a, email: "unavez@ejemplo.com" }).all()).toHaveLength(1);
    expect((await post(keyA, "/customers", { name: "Otro Nombre", email: "otro@ejemplo.com" }, key)).json.code).toBe("idempotency_conflict");
  });

  test("orders.update_status cancela un pedido propio, no uno ajeno ni uno ya cerrado", async () => {
    const order = await db.orm.public.StoreOrder.create({ tenantId: a, number: 1, customerName: "Cliente", phone: "3000000000", total: "10000.00" });
    const foreign = await post(keyB, `/orders/${order.id}/status`, { status: "CANCELED" });
    expect(foreign.status).toBe(404);
    const ok = await post(keyA, `/orders/${order.id}/status`, { status: "CANCELED" });
    expect(ok.json.data).toEqual({ id: order.id, status: "CANCELED" });
    expect((await db.orm.public.StoreOrder.where({ tenantId: a, id: order.id }).first())?.status).toBe("CANCELED");
    const closed = await post(keyA, `/orders/${order.id}/status`, { status: "CANCELED" });
    expect(closed.status).toBe(422);
    expect(closed.json.code).toBe("rule_violation");
    expect((await post(keyA, `/orders/${order.id}/status`, { status: "PAID" })).status).toBe(422);
  });

  test("payments.create_intent crea un cobro manual, una sola vez por llave, y el rol sin dinero no puede", async () => {
    const key = `intent-${suffix}-0001`;
    const first = await post(keyA, "/payments/intents", { amount: 80_000, description: "Pedido de camisetas" }, key);
    const second = await post(keyA, "/payments/intents", { amount: 80_000, description: "Pedido de camisetas" }, key);
    expect(first.status).toBe(200);
    expect(first.json.data).toMatchObject({ status: "PENDING" });
    expect(String(first.json.data!.payUrl)).toContain(`/pay/${first.json.data!.reference}`);
    expect(second.json).toEqual(first.json);
    const rows = await db.orm.public.PaymentIntent.where({ tenantId: a, description: "Pedido de camisetas" }).all();
    expect(rows).toHaveLength(1);
    expect(rows[0]!.provider).toBe("manual");
    expect((await post(keyA, "/payments/intents", { amount: 500, description: "Muy poco" })).status).toBe(422);
    expect((await post(keyAdvisor, "/payments/intents", { amount: 80_000, description: "No debería" })).json.code).toBe("forbidden");
  });

  test("payments.confirm exige el alcance exacto, evidencia y registra el ingreso una sola vez", async () => {
    const intent = await post(keyAConfirm, "/payments/intents", { amount: 120_000, description: "Cobro a confirmar" });
    const reference = String(intent.json.data!.reference);
    // `*` no concede mover dinero.
    expect((await post(keyA, `/payments/intents/${reference}/confirm`, { evidence: "Transferencia 123456" })).json.code).toBe("scope_denied");
    expect((await post(keyAConfirm, `/payments/intents/${reference}/confirm`, { evidence: "ab" })).status).toBe(422);
    // Otro negocio, aun con el alcance exacto, no ve la referencia.
    expect((await post(keyBConfirm, `/payments/intents/${reference}/confirm`, { evidence: "Transferencia 123456" })).status).toBe(404);
    const ok = await post(keyAConfirm, `/payments/intents/${reference}/confirm`, { evidence: "Transferencia 123456" });
    expect(ok.json.data).toEqual({ reference, status: "PAID", already: false });
    const again = await post(keyAConfirm, `/payments/intents/${reference}/confirm`, { evidence: "Transferencia 123456" });
    expect(again.json.data).toEqual({ reference, status: "PAID", already: true });
    expect(await db.orm.public.Payment.where({ tenantId: a, amount: "120000.00" }).all()).toHaveLength(1);
    expect((await post(keyAConfirm, "/payments/intents/zzzzzzzzzzzzzz/confirm", { evidence: "Transferencia 123456" })).status).toBe(404);
  });

  test("cada operación deja su evento en el outbox del negocio", async () => {
    const types = (await db.orm.public.OutboxEvent.where({ tenantId: a }).all()).map((e) => e.type);
    for (const t of ["customer.upserted", "order.canceled", "payment.intent_created", "sale.completed"]) expect(types, t).toContain(t);
    expect((await db.orm.public.OutboxEvent.where({ tenantId: b, type: "order.canceled" }).all()).length).toBe(0);
  });
});
