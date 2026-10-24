import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Cifra los secretos de webhook en reposo (AES-256-GCM). La clave sale de
 * `WEBHOOK_ENCRYPTION_KEY` (64 caracteres hex = 32 bytes); sin ella no se
 * crean ni se envían webhooks: falla claro en vez de guardar secretos en claro.
 * Formato guardado: `v1.<iv>.<tag>.<texto>` en base64url.
 */
function key(): Buffer {
  const hex = process.env.WEBHOOK_ENCRYPTION_KEY ?? "";
  if (!/^[0-9a-f]{64}$/i.test(hex)) throw new Error("Falta WEBHOOK_ENCRYPTION_KEY (64 caracteres hex). Genera una con: openssl rand -hex 32");
  return Buffer.from(hex, "hex");
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const text = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), text.toString("base64url")].join(".");
}

export function decryptSecret(stored: string): string {
  const [version, iv, tag, text] = stored.split(".");
  if (version !== "v1" || !iv || !tag || !text) throw new Error("Secreto cifrado con formato desconocido.");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(text, "base64url")), decipher.final()]).toString("utf8");
}
