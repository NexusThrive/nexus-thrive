import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * Un webhook solo puede apuntar a HTTPS público: sin credenciales en la URL,
 * sin `localhost`/`.local`/`.internal` y sin direcciones privadas (SSRF). Se
 * valida al registrar (`checkWebhookUrl`) Y al enviar (`resolvesPublic`), porque
 * un nombre puede apuntar a una IP interna después.
 */
export function isPrivateIp(ip: string): boolean {
  const v = ip.toLowerCase();
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(v);
  if (mapped) return isPrivateIp(mapped[1]);
  if (isIP(v) === 4) {
    const [a, b] = v.split(".").map(Number);
    return (
      a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19)) || a >= 224
    );
  }
  if (isIP(v) === 6) return v === "::" || v === "::1" || /^f[cd]/.test(v) || /^fe[89ab]/.test(v) || v.startsWith("ff");
  return true; // no es una IP reconocible: no se confía
}

const BLOCKED_HOST = /(^|\.)(localhost|local|internal|localdomain|home\.arpa)$/;

export function checkWebhookUrl(raw: string): { ok: true; url: URL } | { ok: false; reason: string } {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, reason: "La URL no es válida." };
  }
  if (url.protocol !== "https:") return { ok: false, reason: "La URL debe empezar con https://" };
  if (url.username || url.password) return { ok: false, reason: "La URL no puede llevar usuario ni contraseña." };
  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (BLOCKED_HOST.test(host)) return { ok: false, reason: "La URL debe ser pública (no localhost ni redes internas)." };
  if (isIP(host) && isPrivateIp(host)) return { ok: false, reason: "La URL no puede apuntar a una dirección privada." };
  return { ok: true, url };
}

/** Resuelve el nombre y comprueba que NINGUNA dirección sea privada. */
export async function resolvesPublic(hostname: string, resolve: (h: string) => Promise<{ address: string }[]> = (h) => lookup(h, { all: true })): Promise<boolean> {
  const host = hostname.replace(/^\[|\]$/g, "");
  if (isIP(host)) return !isPrivateIp(host);
  try {
    const found = await resolve(host);
    return found.length > 0 && found.every((f) => !isPrivateIp(f.address));
  } catch {
    return false;
  }
}
