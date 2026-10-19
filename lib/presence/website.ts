import type { WebsiteSignal } from "./presence";

/**
 * Verificación del sitio web de un negocio. Hace un GET con timeout corto y
 * saca las señales que cuentan para el puntaje: responde, HTTPS, título, meta
 * descripción y viewport. Nunca lanza: si el sitio no responde o tarda, el
 * negocio queda "sin verificar" en vez de romper el análisis.
 */

const TIMEOUT_MS = 8000;
const MAX_BYTES = 200_000;

function withProtocol(url: string): string {
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function match(html: string, re: RegExp): string | null {
  const found = html.match(re)?.[1]?.trim();
  return found ? found.replace(/\s+/g, " ").slice(0, 200) : null;
}

export async function analyzeWebsite(rawUrl: string): Promise<WebsiteSignal> {
  const url = withProtocol(rawUrl);

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(url, {
        redirect: "follow",
        signal: controller.signal,
        headers: {
          "User-Agent": "NexusThrivePresenceBot/1.0 (+https://nexusthrive.com)",
          Accept: "text/html,application/xhtml+xml",
        },
      });
    } finally {
      clearTimeout(timer);
    }

    const finalUrl = response.url || url;
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
