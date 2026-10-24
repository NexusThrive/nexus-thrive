import { checkWebhookUrl, resolvesPublic } from "@/lib/events/ssrf";
import type { EInvoicePort, FiscalPayload, SubmitResult } from "./port";

/**
 * Proveedor tecnológico por HTTP: entrega el documento fiscal a un servicio que lo firme y lo envíe
 * a la DIAN (el proveedor elegido, o un flujo de n8n que habla con él). NEXUS no conoce al proveedor:
 * solo cumple este contrato.
 *
 * Solicitud: `POST <url>` con `Authorization: Bearer <token>`, `Idempotency-Key: <código del documento>`
 * y el `FiscalPayload` en JSON. Respuesta esperada (JSON):
 *  - aceptado:   `{ "status": "ACCEPTED", "providerRef": "…", "cufe": "…" }`
 *  - rechazado:  `{ "status": "REJECTED", "reason": "causa legible" }`
 *  - recibido sin resultado todavía: `{ "status": "SUBMITTED", "providerRef": "…" }`
 * Un 5xx, un tiempo agotado o una respuesta que no se entiende NO es un rechazo: el documento vuelve a la
 * cola y se reintenta (la idempotencia evita duplicarlo del lado del proveedor).
 */
export class ProviderUnavailable extends Error {}

export function httpEInvoice(config: { url: string; token: string; label?: string }, fetchImpl: typeof fetch = fetch): EInvoicePort {
  return {
    provider: "http",
    label: config.label ?? "Proveedor tecnológico (HTTP)",
    async submit(payload: FiscalPayload): Promise<SubmitResult> {
      const checked = checkWebhookUrl(config.url);
      if (!checked.ok) throw new ProviderUnavailable(`URL del proveedor no válida: ${checked.reason}`);
      if (!(await resolvesPublic(checked.url.hostname))) throw new ProviderUnavailable("La dirección del proveedor no es pública.");
      let res: Response;
      try {
        res = await fetchImpl(checked.url, {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${config.token}`, "idempotency-key": payload.code },
          body: JSON.stringify(payload),
          redirect: "error",
          signal: AbortSignal.timeout(15_000),
        });
      } catch {
        throw new ProviderUnavailable("No se pudo contactar al proveedor.");
      }
      if (res.status >= 500 || res.status === 429) throw new ProviderUnavailable(`El proveedor respondió ${res.status}.`);
      let body: { status?: unknown; providerRef?: unknown; cufe?: unknown; reason?: unknown };
      try {
        body = (await res.json()) as typeof body;
      } catch {
        throw new ProviderUnavailable("La respuesta del proveedor no se entiende.");
      }
      if (body.status === "ACCEPTED" && typeof body.providerRef === "string" && typeof body.cufe === "string") return { status: "ACCEPTED", providerRef: body.providerRef.slice(0, 120), cufe: body.cufe.slice(0, 120) };
      if (body.status === "REJECTED") return { status: "REJECTED", reason: typeof body.reason === "string" && body.reason ? body.reason.slice(0, 400) : "El proveedor rechazó el documento sin dar causa." };
      if (body.status === "SUBMITTED" && typeof body.providerRef === "string") return { status: "SUBMITTED", providerRef: body.providerRef.slice(0, 120) };
      if (res.status >= 400) return { status: "REJECTED", reason: `El proveedor respondió ${res.status}.` };
      throw new ProviderUnavailable("La respuesta del proveedor no se entiende.");
    },
  };
}
