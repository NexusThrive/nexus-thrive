import { createHash } from "node:crypto";
import { contentProblems } from "./payload";
import type { EInvoicePort, FiscalPayload } from "./port";

/** Total desde el que la regla de PRUEBA exige el documento del adquirente (no es una regla de la DIAN). */
export const SANDBOX_ACQUIRER_THRESHOLD = 500_000;

/**
 * Proveedor tecnológico de PRUEBA: acepta o rechaza con una causa legible, sin tocar la DIAN. Sirve
 * para desarrollar y probar el flujo completo (cola → envío → estado) antes de contratar uno real.
 */
export const sandboxEInvoice: EInvoicePort = {
  provider: "sandbox",
  label: "Proveedor de prueba",
  async submit(payload: FiscalPayload) {
    const problems = contentProblems(payload);
    if (!payload.acquirer.documentNumber && payload.total >= SANDBOX_ACQUIRER_THRESHOLD) problems.push(`El adquirente necesita número de documento cuando el total llega a ${SANDBOX_ACQUIRER_THRESHOLD.toLocaleString("es-CO")} (regla del proveedor de prueba).`);
    if (problems.length) return { status: "REJECTED" as const, reason: problems.join(" ") };
    const digest = createHash("sha256").update(`${payload.issuer.documentNumber}|${payload.code}|${payload.total}`).digest("hex");
    return { status: "ACCEPTED" as const, providerRef: `sbx-${digest.slice(0, 12)}`, cufe: digest };
  },
};
