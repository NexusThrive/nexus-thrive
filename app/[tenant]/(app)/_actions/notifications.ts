"use server";

import type { AppNotification } from "@/lib/dashboard/notifications";
import { dismissNotification, loadNotifications } from "@/lib/dashboard/notifications-db";
import { requireTenantContext } from "@/lib/tenant/context";

/**
 * Notificaciones de la campana: cobros y gastos de hoy, citas de hoy y
 * membresías por vencer o vencidas, solo de los módulos activos. Verifica
 * sesión y pertenencia al negocio (requireTenantContext); sin acceso, vacía.
 */
export async function loadNotificationsAction(tenantSlug: string): Promise<AppNotification[]> {
  const ctx = await requireTenantContext(tenantSlug);
  if (!ctx) return [];
  return loadNotifications(ctx.tenantId, ctx.memberId);
}

/** Descarta una notificación para esta persona (deslizar o ×). */
export async function dismissNotificationAction(tenantSlug: string, key: string): Promise<void> {
  const ctx = await requireTenantContext(tenantSlug);
  if (!ctx || !key || key.length > 200) return;
  await dismissNotification(ctx.memberId, key);
}
