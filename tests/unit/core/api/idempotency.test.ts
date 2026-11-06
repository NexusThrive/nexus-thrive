import { beforeEach, describe, expect, test } from "vitest";
import { z } from "zod";
import { defineOperation, OperationError } from "@/lib/core/operations/types";
import { handleApi, type ApiDeps } from "@/lib/core/api/handler";
import { requestHash, IDEMPOTENCY_KEY_PATTERN, type IdempotencyClaim, type IdempotencyStore } from "@/lib/core/api/idempotency";
import { resetRateLimits } from "@/lib/core/api/rate-limit";
import { buildOpenApi } from "@/lib/core/api/openapi";
import { scopeAllows } from "@/lib/core/api/scopes";

/** HU-operaciones-01: las operaciones que escriben o mueven dinero exigen Idempotency-Key y corren una sola vez por llave. */
let runs = 0;
const OPS = [
  defineOperation({
    id: "orders.update_status",
    rest: { method: "POST", path: "/orders/{orderId}/status" },
    title: "Cambiar estado",
    description: "Cambia el estado de un pedido.",
    module: null,
    permission: null,
    risk: "write",
    idempotent: true,
    input: z.object({ orderId: z.string(), status: z.enum(["CANCELED"]) }),
    output: z.object({ id: z.string(), run: z.number() }),
    handler: async (_ctx, input) => {
      if (input.orderId === "falla") throw new OperationError("rule_violation", "No se puede.", 422);
      runs += 1;
      return { id: input.orderId, run: runs };
    },
  }),
  defineOperation({
    id: "payments.confirm",
    rest: { method: "POST", path: "/payments/{reference}/confirm" },
    title: "Confirmar",
    description: "Confirma un pago.",
    module: null,
    permission: null,
    risk: "money",
    idempotent: true,
    input: z.object({ reference: z.string() }),
    output: z.object({ reference: z.string() }),
    handler: async (_ctx, input) => ({ reference: input.reference }),
  }),
];

/** Almacén en memoria con la misma semántica que el de base de datos. */
function memoryStore(): IdempotencyStore & { rows: Map<string, { hash: string; status: number; body: unknown }> } {
  const rows = new Map<string, { hash: string; status: number; body: unknown }>();
  return {
    rows,
    async claim({ apiKeyId, key, hash }): Promise<IdempotencyClaim> {
      const k = `${apiKeyId}:${key}`;
      const found = rows.get(k);
      if (!found) {
        rows.set(k, { hash, status: 0, body: {} });
        return { state: "new" };
      }
      if (found.hash !== hash) return { state: "conflict" };
      return found.status === 0 ? { state: "in_progress" } : { state: "replay", status: found.status, body: found.body };
    },
    async complete({ apiKeyId, key, status, body }) {
      const row = rows.get(`${apiKeyId}:${key}`);
      if (row) Object.assign(row, { status, body });
    },
    async release({ apiKeyId, key }) {
      rows.delete(`${apiKeyId}:${key}`);
    },
  };
}

let store: ReturnType<typeof memoryStore>;
const deps = (): ApiDeps => ({
  operations: OPS,
  authenticate: async () => ({ ok: true, key: { id: "k1", tenantId: "t1", name: "n8n", environment: "live", scopes: ["*", "payments.confirm"], ipAllowlist: [], createdByRole: "OWNER" } }),
  loadTenant: async () => ({ active: true, modules: [] }),
  log: () => undefined,
  idempotency: store,
});
const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  handleApi(new Request(`http://localhost/api/v1${path}`, { method: "POST", body: JSON.stringify(body), headers: { authorization: "Bearer nx_live_x", ...headers } }), deps());
const KEY = "0b9a8f56-1c2d-4e3f-9a10-aaaaaaaaaaaa";

beforeEach(() => {
  resetRateLimits();
  runs = 0;
  store = memoryStore();
});

