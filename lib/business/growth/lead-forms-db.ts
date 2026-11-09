import { db } from "@/prisma/db";
import { allowAttempt, recordAttempt } from "@/lib/foundation/rate-limit";
import { recordLead } from "./growth-db";
import { FORM_KEY_PATTERN, looksLikeSpam, newFormKey, normalizeOrigin, originAllowed, readCapture, validateCapture, validateOrigins } from "./lead-capture";

/** Formularios de captura (HU-lead-capture-01). La clave es pública; todo lo demás va por `tenantId`. */
export type LeadFormRow = { id: string; name: string; publicKey: string; allowedOrigins: string[]; campaign: string | null; enabled: boolean; createdAt: string };
type Result<T = object> = ({ ok: true } & T) | { ok: false; message: string };

const toRow = (f: { id: string; name: string; publicKey: string; allowedOrigins: readonly string[] | null; campaign: string | null; enabled: boolean; createdAt: unknown }): LeadFormRow => ({ id: f.id, name: f.name, publicKey: f.publicKey, allowedOrigins: [...(f.allowedOrigins ?? [])], campaign: f.campaign, enabled: f.enabled, createdAt: String(f.createdAt) });

export async function createLeadForm(tenantId: string, input: { name: string; origins: string[]; campaign?: string | null }): Promise<Result<{ form: LeadFormRow }>> {
  if (input.name.trim().length < 3) return { ok: false, message: "Ponle un nombre al formulario (por ejemplo «Landing de camisetas»)." };
  const problem = validateOrigins(input.origins);
  if (problem) return { ok: false, message: problem };
  if ((await db.orm.public.LeadForm.where({ tenantId }).select("id").limit(21).all()).length > 20) return { ok: false, message: "Llegaste al máximo de 20 formularios." };
  const origins = [...new Set(input.origins.map((o) => normalizeOrigin(o)!))];
  const created = await db.orm.public.LeadForm.create({ tenantId, name: input.name.trim().slice(0, 80), publicKey: newFormKey(), allowedOrigins: origins, campaign: input.campaign?.trim().slice(0, 80) || null });
  return { ok: true, form: toRow(created) };
}

export async function listLeadForms(tenantId: string): Promise<LeadFormRow[]> {
  return (await db.orm.public.LeadForm.where({ tenantId }).orderBy((f) => f.createdAt.desc()).limit(50).all()).map(toRow);
}

/** Enciende o apaga un formulario: apagado, rechaza todo envío. */
export async function setLeadFormEnabled(tenantId: string, id: string, enabled: boolean): Promise<Result> {
  const found = await db.orm.public.LeadForm.where({ tenantId, id }).select("id").first();
  if (!found) return { ok: false, message: "No se encontró el formulario." };
  await db.orm.public.LeadForm.where({ tenantId, id }).update({ enabled });
  return { ok: true };
}

/** Cambia la clave pública (si se filtró o se usa mal): la anterior deja de funcionar al instante. */
export async function rotateLeadFormKey(tenantId: string, id: string): Promise<Result<{ publicKey: string }>> {
  const found = await db.orm.public.LeadForm.where({ tenantId, id }).select("id").first();
  if (!found) return { ok: false, message: "No se encontró el formulario." };
  const publicKey = newFormKey();
  await db.orm.public.LeadForm.where({ tenantId, id }).update({ publicKey });
  return { ok: true, publicKey };
}

export type CaptureOutcome = { status: number; body: { ok: boolean; message?: string; field?: string }; allowOrigin: string | null };

/**
 * Procesa un envío del formulario público: clave válida y encendida → origen permitido → límite por IP y por formulario → anti-spam
 * → datos y consentimiento → contacto y oportunidad con su origen (formulario y campaña). Un envío de spam responde como éxito para
 * no darle pistas al bot, pero no guarda nada.
 */
export async function captureFromForm(key: string, origin: string | null, ip: string, body: unknown): Promise<CaptureOutcome> {
  const deny = (status: number, message: string, field?: string): CaptureOutcome => ({ status, body: { ok: false, message, ...(field ? { field } : {}) }, allowOrigin: null });
  if (!FORM_KEY_PATTERN.test(key)) return deny(404, "Formulario no encontrado.");
  const form = await db.orm.public.LeadForm.where({ publicKey: key }).first();
  if (!form || !form.enabled) return deny(404, "Formulario no encontrado.");
  if (!originAllowed(form.allowedOrigins ?? [], origin)) return deny(403, "Este formulario no admite envíos desde este dominio.");
  const allowOrigin = normalizeOrigin(origin!);
  const bucket = `lead:${key}:${ip}`;
  if (!allowAttempt(bucket, 5) || !allowAttempt(`lead:${key}`, 60)) return { ...deny(429, "Demasiados envíos seguidos. Inténtalo en unos minutos."), allowOrigin };
  recordAttempt(bucket, 5);
  recordAttempt(`lead:${key}`, 60);
  const input = readCapture(body);
  if (looksLikeSpam(input)) return { status: 200, body: { ok: true }, allowOrigin };
  const problem = validateCapture(input);
  if (problem) return { status: 422, body: { ok: false, message: problem.message, field: problem.field }, allowOrigin };
  await recordLead(form.tenantId, {
    name: input.name,
    phone: input.phone,
    email: input.email,
    message: input.message,
    origin: { source: input.source || `formulario:${form.name}`, medium: input.medium || "formulario", campaign: input.campaign || form.campaign || "" },
    source: `FORM:${form.name}`.slice(0, 80),
    consent: true,
  });
  return { status: 200, body: { ok: true }, allowOrigin };
}

/** Preflight (CORS) del navegador: devuelve el origen a anunciar solo si el formulario existe, está encendido y ese origen está permitido. */
export async function preflightOrigin(key: string, origin: string | null): Promise<string | null> {
  const o = origin ? normalizeOrigin(origin) : null;
  if (!o || !FORM_KEY_PATTERN.test(key)) return null;
  const form = await db.orm.public.LeadForm.where({ publicKey: key }).first();
  return form && form.enabled && originAllowed(form.allowedOrigins ?? [], o) ? o : null;
}
