/**
 * Plantillas y avisos de WhatsApp (HU-whatsapp-negocio-02), reglas puras: variables, el reconocimiento de una BAJA y la decisión de
 * cómo sale un aviso según las reglas de Meta (ventana de 24 h y plantilla aprobada) y del consentimiento del contacto.
 */
export type MetaStatus = "NONE" | "PENDING" | "APPROVED" | "REJECTED";
export const META_STATUS_TEXT: Record<MetaStatus, string> = { NONE: "Sin enviar a Meta", PENDING: "En revisión en Meta", APPROVED: "Aprobada por Meta", REJECTED: "Rechazada por Meta" };

export const NOTICE_EVENTS = ["order.paid", "order.created", "cart.abandoned", "order.confirmed", "order.ready", "order.shipped", "order.delivered"] as const;
export type NoticeEvent = (typeof NOTICE_EVENTS)[number];

/** Hechos del outbox que pueden originar avisos. `order.status_changed` se reparte por su estado nuevo (ver `noticeEventFor`). */
export const NOTICE_SOURCES = ["order.paid", "order.created", "cart.abandoned", "order.status_changed"] as const;

const BY_STATE: Record<string, NoticeEvent> = { CONFIRMED: "order.confirmed", READY: "order.ready", SHIPPED: "order.shipped", DELIVERED: "order.delivered" };

/** Aviso que corresponde a un hecho del outbox, o `null` si no avisa (p. ej. pasar a producción o cancelar no se le dice al cliente). */
export function noticeEventFor(type: string, payload: { to?: string } | null): NoticeEvent | null {
  if (type === "order.status_changed") return BY_STATE[payload?.to ?? ""] ?? null;
  return (NOTICE_EVENTS as readonly string[]).includes(type) ? (type as NoticeEvent) : null;
}

const VARIABLE = /\{\{\s*([a-z_]+)\s*\}\}/g;

/** Variables que usa un texto, en orden de aparición y sin repetir. */
export const variablesOf = (body: string): string[] => [...new Set([...body.matchAll(VARIABLE)].map((m) => m[1]!))];

/** Rellena las variables; una que falta se deja a la vista (`{{codigo}}`) para que no salga un aviso con huecos escondidos. */
export const renderTemplate = (body: string, vars: Record<string, string | number | undefined | null>): string =>
  body.replace(VARIABLE, (whole, name: string) => (vars[name] === undefined || vars[name] === null || vars[name] === "" ? whole : String(vars[name])));

/** ¿Quedan variables sin rellenar? */
export const hasMissingVariables = (rendered: string) => /\{\{\s*[a-z_]+\s*\}\}/.test(rendered);

export function validateTemplate(t: { key: string; title: string; body: string; event?: string | null }): string | null {
  if (!/^[a-z][a-z0-9_]{2,40}$/.test(t.key)) return "La clave son minúsculas, números y guion bajo (por ejemplo pedido_pagado).";
  if (t.title.trim().length < 3) return "Ponle un título a la plantilla.";
  if (t.body.trim().length < 5) return "Escribe el texto del mensaje.";
  if (t.body.length > 1000) return "El mensaje es muy largo (máximo 1000 caracteres).";
  if (t.event && !(NOTICE_EVENTS as readonly string[]).includes(t.event)) return "Ese hecho no puede disparar avisos.";
  return null;
}

const OPT_OUT = /^(baja|stop|parar|cancelar suscripci[oó]n|no m[aá]s|no quiero m[aá]s mensajes|darme de baja)$/i;

/** ¿El mensaje del contacto es una BAJA? Coincide con el mensaje entero (no con una frase que contenga la palabra). */
export const isOptOut = (text: string) => OPT_OUT.test(text.trim().replace(/[.!¡¿?]+$/g, ""));

export type SendDecision =
  | { action: "send_text" }
  | { action: "send_template" }
  | { action: "manual"; reason: string }
  | { action: "block"; reason: string };

/**
 * Cómo sale un aviso. Una BAJA detiene todo, incluso el envío con un toque. Sin consentimiento nunca sale solo (queda para que una
 * persona decida). Dentro de la ventana de 24 h sale texto libre; fuera, solo con plantilla aprobada por Meta; si no, queda listo
 * para enviar con un toque. Sin conexión tampoco sale por la API.
 */
export function decideSend(i: { optedOut: boolean; consent: boolean; connected: boolean; windowOpen: boolean; templateStatus: MetaStatus | null }): SendDecision {
  if (i.optedOut) return { action: "block", reason: "El contacto pidió no recibir más avisos (baja)." };
  if (!i.consent) return { action: "manual", reason: "Sin consentimiento del contacto: no sale solo; envíalo tú si te lo pidió." };
  if (!i.connected) return { action: "manual", reason: "Aún no conectas tu número de WhatsApp Business." };
  if (i.windowOpen) return { action: "send_text" };
  if (i.templateStatus === "APPROVED") return { action: "send_template" };
  return { action: "manual", reason: "Pasaron más de 24 h desde su último mensaje y no hay una plantilla aprobada por Meta." };
}

/** Plantillas de partida de un negocio nuevo: utilidad (avisos del pedido), sin promoción. */
export const DEFAULT_TEMPLATES: readonly { key: string; title: string; event: NoticeEvent; body: string }[] = [
  { key: "pedido_creado", title: "Pedido recibido", event: "order.created", body: "Hola {{nombre}}, recibimos tu pedido {{codigo}} por {{total}}. Te avisamos cuando lo confirmemos. — {{negocio}}" },
  { key: "pedido_pagado", title: "Pago recibido", event: "order.paid", body: "Hola {{nombre}}, recibimos el pago de tu pedido {{codigo}} por {{total}}. ¡Gracias por tu compra! — {{negocio}}" },
  { key: "pedido_confirmado", title: "Pedido confirmado", event: "order.confirmed", body: "Hola {{nombre}}, confirmamos tu pedido {{codigo}}. Ya lo estamos preparando. — {{negocio}}" },
  { key: "pedido_listo", title: "Pedido listo", event: "order.ready", body: "Hola {{nombre}}, tu pedido {{codigo}} está listo. — {{negocio}}" },
  { key: "pedido_enviado", title: "Pedido enviado", event: "order.shipped", body: "Hola {{nombre}}, tu pedido {{codigo}} va en camino. — {{negocio}}" },
  { key: "pedido_entregado", title: "Pedido entregado", event: "order.delivered", body: "Hola {{nombre}}, entregamos tu pedido {{codigo}}. ¡Gracias por tu compra! — {{negocio}}" },
  { key: "carrito_abandonado", title: "Pedido sin pagar", event: "cart.abandoned", body: "Hola {{nombre}}, tu pedido {{codigo}} por {{total}} sigue sin pagar. Si necesitas ayuda, responde este mensaje. — {{negocio}}" },
];
