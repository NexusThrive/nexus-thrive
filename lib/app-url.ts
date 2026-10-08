/**
 * URL pública de la aplicación.
 *
 * Para enlaces compartibles (WhatsApp) se usa la URL pública configurada;
 * en local/desarrollo cae a localhost. Nunca expone tokens, credenciales
 * ni datos internos: solo rutas públicas.
 */

export function getAppBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/+$/, "");
  }
  return "http://localhost:3000";
}

/** URL pública de un presupuesto (para compartir con el cliente). */
export function getQuotePublicUrl(tenantSlug: string, quoteId: string): string {
  const base = getAppBaseUrl();
  const slug = tenantSlug.replace(/[/?#]/g, "");
  const id = quoteId.replace(/[/?#\s]/g, "");
  return `${base}/${slug}/quotes/${id}`;
}