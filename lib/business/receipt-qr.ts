/**
 * Código QR del comprobante (como el de Nequi): lleva el enlace público
 * firmado del recibo para que cualquiera pueda verificarlo, y se embebe en
 * el papel y en la imagen PNG como data URL base64 (`data:image/png;base64,…`),
 * así el comprobante es autocontenido.
 *
 * Es isomorfo: en el navegador usa `toDataURL` (canvas); en el servidor
 * (página pública /r) usa `toBuffer`.
 */

export type ReceiptQrInput = {
  /** Enlace público firmado del recibo (`/r/<id>.<hmac>`). */
  link?: string | null;
  /** Código del recibo (R-000123) para el payload de respaldo. */
  reference: string;
  total: string;
  business?: string;
};

/** Qué se codifica en el QR: el enlace verificable o un texto de respaldo. */
export function receiptQrPayload(input: ReceiptQrInput): string {
  if (input.link) return input.link;
  return ["NEXUS", input.business, input.reference, input.total].filter(Boolean).join(" | ");
}

const OPTIONS = { margin: 1, width: 320, errorCorrectionLevel: "M" as const };

/** QR como data URL PNG base64 (listo para `<img src>` o `drawImage`). */
export async function receiptQrDataUrl(text: string): Promise<string> {
  const mod = await import("qrcode");
  const QRCode = mod.default ?? mod;
  if (typeof document !== "undefined") {
    return QRCode.toDataURL(text, OPTIONS);
  }
  const buffer = await QRCode.toBuffer(text, OPTIONS);
  return `data:image/png;base64,${buffer.toString("base64")}`;
}
