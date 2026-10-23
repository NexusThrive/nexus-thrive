import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * Guardia SSRF para las URLs que escribe un negocio (SEC-09 en
 * docs/nexus-architecture/security-audit.md). El servidor de NEXUS solo
 * consulta sitios públicos: nada de la red interna, del propio servidor ni de
 * los servicios de metadatos de la nube.
 *
 * Límite conocido: entre esta comprobación y la conexión el DNS podría
 * cambiar (DNS rebinding). Se comprueba cada salto de redirección para
 * acotarlo; fijar la IP en la conexión queda para cuando haga falta.
 */

export type Resolver = (hostname: string) => Promise<string[]>;

const defaultResolver: Resolver = async (hostname) =>
  (await lookup(hostname, { all: true, verbatim: true })).map((a) => a.address);

function ipv4ToInt(ip: string): number {
  return ip.split(".").reduce((acc, part) => (acc << 8) + Number(part), 0) >>> 0;
}

/** Rangos IPv4 que no son Internet pública (RFC 6890 y afines). */
const PRIVATE_V4: [string, number][] = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
];

function isPrivateV4(ip: string): boolean {
  const n = ipv4ToInt(ip);
  return PRIVATE_V4.some(([base, bits]) => {
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    return (n & mask) === (ipv4ToInt(base) & mask);
  });
}

/** ¿La dirección IP (v4 o v6) apunta fuera de la Internet pública? */
export function isPrivateAddress(address: string): boolean {
  const ip = address.replace(/^\[|\]$/g, "").toLowerCase();
  const version = isIP(ip);
  if (version === 4) return isPrivateV4(ip);
  if (version !== 6) return true; // No es una IP válida: no se arriesga.

  // IPv4 incrustada (::ffff:127.0.0.1, ::127.0.0.1).
  const embedded = ip.match(/(?:^|:)(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (embedded) return isPrivateV4(embedded[1]);
  // IPv4 mapeada en hexadecimal (::ffff:7f00:1).
  const mappedHex = ip.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (mappedHex) {
    const hi = parseInt(mappedHex[1], 16);
    const lo = parseInt(mappedHex[2], 16);
    return isPrivateV4(`${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`);
  }
  if (ip === "::" || ip === "::1") return true;
  const first = parseInt(ip.split(":")[0] || "0", 16);
  if ((first & 0xfe00) === 0xfc00) return true; // fc00::/7 únicas locales
  if ((first & 0xffc0) === 0xfe80) return true; // fe80::/10 enlace local
  if ((first & 0xff00) === 0xff00) return true; // ff00::/8 multicast
  if (ip.startsWith("64:ff9b:") || ip.startsWith("2001:db8:")) return true; // NAT64, documentación
  return false;
}

export type UrlCheck = { ok: true; url: URL } | { ok: false; reason: string };

/**
 * ¿Se puede consultar esta URL desde el servidor? Solo http/https, puertos
 * por defecto, sin credenciales en la URL, y un host que resuelva únicamente a
 * direcciones públicas.
 */
export async function checkPublicUrl(raw: string, resolve: Resolver = defaultResolver): Promise<UrlCheck> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, reason: "URL no válida" };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return { ok: false, reason: "protocolo no permitido" };
  if (url.port && url.port !== "80" && url.port !== "443") return { ok: false, reason: "puerto no permitido" };
  if (url.username || url.password) return { ok: false, reason: "credenciales en la URL" };

  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal") || host.endsWith(".local")) {
    return { ok: false, reason: "host interno" };
  }

  let addresses: string[];
  if (isIP(host)) {
    addresses = [host];
  } else {
    try {
      addresses = await resolve(host);
    } catch {
      return { ok: false, reason: "el dominio no resuelve" };
    }
  }
  if (addresses.length === 0 || addresses.some(isPrivateAddress)) {
    return { ok: false, reason: "dirección privada" };
  }
  return { ok: true, url };
}
