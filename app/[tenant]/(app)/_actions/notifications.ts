"use server";

import type { AppNotification } from "@/lib/experience/dashboard/notifications";
import { dismissNotification, loadInbox, loadNotifications, setArchived, setRead } from "@/lib/experience/dashboard/notifications-db";
import type { InboxItem } from "@/lib/experience/dashboard/inbox";
import { requireTenantContext } from "@/lib/core/tenancy/context";

/**
 * Notificaciones de la campana: cobros y gastos de hoy, citas de hoy y
 * membresías por vencer o vencidas, solo de los módulos activos. Verifica
 * sesión y pertenencia al negocio (requireTenantContext); sin acceso, vacía.
 */
export async function loadNotificationsAction(tenantSlug: string): Promise<AppNotification[]> {
  const ctx = await requireTenantContext(tenantSlug);
  if (!ctx) return [];
  return loadNotifications(ctx.tenantId, ctx.memberId, ctx.role);
}

/** Descarta una notificación para esta persona (deslizar o ×). */
export async function dismissNotificationAction(tenantSlug: string, key: string): Promise<void> {
  const ctx = await requireTenantContext(tenantSlug);
  if (!ctx || !key || key.length > 200) return;
  await dismissNotification(ctx.memberId, key);
}

/** El buzón de notificaciones (historial con estado de lectura y archivo). Sin acceso, vacío. */
export async function loadInboxAction(tenantSlug: string): Promise<InboxItem[]> {
  const ctx = await requireTenantContext(tenantSlug);
  if (!ctx) return [];
  return loadInbox(ctx.tenantId, ctx.memberId, ctx.role);
}

/** Marca como leídas o no leídas las notificaciones indicadas (solo de esta persona). */
export async function setNotificationsReadAction(tenantSlug: string, ids: string[], read: boolean): Promise<void> {
  const ctx = await requireTenantContext(tenantSlug);
  if (!ctx) return;
  await setRead(ctx.memberId, ids, read);
}

/** Archiva o devuelve al buzón las notificaciones indicadas (solo de esta persona). */
export async function setNotificationsArchivedAction(tenantSlug: string, ids: string[], archived: boolean): Promise<void> {
  const ctx = await requireTenantContext(tenantSlug);
  if (!ctx) return;
  await setArchived(ctx.memberId, ids, archived);
}
