/**
 * Reglas de la bandeja de NEXUS (puras): normalizar contactos, la ventana
 * de 24 h de WhatsApp y leer el webhook de WhatsApp Cloud API (Meta).
 */

export type Channel = "WHATSAPP" | "EMAIL";

/** WhatsApp: solo dígitos; un celular colombiano de 10 dígitos gana el 57. Correo: minúsculas. */
export function normalizeHandle(channel: Channel, raw: string): string | null {
  if (channel === "EMAIL") {
    const m = raw.trim().toLowerCase().match(/<?([^\s<>@]+@[^\s<>@]+\.[^\s<>@]+)>?$/);
    return m ? m[1] : null;
  }
  let d = raw.replace(/\D/g, "");
  if (d.length === 10 && d.startsWith("3")) d = `57${d}`;
  return d.length >= 8 && d.length <= 15 ? d : null;
}

/** ¿Coinciden dos teléfonos? (mismos últimos 10 dígitos). */
export function samePhone(a: string | null | undefined, b: string | null | undefined) {
  const x = (a ?? "").replace(/\D/g, "");
  const y = (b ?? "").replace(/\D/g, "");
  return x.length >= 7 && y.length >= 7 && x.slice(-10) === y.slice(-10);
}

export const WHATSAPP_WINDOW_MS = 24 * 3_600_000;

/** WhatsApp solo permite texto libre dentro de 24 h desde el último mensaje del contacto. */
export function whatsappWindow(lastInboundMs: number | null, now: number): { open: boolean; leftMs: number } {
  if (lastInboundMs == null) return { open: false, leftMs: 0 };
  const left = lastInboundMs + WHATSAPP_WINDOW_MS - now;
  return { open: left > 0, leftMs: Math.max(0, left) };
}

export function waLink(handle: string, text: string) {
  return `https://wa.me/${handle}?text=${encodeURIComponent(text)}`;
}

export function mailtoLink(email: string, subject: string | null, body: string) {
  return `mailto:${email}?subject=${encodeURIComponent(subject ? `Re: ${subject.replace(/^re:\s*/i, "")}` : "NEXUS THRIVE")}&body=${encodeURIComponent(body)}`;
}

export type InboundMessage = { handle: string; name: string | null; body: string; externalId: string; at: number };

/** Mensajes entrantes de un webhook de WhatsApp Cloud API (ignora estados y lo que no es texto legible). */
export function parseWhatsappWebhook(payload: unknown): InboundMessage[] {
  const out: InboundMessage[] = [];
  const entries = (payload as { entry?: unknown[] })?.entry;
  if (!Array.isArray(entries)) return out;
  for (const e of entries) {
    for (const ch of ((e as { changes?: unknown[] }).changes ?? []) as { value?: { contacts?: { wa_id?: string; profile?: { name?: string } }[]; messages?: Record<string, unknown>[] } }[]) {
      const v = ch.value;
      if (!v?.messages) continue;
      for (const m of v.messages) {
        const from = String(m.from ?? "");
        const handle = normalizeHandle("WHATSAPP", from);
        if (!handle || typeof m.id !== "string") continue;
        const type = String(m.type ?? "");
        const body =
          type === "text"
            ? String((m.text as { body?: string })?.body ?? "")
            : type === "button"
              ? String((m.button as { text?: string })?.text ?? "")
              : type === "interactive"
                ? String(((m.interactive as { button_reply?: { title?: string }; list_reply?: { title?: string } })?.button_reply ?? (m.interactive as { list_reply?: { title?: string } })?.list_reply)?.title ?? "")
                : `[${type || "mensaje"} recibido — ábrelo en WhatsApp]`;
        const name = v.contacts?.find((c) => c.wa_id === from)?.profile?.name ?? null;
        out.push({ handle, name, body: body.slice(0, 4000), externalId: m.id, at: Number(m.timestamp ?? 0) * 1000 || Date.now() });
      }
    }
  }
  return out;
}
