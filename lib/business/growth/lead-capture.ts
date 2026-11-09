import { randomBytes } from "node:crypto";

/**
 * Captura de interesados desde cualquier web (HU-lead-capture-01), reglas puras. La clave del formulario es PÚBLICA: puede verse en el
 * navegador y por eso solo sirve para crear interesados desde los orígenes permitidos, con límite de envíos y anti-spam.
 */
export const FORM_KEY_PATTERN = /^lf_[a-z0-9]{32}$/;

/** Clave pública nueva de un formulario: `lf_` + 32 caracteres al azar. */
export const newFormKey = () => `lf_${randomBytes(16).toString("hex")}`;

/** Normaliza un origen web a «esquema://host[:puerto]» en minúsculas, o `null` si no es un origen válido (sin ruta ni comodines). */
export function normalizeOrigin(raw: string): string | null {
  try {
    const u = new URL(raw.trim());
    if ((u.protocol !== "https:" && u.protocol !== "http:") || !u.hostname || u.hostname.includes("*")) return null;
    if (u.pathname !== "/" || u.search || u.hash || u.username || u.password) return null;
    return `${u.protocol}//${u.host}`.toLowerCase();
  } catch {
    return null;
  }
}

/** Problema legible de la lista de orígenes permitidos, o `null`. Permite `http://localhost` para desarrollo; exige al menos uno. */
export function validateOrigins(origins: readonly string[]): string | null {
  if (!origins.length) return "Agrega al menos un dominio desde el que se enviará el formulario.";
  if (origins.length > 10) return "Un formulario admite hasta 10 dominios.";
  const bad = origins.find((o) => !normalizeOrigin(o));
  return bad ? `«${bad}» no es un dominio válido. Escríbelo así: https://mitienda.com` : null;
}

/** ¿El envío viene de un origen permitido? Sin cabecera `Origin` (llamada de servidor a servidor, curl) NO se acepta. */
export function originAllowed(allowed: readonly string[], origin: string | null | undefined): boolean {
  if (!origin) return false;
  const o = normalizeOrigin(origin);
  return o !== null && allowed.some((a) => normalizeOrigin(a) === o);
}

export type CaptureInput = { name: string; phone: string; email: string; message: string; consent: boolean; website: string; source: string; medium: string; campaign: string };

/** Lee el cuerpo JSON de un envío con valores seguros (todo texto, recortado). `website` es la trampa anti-spam: un humano la deja vacía. */
export function readCapture(body: unknown): CaptureInput {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const text = (k: string, max: number) => (typeof b[k] === "string" ? (b[k] as string).trim().slice(0, max) : "");
  return { name: text("name", 120), phone: text("phone", 30), email: text("email", 120).toLowerCase(), message: text("message", 500), consent: b.consent === true || b.consent === "true" || b.consent === "on", website: text("website", 200), source: text("source", 60), medium: text("medium", 60), campaign: text("campaign", 80) };
}

/** Rechazo de un envío o `null` si es válido. El consentimiento es obligatorio (tratamiento de datos). */
export function validateCapture(c: CaptureInput): { field: string; message: string } | null {
  if (c.name.length < 3) return { field: "name", message: "Escribe tu nombre." };
  if (c.phone.replace(/\D/g, "").length < 10) return { field: "phone", message: "Escribe un celular de 10 dígitos." };
  if (c.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(c.email)) return { field: "email", message: "Ese correo no parece válido." };
  if (!c.consent) return { field: "consent", message: "Debes aceptar que te contactemos para enviar el formulario." };
  return null;
}

/** ¿Parece spam? Trampa llena, o un mensaje con enlaces (más de uno) o con palabras típicas. No bloquea a un humano que escribe un enlace. */
export function looksLikeSpam(c: CaptureInput): boolean {
  if (c.website) return true;
  const links = (c.message.match(/https?:\/\/|www\./gi) ?? []).length;
  if (links >= 2) return true;
  return /\b(viagra|casino|bitcoin|crypto|seo services|backlinks)\b/i.test(`${c.name} ${c.message}`);
}

/** Fragmento HTML para pegar en la web: el formulario y el envío por JavaScript. */
export function embedSnippet(appUrl: string, key: string): string {
  return `<form id="nexus-lead" onsubmit="event.preventDefault();var f=this,d=Object.fromEntries(new FormData(f));d.consent=!!f.consent.checked;fetch('${appUrl}/api/lead-capture/${key}',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(d)}).then(function(r){return r.json()}).then(function(j){alert(j.ok?'¡Gracias! Te contactaremos pronto.':j.message)})">
  <input name="name" placeholder="Tu nombre" required>
  <input name="phone" placeholder="Tu celular" required>
  <input name="email" type="email" placeholder="Tu correo (opcional)">
  <textarea name="message" placeholder="¿Qué te interesa?"></textarea>
  <input name="website" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px" aria-hidden="true">
  <label><input type="checkbox" name="consent"> Acepto que me contacten</label>
  <button type="submit">Enviar</button>
</form>`;
}
