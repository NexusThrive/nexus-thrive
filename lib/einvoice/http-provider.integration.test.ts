import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import { db } from "@/prisma/db";
import { createAdminDb } from "@/lib/admin/db";
import { createDocument } from "@/lib/business/documents-db";
import { deleteTenantCompletely } from "@/lib/tenant/deletion";
import { connectHttpProvider, listFiscal, setFiscalEnabled, submitPending } from "./einvoice-db";

vi.mock("@/lib/events/ssrf", async (orig) => ({ ...(await orig<typeof import("@/lib/events/ssrf")>()), resolvesPublic: async () => true }));

/** Proveedor tecnológico por HTTP: los pendientes históricos salen en orden y sin duplicar, aunque el proveedor falle a ratos. */
const TEST_URL = process.env.TEST_DATABASE_URL;
const normalize = (url: string | undefined) => (url ?? "").replace(/\?.*$/, "");

describe.skipIf(!TEST_URL)("proveedor DIAN por HTTP (integración)", () => {
  const suffix = Date.now().toString(36);
  let a = "";
  const seen: string[] = [];
  let failNext = 0;

  beforeAll(async () => {
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) throw new Error("DATABASE_URL debe ser igual a TEST_DATABASE_URL.");
    process.env.WEBHOOK_ENCRYPTION_KEY = "d".repeat(64);
    a = String((await createAdminDb().createTenant({ name: "Empresa HTTP", slug: `ht-${suffix}`, vertical: "retail", modules: ["billing"], tenantType: "COMPANY", ownerEmail: `ht-${suffix}@ejemplo.com` })).id);
    await db.orm.public.Tenant.where({ id: a }).update({ taxId: "900.111.222-3" });
    await setFiscalEnabled(a, true);
    vi.stubGlobal("fetch", vi.fn(async (_url: unknown, init: RequestInit) => {
      const body = JSON.parse(String(init.body)) as { code: string };
      if (failNext > 0) {
        failNext--;
        return new Response("caído", { status: 503 });
      }
      seen.push(body.code);
      return new Response(JSON.stringify({ status: "ACCEPTED", providerRef: `p-${body.code}`, cufe: `cufe-${body.code}` }), { status: 200 });
    }));
  });
  afterAll(async () => {
    vi.unstubAllGlobals();
    if (a) await deleteTenantCompletely(a);
    await db.close();
  });

  test("conectar valida la URL (solo HTTPS público) y guarda la llave cifrada", async () => {
    expect(await connectHttpProvider(a, { url: "http://x.com/a", token: "12345678" })).toMatchObject({ ok: false });
    expect(await connectHttpProvider(a, { url: "https://proveedor.example.com/docs", token: "corta" })).toMatchObject({ ok: false });
    expect(await connectHttpProvider(a, { url: "https://proveedor.example.com/docs", token: "llave-larga-123" })).toEqual({ ok: true });
    const conn = await db.orm.public.ExternalConnection.where({ tenantId: a, kind: "EINVOICE", provider: "http" }).first();
    expect(conn!.credentialsEnc).toBeTruthy();
    expect(conn!.credentialsEnc).not.toContain("llave-larga-123");
  });

  test("los pendientes salen en orden; una falla del proveedor deja el documento en cola y el siguiente intento no duplica", async () => {
    const numbers: number[] = [];
    for (let i = 0; i < 4; i++) {
      const d = await createDocument(a, { kind: "SALE", status: "PAID", customerId: null, customerName: "Cliente", customerDoc: "123456", lines: [{ description: "Producto", quantity: 1, unitPrice: 10_000 + i }] }, null);
      numbers.push(d.number);
    }
    failNext = 1; // el primer envío falla (503)
    const first = await submitPending(a);
    expect(first.sent).toBe(3); // el que falló volvió a la cola; los demás salieron
    const queued = (await listFiscal(a)).filter((x) => x.status === "PENDING_PROVIDER");
    expect(queued).toHaveLength(1);
    expect(queued[0]!.rejectReason).toContain("Proveedor no disponible");
    const second = await submitPending(a);
    expect(second).toMatchObject({ sent: 1, accepted: 1 });
    expect(await submitPending(a)).toEqual({ sent: 0, accepted: 0, rejected: 0 });
    // Cada documento llegó al proveedor una sola vez con éxito, en el orden de creación (salvo el que reintentó).
    expect(new Set(seen).size).toBe(seen.length);
    expect(seen).toHaveLength(4);
    expect(seen.slice(0, 3)).toEqual(numbers.slice(1).map((n) => `V-${String(n).padStart(6, "0")}`));
    expect((await listFiscal(a)).every((x) => x.status === "ACCEPTED" && x.cufe?.startsWith("cufe-V-"))).toBe(true);
  });
});
