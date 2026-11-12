"use client";

import { useCallback } from "react";
import { NotificationCenter } from "@/components/organisms/notification-center";
import type { AppNotification } from "@/lib/experience/dashboard/notifications";
import { desktopPayload, shouldShowDesktop, showDesktopNotification, useDesktopNotifications } from "@/lib/experience/dashboard/desktop-notifications";
import { dismissNotificationAction, loadNotificationsAction } from "../_actions/notifications";

/** Campana del negocio: liga el centro de notificaciones a su acción de servidor y a los avisos de escritorio. */
export default function TenantNotifications({ tenantSlug }: { tenantSlug: string }) {
  const load = useCallback(() => loadNotificationsAction(tenantSlug), [tenantSlug]);
  const hrefFor = useCallback((path: string) => `/${tenantSlug}${path}`, [tenantSlug]);
  const dismiss = useCallback((id: string) => dismissNotificationAction(tenantSlug, id), [tenantSlug]);
  const { enabled } = useDesktopNotifications(tenantSlug);
  // Lo que llega con la pestaña de fondo (o sin foco) sale también como aviso del sistema, si la persona lo encendió.
  const onArrivals = useCallback(
    (items: AppNotification[]) => {
      if (!enabled || !shouldShowDesktop()) return;
      const payload = desktopPayload(items, hrefFor);
      if (payload) void showDesktopNotification(payload);
    },
    [enabled, hrefFor],
  );
  return <NotificationCenter load={load} hrefFor={hrefFor} onDismiss={dismiss} onArrivals={onArrivals} storageKey={`nx:notifications-seen:${tenantSlug}`} />;
}
