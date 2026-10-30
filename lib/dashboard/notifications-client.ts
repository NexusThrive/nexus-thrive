import type { AppNotification } from "@/lib/dashboard/notifications";

/**
 * Aviso interno del navegador: «algo cambió, revisa las notificaciones». Lo
 * dispara cualquier acción que pueda generar una (un cobro, un gasto, una alta…)
 * y el centro de notificaciones lo escucha para actualizarse sin esperar al
 * sondeo de cada minuto (unos segundos después de la acción, no encima de ella). `ToastProvider` lo emite en cada éxito, así
 * que las acciones nuevas lo heredan sin hacer nada.
 *
 * Si la acción ya sabe qué notificación genera (un cobro de $ 120.000), la pasa
 * en `arrival`: el aviso sale pasados unos segundos sin esperar a que el
 * servidor la devuelva, y la lista real se actualiza a la vez.
 */
export const NOTIFICATIONS_REFRESH = "nx:notifications-refresh";

export type NotificationArrival = Pick<AppNotification, "kind" | "title" | "detail" | "href">;

export function requestNotificationsRefresh(arrival?: NotificationArrival): void {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent<NotificationArrival | undefined>(NOTIFICATIONS_REFRESH, { detail: arrival }));
}