describe("Idempotency-Key en /api/v1", () => {
  test("sin la cabecera se rechaza con 422 idempotency_key_required y no se ejecuta", async () => {
    const res = await post("/orders/o1/status", { status: "CANCELED" });
    expect(res.status).toBe(422);
    expect(await res.json()).toMatchObject({ code: "idempotency_key_required" });
    expect(runs).toBe(0);
  });

  test("una llave con formato inválido se rechaza", async () => {
    expect((await post("/orders/o1/status", { status: "CANCELED" }, { "idempotency-key": "corta" })).status).toBe(422);
    expect(IDEMPOTENCY_KEY_PATTERN.test(KEY)).toBe(true);
    expect(IDEMPOTENCY_KEY_PATTERN.test("con espacios no")).toBe(false);
  });

  test("la misma llave y los mismos datos ejecutan UNA vez y devuelven la misma respuesta", async () => {
    const first = await post("/orders/o1/status", { status: "CANCELED" }, { "idempotency-key": KEY });
    const again = await post("/orders/o1/status", { status: "CANCELED" }, { "idempotency-key": KEY });
    expect(first.status).toBe(200);
    expect(await again.json()).toEqual(await first.clone().json());
    expect(again.headers.get("idempotent-replayed")).toBe("true");
    expect(runs).toBe(1);
  });

  test("el orden de los campos no cambia la huella", () => {
    expect(requestHash("a.b", { x: 1, y: { p: 1, q: 2 } })).toBe(requestHash("a.b", { y: { q: 2, p: 1 }, x: 1 }));
    expect(requestHash("a.b", { x: 1 })).not.toBe(requestHash("a.c", { x: 1 }));
  });

  test("la misma llave con otros datos da 422 idempotency_conflict", async () => {
    await post("/orders/o1/status", { status: "CANCELED" }, { "idempotency-key": KEY });
    const other = await post("/orders/o2/status", { status: "CANCELED" }, { "idempotency-key": KEY });
    expect(other.status).toBe(422);
    expect(await other.json()).toMatchObject({ code: "idempotency_conflict" });
    expect(runs).toBe(1);
  });

  test("una petición en curso con la misma llave responde 409", async () => {
    store.rows.set("k1:" + KEY, { hash: requestHash("orders.update_status", { status: "CANCELED", orderId: "o1" }), status: 0, body: {} });
    const res = await post("/orders/o1/status", { status: "CANCELED" }, { "idempotency-key": KEY });
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ code: "idempotency_in_progress" });
  });

  test("si la operación falla, la llave se libera y se puede reintentar", async () => {
    const failed = await post("/orders/falla/status", { status: "CANCELED" }, { "idempotency-key": KEY });
    expect(failed.status).toBe(422);
    expect(await failed.json()).toMatchObject({ code: "rule_violation" });
    expect(store.rows.size).toBe(0);
  });

  test("dinero: sin el alcance exacto la llave no pasa, aunque tenga `*`", async () => {
    expect(scopeAllows(["*", "payments.*", "write"], { id: "payments.confirm", risk: "money" })).toBe(false);
    expect(scopeAllows(["payments.confirm"], { id: "payments.confirm", risk: "money" })).toBe(true);
    expect(scopeAllows(["*"], { id: "orders.update_status", risk: "write" })).toBe(true);
    expect(scopeAllows(["orders.*"], { id: "orders.update_status", risk: "write" })).toBe(true);
  });

  test("OpenAPI documenta la cabecera y el alcance exacto de dinero", () => {
    const doc = buildOpenApi(OPS) as { paths: Record<string, Record<string, { parameters: { name: string; in: string; required: boolean }[]; "x-nexus-scope": string[] }>> };
    const order = doc.paths["/orders/{orderId}/status"]!.post!;
    expect(order.parameters).toContainEqual(expect.objectContaining({ name: "Idempotency-Key", in: "header", required: true }));
    expect(doc.paths["/payments/{reference}/confirm"]!.post!["x-nexus-scope"]).toEqual(["payments.confirm"]);
  });
});
