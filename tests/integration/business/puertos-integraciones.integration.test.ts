/**
 * Contratos entre dominios y las integraciones: facturación electrónica, checkout de la pasarela y ficha de Google.
 *
 * Business y Finance no importan los adaptadores; piden lo que necesitan por un puerto y la raíz de composición
 * (`lib/runtime/ports.ts`) lo conecta con la implementación real.
 */
import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";
import { db } from "@/prisma/db";
import { createAdminDb } from "@/lib/platform/admin/db";
import { fiscalQueuePort, type FiscalQueuePort } from "@/lib/business/sales/fiscal-port";
import { createDocument } from "@/lib/business/sales/documents-db";
import { setFiscalEnabled } from "@/lib/integrations/einvoice/einvoice-db";
import { connectGoogle } from "@/lib/integrations/google/google-db";
import { checkoutPort, type CheckoutPort } from "@/lib/domains/finance/payments/checkout-port";
import { createIntent, publicIntent } from "@/lib/domains/finance/payments/intents-db";
import { PortNotProvidedError } from "@/lib/foundation/ports";
import { listingPort, type ListingPort } from "@/lib/business/presence/listing-port";
import { encryptCredentials } from "@/lib/integrations/providers/connections";
import { deleteTenantCompletely } from "@/lib/core/tenancy/deletion";

const TEST_URL = process.env.TEST_DATABASE_URL;
const normalize = (url: string | undefined) => (url ?? "").replace(/\?.*$/, "");

