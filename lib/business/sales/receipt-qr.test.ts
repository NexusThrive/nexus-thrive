import { describe, expect, test } from "vitest";
import { receiptQrDataUrl, receiptQrPayload } from "./receipt-qr";

describe("receiptQrPayload", () => {
  test("usa el enlace firmado del recibo cuando existe", () => {
    expect(receiptQrPayload({ link: "https://app.test/r/abc.123", reference: "R-000001", total: "$ 50.000" })).toBe("https://app.test/r/abc.123");
  });

  test("texto de respaldo sin enlace", () => {
    expect(receiptQrPayload({ reference: "R-000001", total: "$ 50.000", business: "Barbería" })).toBe("NEXUS | Barbería | R-000001 | $ 50.000");
  });
});

describe("receiptQrDataUrl", () => {
  test("devuelve una imagen PNG en base 64", async () => {
    const url = await receiptQrDataUrl("https://app.test/r/abc.123");
    expect(url.startsWith("data:image/png;base64,")).toBe(true);
    expect(url.length).toBeGreaterThan(100);
  });
});
