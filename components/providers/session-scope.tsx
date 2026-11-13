"use client";

import { setSectionScope } from "@/lib/experience/hooks/section-cache";

/**
 * Fija el alcance de la caché de secciones (`usuario:negocio`) antes de que cualquier hijo la lea. Si cambia la persona o el negocio, la
 * caché se vacía sola. Es idempotente, por eso puede llamarse al renderizar.
 */
export function SessionScope({ userId, tenantId }: { userId: string; tenantId: string }) {
  setSectionScope(`${userId}:${tenantId}`);
  return null;
}