describe.skipIf(!TEST_URL)("puertos hacia las integraciones (integración)", () => {
  const suffix = Date.now().toString(36);
  let tenantId = "";
  let realFiscal: FiscalQueuePort;
  let realCheckout: CheckoutPort;
  let realListing: ListingPort;

  const emitir = () => createDocument(tenantId, { kind: "BILL", customerId: null, customerName: "Cliente", lines: [{ description: "Servicio", quantity: 1, unitPrice: 10_000, taxRatePct: 19 }] }, "u");
  const withoutPort = async <T,>(name: string, run: () => Promise<T>): Promise<T> => {
    const registro = (globalThis as unknown as { [k: symbol]: { provided: Map<string, unknown> } })[Symbol.for("nexus.ports")];
    const guardado = registro.provided.get(name);
    registro.provided.delete(name);
    try {
      return await run();
    } finally {
      registro.provided.set(name, guardado);
    }
  };

  beforeAll(async () => {
    if (normalize(process.env.DATABASE_URL) !== normalize(TEST_URL)) throw new Error("DATABASE_URL debe ser igual a TEST_DATABASE_URL.");
    realFiscal = fiscalQueuePort.use();
    realCheckout = checkoutPort.use();
    realListing = listingPort.use();
    tenantId = String((await createAdminDb().createTenant({ name: "Puerto integraciones", slug: `pint-${suffix}`, vertical: "retail", modules: ["finance"], tenantType: "COMPANY", ownerEmail: `pint-${suffix}@ejemplo.com` })).id);
  });
  afterEach(() => {
    fiscalQueuePort.provide(realFiscal);
    checkoutPort.provide(realCheckout);
    listingPort.provide(realListing);
  });
  afterAll(async () => {
    fiscalQueuePort.provide(realFiscal);
    checkoutPort.provide(realCheckout);
    listingPort.provide(realListing);
    if (tenantId) await deleteTenantCompletely(tenantId);
  });

  const fiscales = () => db.orm.public.FiscalDocument.where({ tenantId }).all();

  describe("facturación electrónica (fiscal-queue)", () => {
    test("Business informa el documento creado con sus datos y totales", async () => {
      const recibidos: Parameters<FiscalQueuePort["enqueue"]>[2][] = [];
      fiscalQueuePort.provide({ enqueue: async (tx, t, doc) => { recibidos.push(doc); return realFiscal.enqueue(tx, t, doc); } });
      const d = await emitir();
      expect(recibidos).toHaveLength(1);
      expect(recibidos[0]).toMatchObject({ id: d.id, kind: "BILL", number: d.number, customerName: "Cliente", totals: { subtotal: 10_000, taxTotal: 1_900, total: 11_900 } });
      expect(recibidos[0].issueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    test("con la facturación electrónica apagada no se deja nada en cola; encendida, queda pendiente del proveedor", async () => {
      await setFiscalEnabled(tenantId, false);
      const antes = (await fiscales()).length;
      await emitir();
      expect(await fiscales()).toHaveLength(antes);
      await setFiscalEnabled(tenantId, true);
      const d = await emitir();
      const cola = (await fiscales()).filter((f) => f.invoiceId === d.id);
      expect(cola).toHaveLength(1);
      expect(cola[0].status).toBe("PENDING_PROVIDER");
      await setFiscalEnabled(tenantId, false);
    });

    test("si el puerto falla, se deshace el documento (misma transacción)", async () => {
      const antes = await db.orm.public.Invoice.where({ tenantId }).all();
      fiscalQueuePort.provide({ enqueue: async () => { throw new Error("cola fiscal caída (simulada)"); } });
      await expect(emitir()).rejects.toThrow("cola fiscal caída");
      expect(await db.orm.public.Invoice.where({ tenantId }).all()).toHaveLength(antes.length);
    });

    test("sin el puerto conectado, emitir falla de forma visible y no deja nada", async () => {
      const antes = await db.orm.public.Invoice.where({ tenantId }).all();
      await withoutPort("fiscal-queue", async () => {
        await expect(emitir()).rejects.toThrow(PortNotProvidedError);
      });
      expect(await db.orm.public.Invoice.where({ tenantId }).all()).toHaveLength(antes.length);
    });
  });

  describe("checkout de la pasarela (payment-checkout)", () => {
    const wompi = { publicKey: "pub_test_abc", integritySecret: "integ_secret_123" };

    test("Wompi arma el enlace del checkout con la referencia y el valor en centavos", () => {
      const url = realCheckout.hostedCheckoutUrl({ provider: "wompi", credentialsEnc: encryptCredentials(wompi), reference: "REF-1", amount: 12_500 });
      expect(url).toContain("public-key=pub_test_abc");
      expect(url).toContain("reference=REF-1");
      expect(url).toContain("amount-in-cents=1250000");
      expect(url).toContain("currency=COP");
    });

    test("una pasarela sin checkout alojado devuelve null", () => {
      expect(realCheckout.hostedCheckoutUrl({ provider: "sandbox", credentialsEnc: encryptCredentials({}), reference: "REF-2", amount: 5_000 })).toBeNull();
    });

    test("credenciales ilegibles hacen fallar al adaptador (quien llama decide qué hacer)", () => {
      expect(() => realCheckout.hostedCheckoutUrl({ provider: "wompi", credentialsEnc: "no-es-un-secreto", reference: "REF-3", amount: 5_000 })).toThrow();
    });

    test("la vista pública de un cobro con Wompi conectado trae el enlace del puerto; si el puerto falla, queda sin enlace", async () => {
      await db.orm.public.ExternalConnection.create({ tenantId, kind: "PAYMENT", provider: "wompi", environment: "sandbox", status: "CONNECTED", credentialsEnc: encryptCredentials(wompi), credentialsKeyId: "v1" });
      const made = await createIntent(tenantId, { amount: 20_000, description: "Cobro de prueba", provider: "wompi" }, "u");
      expect(made.ok).toBe(true);
      if (!made.ok) return;
      const llamadas: string[] = [];
      checkoutPort.provide({ hostedCheckoutUrl: (input) => { llamadas.push(input.provider); return realCheckout.hostedCheckoutUrl(input); } });
      const view = await publicIntent(made.reference);
      expect(llamadas).toEqual(["wompi"]);
      expect(view?.payUrl).toContain("reference=" + made.reference);
      checkoutPort.provide({ hostedCheckoutUrl: () => { throw new Error("pasarela caída (simulada)"); } });
      expect((await publicIntent(made.reference))?.payUrl).toBeNull();
    });
  });

  describe("ficha de Google (google-listing)", () => {
    test("sin ficha conectada, el resumen dice que no está conectada", async () => {
      expect(await realListing.summary(tenantId)).toEqual({ connected: false, status: null, napMatches: 0 });
    });

    test("con la ficha conectada, el resumen trae su estado y las coincidencias", async () => {
      const r = await connectGoogle(tenantId, { placeId: "ChIJ" + "a".repeat(20), apiKey: "k".repeat(30) });
      expect(r.ok).toBe(true);
      const resumen = await realListing.summary(tenantId);
      expect(resumen.connected).toBe(true);
      expect(resumen.status).toBe("PENDING");
      expect(resumen.napMatches).toBe(0);
    });

    test("sin el puerto conectado, medir la presencia falla de forma visible", async () => {
      const { refreshPresence } = await import("@/lib/business/presence/pillars-db");
      await withoutPort("google-listing", async () => {
        await expect(refreshPresence(tenantId)).rejects.toThrow(PortNotProvidedError);
      });
    });
  });
});
