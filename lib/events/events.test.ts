import { beforeAll, describe, expect, test } from "vitest";
import { backoffMs } from "./dispatcher";
import { decryptSecret, encryptSecret } from "./secrets";
import { signPayload, verifySignature } from "./signing";
import { checkWebhookUrl, isPrivateIp, resolvesPublic } from "./ssrf";

beforeAll(() => {
  process.env.WEBHOOK_ENCRYPTION_KEY = "a".repeat(64);
});

describe("firma de webhooks", () => {
  const body = '{"id":"evt_1"}';
  test("una firma válida se verifica; cuerpo, secreto o fecha alterados no", () => {
    const header = signPayload(["whsec_a"], body, 1_000);
    expect(verifySignature("whsec_a", header, body, { nowSeconds: 1_100 })).toBe(true);
    expect(verifySignature("whsec_a", header, body + " ", { nowSeconds: 1_100 })).toBe(false);
    expect(verifySignature("whsec_b", header, body, { nowSeconds: 1_100 })).toBe(false);
    expect(verifySignature("whsec_a", header, body, { nowSeconds: 1_000 + 301 })).toBe(false); // repetición tardía
  });
  test("en rotación lleva dos firmas y vale con el secreto viejo o el nuevo", () => {
    const header = signPayload(["whsec_new", "whsec_old"], body, 1_000);
    expect(header.match(/v1=/g)).toHaveLength(2);
    expect(verifySignature("whsec_old", header, body, { nowSeconds: 1_000 })).toBe(true);
    expect(verifySignature("whsec_new", header, body, { nowSeconds: 1_000 })).toBe(true);
  });
  test("una cabecera mal formada no se acepta ni lanza", () => {
    expect(verifySignature("s", "basura", body)).toBe(false);
    expect(verifySignature("s", "t=1,v1=zz", body, { nowSeconds: 1 })).toBe(false);
  });
});

describe("secretos cifrados", () => {
  test("ida y vuelta, y cada cifrado es distinto", () => {
    const a = encryptSecret("whsec_x");
    expect(a).not.toContain("whsec_x");
    expect(decryptSecret(a)).toBe("whsec_x");
    expect(encryptSecret("whsec_x")).not.toBe(a);
  });
  test("un texto alterado no descifra", () => {
    const parts = encryptSecret("whsec_x").split(".");
    parts[3] = Buffer.from("otro").toString("base64url");
    expect(() => decryptSecret(parts.join("."))).toThrow();
  });
  test("sin clave falla claro", () => {
    const saved = process.env.WEBHOOK_ENCRYPTION_KEY;
    delete process.env.WEBHOOK_ENCRYPTION_KEY;
    expect(() => encryptSecret("x")).toThrow(/WEBHOOK_ENCRYPTION_KEY/);
    process.env.WEBHOOK_ENCRYPTION_KEY = saved;
  });
});

describe("destino seguro (SSRF)", () => {
  test.each(["http://ejemplo.com/h", "https://localhost/h", "https://127.0.0.1/h", "https://10.0.0.5/h", "https://192.168.1.2/h", "https://169.254.169.254/latest", "https://[::1]/h", "https://nas.local/h", "https://u:p@ejemplo.com/h", "no es url"])(
    "rechaza %s",
    (url) => expect(checkWebhookUrl(url).ok).toBe(false),
  );
  test.each(["https://ejemplo.com/hook", "https://n8n.midominio.co/webhook/abc", "https://8.8.8.8/h"])("acepta %s", (url) => expect(checkWebhookUrl(url).ok).toBe(true));
  test("rangos privados, incluida IPv4 mapeada en IPv6 y CGNAT", () => {
    for (const ip of ["0.0.0.0", "172.16.0.1", "172.31.255.1", "100.64.0.1", "::ffff:10.0.0.1", "fd00::1", "fe80::1"]) expect(isPrivateIp(ip), ip).toBe(true);
    for (const ip of ["8.8.8.8", "172.32.0.1", "1.1.1.1"]) expect(isPrivateIp(ip), ip).toBe(false);
  });
  test("un nombre que resuelve a una IP interna se rechaza al enviar", async () => {
    expect(await resolvesPublic("malo.com", async () => [{ address: "10.0.0.9" }])).toBe(false);
    expect(await resolvesPublic("malo.com", async () => [{ address: "8.8.8.8" }, { address: "127.0.0.1" }])).toBe(false);
    expect(await resolvesPublic("bueno.com", async () => [{ address: "8.8.8.8" }])).toBe(true);
    expect(await resolvesPublic("no-existe.com", async () => Promise.reject(new Error("ENOTFOUND")))).toBe(false);
  });
});

test("la espera entre reintentos crece y se detiene en 24 h", () => {
  expect([1, 2, 3, 4, 5, 6, 7, 8].map(backoffMs)).toEqual([60_000, 300_000, 1_800_000, 7_200_000, 21_600_000, 43_200_000, 86_400_000, 86_400_000]);
});
