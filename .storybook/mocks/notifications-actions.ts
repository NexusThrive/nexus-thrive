import type { AppNotification } from "@/lib/experience/dashboard/notifications";

/** Notificaciones de la campana del Inicio: datos de muestra, sin servidor ni base. */
export async function loadNotificationsAction(_slug: string): Promise<AppNotification[]> {
  const now = Date.now();
  return [
    { id: "p1", kind: "payment", title: "Pago recibido · $ 89.000", detail: "Carlos Peña · Membresía Plata · Nequi", at: new Date(now - 6 * 60_000).toISOString(), href: "/finanzas" },
    { id: "m1", kind: "membership", title: "3 membresías vencen esta semana", detail: "Recuérdales renovar por WhatsApp", at: new Date(now - 5 * 3600_000).toISOString(), href: "/memberships" },
  ];
}

export async function dismissNotificationAction(_slug: string, _key: string): Promise<void> {}
