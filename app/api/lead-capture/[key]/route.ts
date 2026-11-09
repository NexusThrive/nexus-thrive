import { captureFromForm, preflightOrigin } from "@/lib/business/growth/lead-forms-db";

/**
 * Captura de interesados desde una web externa (HU-lead-capture-01). La clave de la URL es PÚBLICA; el origen del navegador (`Origin`) debe
 * estar en la lista del formulario. Responde con CORS solo al origen permitido: ninguna otra web puede leer la respuesta.
 */
const headers = (allowOrigin: string | null): Record<string, string> => ({
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  vary: "Origin",
  ...(allowOrigin ? { "access-control-allow-origin": allowOrigin } : {}),
});

export async function POST(request: Request, ctx: { params: Promise<{ key: string }> }) {
  const { key } = await ctx.params;
  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, message: "El cuerpo no es JSON válido." }), { status: 400, headers: headers(null) });
  }
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "desconocida";
  const r = await captureFromForm(key, request.headers.get("origin"), ip, body);
  return new Response(JSON.stringify(r.body), { status: r.status, headers: headers(r.allowOrigin) });
}

/** Preflight del navegador: solo se anuncia CORS al origen permitido de ese formulario. */
export async function OPTIONS(request: Request, ctx: { params: Promise<{ key: string }> }) {
  const { key } = await ctx.params;
  const ok = await preflightOrigin(key, request.headers.get("origin"));
  return new Response(null, { status: ok ? 204 : 403, headers: { ...(ok ? { "access-control-allow-origin": ok, "access-control-allow-methods": "POST, OPTIONS", "access-control-allow-headers": "content-type", "access-control-max-age": "600" } : {}), vary: "Origin" } });
}
