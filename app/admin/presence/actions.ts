"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/prisma/db";
import { requireStaff } from "@/lib/ops/access";
import { scanTenantPresence } from "@/lib/presence/scan";

/**
 * Acciones de Presence Thrive en el Operations Center. Cada una verifica el
 * permiso en el servidor con `requireStaff`.
 */

export type PresenceAdminState = { status: "idle" | "ok" | "error"; message?: string };

const STATUSES = ["PENDING", "DESIGN", "REVIEW", "PUBLISHED", "CANCELLED"] as const;

/** Actualiza el estado/pipeline de una solicitud de sitio. */
export async function updatePresenceRequestAction(
  _prev: PresenceAdminState,
  formData: FormData,
): Promise<PresenceAdminState> {
  const staff = await requireStaff("presence.manage");
  if (!staff) return { status: "error", message: "No tienes permiso para gestionar solicitudes." };

  const requestId = String(formData.get("requestId") ?? "").trim();
  if (!requestId) return { status: "error", message: "Solicitud inválida." };

  const status = String(formData.get("status") ?? "");
  if (!STATUSES.includes(status as (typeof STATUSES)[number])) {
    return { status: "error", message: "Estado inválido." };
  }

  const rawUrl = String(formData.get("publishedUrl") ?? "").trim();
  if (rawUrl && !/^https?:\/\//i.test(rawUrl)) {
    return { status: "error", message: "La URL publicada debe empezar por http(s)://." };
  }

  const staffNotes = String(formData.get("staffNotes") ?? "").trim() || null;

  await db.orm.public.PresenceRequest.where({ id: requestId }).update({
    status,
    publishedUrl: rawUrl || null,
    staffNotes,
    ...(status === "PUBLISHED"
      ? { paidAt: Temporal.Instant.fromEpochMilliseconds(Date.now()) }
      : {}),
  });

  revalidatePath("/admin/presence");
  return { status: "ok", message: "Solicitud actualizada." };
}

/** Vuelve a escanear el sitio de un negocio desde el panel. */
export async function rescanPresenceAction(tenantId: string): Promise<PresenceAdminState> {
  const staff = await requireStaff("presence.manage");
  if (!staff) return { status: "error", message: "No tienes permiso para reanalizar." };

  const score = await scanTenantPresence(tenantId);
  if (score === null) return { status: "error", message: "Negocio no encontrado." };

  revalidatePath("/admin/presence");
  return { status: "ok", message: `Presencia reanalizada: ${score}/100.` };
}
