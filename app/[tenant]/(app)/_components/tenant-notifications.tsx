"use client";

import { useCallback } from "react";
import { NotificationCenter } from "@/components/organisms/notification-center";
import { dismissNotificationAction, loadNotificationsAction } from "../_actions/notifications";

/** Campana del negocio: liga el centro de notificaciones a su acción de servidor. */
export default function TenantNotifications({ tenantSlug }: { tenantSlug: string }) {
  const load = useCallback(() => loadNotificationsAction(tenantSlug), [tenantSlug]);
  const hrefFor = useCallback((path: string) => `/${tenantSlug}${path}`, [tenantSlug]);
  const dismiss = useCallback((id: string) => dismissNotificationAction(tenantSlug, id), [tenantSlug]);
  return <NotificationCenter load={load} hrefFor={hrefFor} onDismiss={dismiss} storageKey={`nx:notifications-seen:${tenantSlug}`} />;
}
