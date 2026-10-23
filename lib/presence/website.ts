import type { WebsiteSignal } from "./presence";
import { checkPublicUrl, type Resolver } from "./url-guard";

/**
 * Verificación del sitio web de un negocio. Hace un GET con timeout corto y
 * saca las señales que cuentan para el puntaje: responde, HTTPS, título, meta
 * descripción y viewport. Nunca lanza: si el sitio no responde o tarda, el
 * negocio queda "sin verificar" en vez de romper el análisis.
 *
 * La URL la escribe el negocio, así que solo se consultan sitios públicos y
 * cada redirección se vuelve a comprobar (SEC-09, `url-guard.ts`).
 */

const TIMEOUT_MS = 8000;
const MAX_BYTES = 200_000;
const MAX_REDIRECTS = 4;

function withProtocol(url: string): string {
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function match(html: string, re: RegExp): string | null {
  const found = html.match(re)?.[1]?.trim();
  return found ? found.replace(/\s+/g, " ").slice(0, 200) : null;
}

/**
 * GET que sigue las redirecciones a mano, comprobando cada destino. Devuelve
 * `null` si algún salto apunta fuera de la Internet pública.
 */
async function fetchPublic(
  url: string,
  signal: AbortSignal,
  resolve?: Resolver,
): Promise<{ response: Response; finalUrl: string } | null> {
  let current = url;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const check = await checkPublicUrl(current, resolve);
    if (!check.ok) return null;
    const response = await fetch(check.url, {
      redirect: "manual",
      signal,
      headers: {
        "User-Agent": "NexusThrivePresenceBot/1.0 (+https://nexusthrive.com)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    const location = response.headers.get("location");
    if (response.status >= 300 && response.status < 400 && location) {
      current = new URL(location, check.url).toString();
      continue;
    }
    return { response, finalUrl: check.url.toString() };
  }
  return null;
}

export async function analyzeWebsite(rawUrl: string, resolve?: Resolver): Promise<WebsiteSignal> {
  const url = withProtocol(rawUrl);

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let fetched: Awaited<ReturnType<typeof fetchPublic>>;
    try {
      fetched = await fetchPublic(url, controller.signal, resolve);
    } finally {
      clearTimeout(timer);
    }
    if (!fetched) throw new Error("destino no permitido");

    const { response, finalUrl } = fetched;
    const contentType = response.headers.get("content-type") ?? "";
    const isHtml = contentType.includes("html") || contentType === "";
    const html = isHtml && response.ok ? (await response.text()).slice(0, MAX_BYTES) : "";

    return {
      url: finalUrl,
      reachable: response.ok,
      https: /^https:\/\//i.test(finalUrl),
      statusCode: response.status,
      title: match(html, /<title[^>]*>([\s\S]*?)<\/title>/i),
      description: match(
        html,
        /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i,
      ) ?? match(
        html,
        /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i,
      ),
      viewport: /<meta[^>]+name=["']viewport["']/i.test(html),
    };
  } catch {
    return {
      url,
      reachable: false,
      https: /^https:\/\//i.test(url),
      statusCode: null,
      title: null,
      description: null,
      viewport: false,
    };
  }
}
