import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Proveedores de la bandeja. Solo envían si están configurados; si no, la
 * respuesta queda registrada como "manual" y se envía con un clic (wa.me o
 * mailto). Nunca se marca como enviado lo que no salió.
 *
 * WhatsApp Cloud API (Meta): WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID,
 *   WHATSAPP_VERIFY_TOKEN (verificación del webhook), WHATSAPP_APP_SECRET (firma).
 * Correo saliente (Resend): RESEND_API_KEY, INBOX_EMAIL_FROM.
 * Correo entrante: INBOUND_EMAIL_SECRET (cabecera x-inbox-secret del webhook).
 */

export const providers = {
  whatsapp: () => !!(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID),
  email: () => !!(process.env.RESEND_API_KEY && process.env.INBOX_EMAIL_FROM),
};

export type SendResult = { delivery: "sent"; externalId: string | null } | { delivery: "manual" } | { delivery: "failed"; error: string };

export async function sendWhatsapp(to: string, body: string): Promise<SendResult> {
  if (!providers.whatsapp()) return { delivery: "manual" };
  try {
    const r = await fetch(`https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body } }),
    });
    const j = (await r.json().catch(() => ({}))) as { messages?: { id: string }[]; error?: { message?: string } };
    if (!r.ok) return { delivery: "failed", error: j.error?.message ?? `HTTP ${r.status}` };
    return { delivery: "sent", externalId: j.messages?.[0]?.id ?? null };
  } catch (e) {
    return { delivery: "failed", error: (e as Error).message };
  }
}

export async function sendEmail(to: string, subject: string, body: string): Promise<SendResult> {
  if (!providers.email()) return { delivery: "manual" };
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.INBOX_EMAIL_FROM, to: [to], subject, text: body }),
    });
    const j = (await r.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!r.ok) return { delivery: "failed", error: j.message ?? `HTTP ${r.status}` };
    return { delivery: "sent", externalId: j.id ?? null };
  } catch (e) {
    return { delivery: "failed", error: (e as Error).message };
  }
}

/** Firma X-Hub-Signature-256 de Meta. Sin secreto configurado, se rechaza. */
export function verifyMetaSignature(raw: string, header: string | null): boolean {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret || !header?.startsWith("sha256=")) return false;
  const expected = Buffer.from(createHmac("sha256", secret).update(raw).digest("hex"));
  const got = Buffer.from(header.slice(7));
  return expected.length === got.length && timingSafeEqual(expected, got);
}

export function verifyInboundEmailSecret(header: string | null): boolean {
  const secret = process.env.INBOUND_EMAIL_SECRET;
  if (!secret || !header) return false;
  const a = Buffer.from(secret);
  const b = Buffer.from(header);
  return a.length === b.length && timingSafeEqual(a, b);
}
