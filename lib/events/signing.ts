import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Firma de webhooks: cabecera `NexusThrive-Signature: t=<unix>,v1=<hex>[,v1=<hex>]`
 * donde `v1 = HMAC-SHA256(secreto, "<t>.<cuerpo>")`. Lleva varias `v1` mientras
 * se rota un secreto (el anterior sigue valiendo un tiempo). El receptor debe
 * comparar en tiempo constante y rechazar marcas de tiempo viejas (anti-repetición).
 */
const mac = (secret: string, t: number, body: string) => createHmac("sha256", secret).update(`${t}.${body}`).digest("hex");

export function signPayload(secrets: readonly string[], body: string, nowSeconds = Math.floor(Date.now() / 1000)): string {
  return [`t=${nowSeconds}`, ...secrets.map((s) => `v1=${mac(s, nowSeconds, body)}`)].join(",");
}

export function verifySignature(secret: string, header: string, body: string, opts: { toleranceSeconds?: number; nowSeconds?: number } = {}): boolean {
  const { toleranceSeconds = 300, nowSeconds = Math.floor(Date.now() / 1000) } = opts;
  const parts = header.split(",").map((p) => p.trim().split("="));
  const t = Number(parts.find(([k]) => k === "t")?.[1]);
  if (!Number.isFinite(t) || Math.abs(nowSeconds - t) > toleranceSeconds) return false;
  const expected = Buffer.from(mac(secret, t, body), "hex");
  return parts.some(([k, v]) => {
    if (k !== "v1" || !v) return false;
    const got = Buffer.from(v, "hex");
    return got.length === expected.length && timingSafeEqual(got, expected);
  });
}
