import { describe, expect, it } from "vitest";
import { wompiChecksum, wompiCheckoutUrl, wompiIntegrity, wompiPayments } from "./wompi";

const SECRET = "test_events_secret";
const body = (status = "APPROVED", over: Record<string, unknown> = {}) => {
  const b: Record<string, unknown> = {
    event: "transaction.updated",
    data: { transaction: { id: "1234-1610641025-49201", status, amount_in_cents: 4_990_000, reference: "abcd2345efgh67", currency: "COP", ...over } },
    timestamp: 1_530_291_411,
    signature: { properties: ["transaction.id", "transaction.status", "transaction.amount_in_cents"], checksum: "" },
  };
  (b.signature as { checksum: string }).checksum = wompiChecksum(b, SECRET);
  return b;
};
const creds = { publicKey: "pub_test_x", integritySecret: "int", eventsSecret: SECRET };

describe("adaptador Wompi", () => {
  it("el checksum sigue la regla documentada: valores de las propiedades + timestamp + secreto", async () => {
    const { createHash } = await import("node:crypto");
    const b = body();
    const expected = createHash("sha256").update(`1234-1610641025-49201APPROVED4990000${1_530_291_411}${SECRET}`).digest("hex");
    expect((b.signature as { checksum: string }).checksum).toBe(expected);
  });
  it("acepta un evento bien firmado y rechaza uno alterado o con otro secreto", () => {
    const raw = JSON.stringify(body());
    expect(wompiPayments.verifyWebhook(raw, new Headers(), creds)).toBe(true);
    expect(wompiPayments.verifyWebhook(raw, new Headers(), { ...creds, eventsSecret: "otro" })).toBe(false);
    expect(wompiPayments.verifyWebhook(raw.replace("4990000", "1"), new Headers(), creds)).toBe(false);
    expect(wompiPayments.verifyWebhook("no es json", new Headers(), creds)).toBe(false);
  });
  it("normaliza el evento: estado en el id para no descartar actualizaciones, valor en pesos y nuestra referencia", () => {
    expect(wompiPayments.parseWebhook(JSON.stringify(body("APPROVED")))).toEqual({ externalId: "1234-1610641025-49201:APPROVED", paymentRef: "1234-1610641025-49201", type: "payment.succeeded", reference: "abcd2345efgh67", amount: "49900" });
    expect(wompiPayments.parseWebhook(JSON.stringify(body("DECLINED")))?.type).toBe("payment.failed");
    expect(wompiPayments.parseWebhook(JSON.stringify(body("PENDING")))).toBeNull(); // aún no es oficial
    expect(wompiPayments.parseWebhook("{}")).toBeNull();
  });
  it("arma el enlace del checkout con su firma de integridad", () => {
    const url = new URL(wompiCheckoutUrl({ publicKey: "pub_test_x", integritySecret: "int", reference: "ref1", amount: 150_000 }));
    expect(url.origin + url.pathname).toBe("https://checkout.wompi.co/p/");
    expect(url.searchParams.get("amount-in-cents")).toBe("15000000");
    expect(url.searchParams.get("signature:integrity")).toBe(wompiIntegrity("ref1", 15_000_000, "COP", "int"));
  });
  it("sin credenciales completas no pasa la comprobación", async () => {
    expect(await wompiPayments.check({ publicKey: "pub_test_x" })).toMatchObject({ ok: false });
  });
});
