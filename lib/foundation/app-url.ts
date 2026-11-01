import { headers } from "next/headers";

/**
 * URL pública de la aplicación.
 *
 * Para enlaces compartibles (WhatsApp) se resuelve, en orden:
 * 1. `NEXT_PUBLIC_APP_URL` si está configurada.
 * 2. El host de la petición (`x-forwarded-host`/`host` y su protocolo),
 *    para que en producción los enlaces apunten al dominio real y no a
 *    `localhost`.
 * 3. `http://localhost:3000` como último recurso en desarrollo.
 *
 * Nunca expone tokens, credenciales ni datos internos: solo rutas públicas.
 */
export async function getAppBaseUrl(): Promise<string> {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, "");
  try {
    const h = await headers();
    const host = (h.get("x-forwarded-host") ?? h.get("host"))?.split(",")[0]?.trim();
    if (host) {
      const forwardedProto = h.get("x-forwarded-proto")?.split(",")[0]?.trim();
      const proto = forwardedProto ?? (/^(localhost|127\.|\[::1\])/.test(host) ? "http" : "https");
      return `${proto}://${host}`.replace(/\/+$/, "");
    }
  } catch {
    // Sin contexto de petición (build, scripts): se usa el valor por defecto.
  }
  return "http://localhost:3000";
}

/** URL pública de un presupuesto (para compartir con el cliente). */
export async function getQuotePublicUrl(tenantSlug: string, quoteId: string): Promise<string> {
  const base = await getAppBaseUrl();
  const slug = tenantSlug.replace(/[/?#]/g, "");
  const id = quoteId.replace(/[/?#\s]/g, "");
  return `${base}/${slug}/quotes/${id}`;
}
