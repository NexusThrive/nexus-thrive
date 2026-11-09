"use server";

import { headers } from "next/headers";
import { decideDeliverable } from "@/lib/business/customers/deliverables-db";
import { allowAttempt, recordAttempt } from "@/lib/foundation/rate-limit";

export type DecisionResult = { ok: true; message: string } | { ok: false; message: string; field?: string };

/** Decisión pública del cliente (sin sesión; solo con el enlace). Con límite por IP para que nadie pruebe enlaces al azar. */
export async function decideDeliverableAction(token: string, input: { decision: string; name: string; comment: string }): Promise<DecisionResult> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? "desconocida";
  const bucket = `deliverable:${ip}`;
  if (!allowAttempt(bucket, 20)) return { ok: false, message: "Demasiados intentos seguidos. Inténtalo en unos minutos." };
  recordAttempt(bucket, 20);
  const r = await decideDeliverable(token, input);
  if (!r.ok) return r;
  return { ok: true, message: r.status === "APPROVED" ? "¡Gracias! Quedó aprobado." : "¡Gracias! Enviamos tus cambios." };
}
