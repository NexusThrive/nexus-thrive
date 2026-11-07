"use server";

import { headers } from "next/headers";
import { submitProof, type ProofResult } from "@/lib/domains/finance/payments/intents-db";
import { allowAttempt, recordAttempt } from "@/lib/foundation/rate-limit";

/**
 * El cliente avisa desde el enlace público que pagó por transferencia. Sin sesión: se limita por IP y por enlace para
 * que nadie llene de avisos falsos el cobro de otro. El aviso NO confirma el pago: pasa a «en verificación».
 */
export async function submitProofAction(reference: string, note: string): Promise<ProofResult> {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || "desconocida";
  const key = `proof:${reference}:${ip}`;
  if (!allowAttempt(key, 5)) return { ok: false, message: "Enviaste varios avisos seguidos. Espera unos minutos." };
  recordAttempt(key, 5);
  return submitProof(reference, note);
}
