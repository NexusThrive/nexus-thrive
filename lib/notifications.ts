/**
 * Notificaciones del negocio a partir de datos reales: cobros y gastos de
 * hoy, citas de hoy y membresías por vencer o vencidas. Pura: el servidor
 * reúne los datos y aquí se arma la lista que pinta la campana.
 */

export type NotificationKind = "payment" | "expense" | "booking" | "membership";

export type AppNotification = {
  id: string;
  kind: NotificationKind;
  title: string;
  detail: string;
  /** ISO: ordena la lista y decide si es nueva (posterior a la última vista). */
  at: string;
  /** Ruta dentro del negocio (sin el slug). */
  href: string;
};

const cop = (n: number) => `$ ${Math.round(n).toLocaleString("es-CO")}`;

export function buildNotifications(input: {
  movements: { id: string; type: "in" | "out"; title: string; subtitle: string; amount: number; at: string }[];
  bookings: { id: string; at: string; service: string; customer: string }[];
  expiring: number;
  expired: number;
  /** ISO del inicio de hoy (Bogotá): las alertas de membresía se fechan ahí. */
  todayStart: string;
  modules: { finance: boolean; bookings: boolean; memberships: boolean };
}): AppNotification[] {
  const out: AppNotification[] = [];
  if (input.modules.finance) {
    for (const m of input.movements) {
      out.push({
        id: m.id,
        kind: m.type === "in" ? "payment" : "expense",
        title: m.type === "in" ? `Pago recibido · ${cop(m.amount)}` : `Gasto · ${cop(m.amount)}`,
        detail: m.type === "in" ? `${m.title} · ${m.subtitle}` : m.title,
        at: m.at,
        href: "/finance",
      });
    }
  }
  if (input.modules.bookings) {
    for (const b of input.bookings) {
      out.push({ id: `booking-${b.id}`, kind: "booking", title: `Cita hoy · ${b.service}`, detail: b.customer, at: b.at, href: "/bookings" });
    }
  }
  if (input.modules.memberships) {
    if (input.expiring > 0) {
      out.push({
        id: `expiring-${input.todayStart.slice(0, 10)}-${input.expiring}`,
        kind: "membership",
        title: input.expiring === 1 ? "1 membresía vence esta semana" : `${input.expiring} membresías vencen esta semana`,
        detail: "Recuérdales renovar por WhatsApp",
        at: input.todayStart,
        href: "/memberships",
      });
    }
    if (input.expired > 0) {
      out.push({
        id: `expired-${input.todayStart.slice(0, 10)}-${input.expired}`,
        kind: "membership",
        title: input.expired === 1 ? "1 membresía vencida" : `${input.expired} membresías vencidas`,
        detail: "Pendientes de renovación",
        at: input.todayStart,
        href: "/memberships",
      });
    }
  }
  return out.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0)).slice(0, 12);
}

/** Cuántas son posteriores a la última vez que se abrió la campana. */
export function unreadCount(items: AppNotification[], lastSeen: string | null): number {
  if (!lastSeen) return items.length;
  return items.filter((n) => n.at > lastSeen).length;
}
