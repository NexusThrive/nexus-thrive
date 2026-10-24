import { beforeAll, describe, expect, test } from "vitest";
import { adapterFor } from "./registry";
import { sandboxPayments, sandboxSignature } from "./sandbox";
import { wompiPayments } from "./wompi";

beforeAll(() => {
  process.env.WEBHOOK_ENCRYPTION_KEY = "c".repeat(64);
});

const body = JSON.stringify({ id: "evt_1", type: "payment.succeeded", reference: "pay_9", amount: "50000" });
const creds = { webhookSecret: "whsec_sbx_test" };
const headers = (sig: string) => new Headers({ "x-sandbox-signature": sig });

describe("pasarela de prueba (adaptador)", () => {
  test("firma válida pasa; cuerpo, secreto o cabecera alterados no", () => {
    const sig = sandboxSignature(creds.webhookSecret, body);
    expect(sandboxPayments.verifyWebhook(body, headers(sig), creds)).toBe(true);
    expect(sandboxPayments.verifyWebhook(body + " ", headers(sig), creds)).toBe(false);
    expect(sandboxPayments.verifyWebhook(body, headers(sig), { webhookSecret: "otro" })).toBe(false);
    expect(sandboxPayments.verifyWebhook(body, new Headers(), creds)).toBe(false);
  });
  test("entiende el evento y descarta lo que no es de pagos o está mal formado", () => {
    expect(sandboxPayments.parseWebhook(body)).toEqual({ externalId: "evt_1", type: "payment.succeeded", reference: "pay_9", amount: "50000" });
    expect(sandboxPayments.parseWebhook('{"id":"x","type":"user.deleted"}')).toBeNull();
    expect(sandboxPayments.parseWebhook("no json")).toBeNull();
    expect(sandboxPayments.parseWebhook('{"type":"payment.succeeded"}')).toBeNull();
  });
  test("el registro encuentra adaptadores por proveedor y tipo", () => {
    expect(adapterFor("sandbox", "PAYMENT")).toBe(sandboxPayments);
    expect(adapterFor("sandbox", "EINVOICE")).toBeUndefined();
    expect(adapterFor("wompi", "PAYMENT")).toBe(wompiPayments);
    expect(adapterFor("wompi", "EINVOICE")).toBeUndefined();
    expect(adapterFor("otro-que-no-existe")).toBeUndefined();
  });
});
