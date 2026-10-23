import { parseCopAmount } from "@/lib/finance/cop-amount";
import type { PaymentMethodValue } from "@/lib/finance";

/**
 * Lectura de comprobantes de pago (FLU·05): la foto se interpreta en el
 * cliente con QR (`BarcodeDetector`) y, de forma best-effort, con OCR
 * (tesseract.js). Estas funciones son puras para poderlas probar: convierten
 * el texto crudo (payload del QR o texto OCR) en monto canónico, método
 * sugerido y referencia del proveedor.
 */

/** Un candidato a monto con signo de pesos o separadores de miles. */
const AMOUNT_TOKEN = /\$?\s?\d{1,3}(?:[.,\s]\d{3})+(?:[.,]\d{1,2})?|\$?\s?\d+(?:[.,]\d{1,2})?/g;

/**
 * Montos detectados en texto libre (OCR o payload), en formato canónico de
 * `parseCopAmount` y ordenados de mayor a menor. Un solo dígito aislado
 * también cuenta ("50000"), porque los recibos pequeños lo escriben así.
 */
export function extractCopAmounts(text: string): string[] {
  const found = new Set<string>();
  for (const token of text.match(AMOUNT_TOKEN) ?? []) {
    const parsed = parseCopAmount(token);
    if (parsed) found.add(parsed);
  }
  return [...found].sort((a, b) => (Number(b) - Number(a)) || b.length - a.length);
}

/** Palabras que suelen anteceder al valor real en un comprobante. */
const AMOUNT_CONTEXT = /\b(?:valor|total|monto|importe|pagad[oa]|pagaste|recibist[ea]|recibido|pago)\b/i;

/**
 * El monto más probable del texto. Prioriza el número precedido por `$`
 * (como hace Nequi: "Enviado a … $ 45.000"), porque referencias, cédulas
 * o celulares sueltos suelen ser más grandes que el valor real. Si no hay
 * signo, usa palabras clave ("total", "valor", "pagaste"…) y solo como
 * último recurso el número más grande.
 */
export function bestCopAmount(text: string): string | null {
  const withSign: string[] = [];
  const withWord: string[] = [];
  const plain: string[] = [];
  for (const match of text.matchAll(AMOUNT_TOKEN)) {
    const raw = match[0];
    const amount = parseCopAmount(raw);
    if (!amount) continue;
    const at = match.index ?? 0;
    const before = text.slice(Math.max(0, at - 18), at);
    if (/^\s*\$/.test(raw) || /\$\s*$/.test(before)) withSign.push(amount);
    else if (AMOUNT_CONTEXT.test(before)) withWord.push(amount);
    else plain.push(amount);
  }
  const largest = (list: string[]) => list.reduce<string | null>((best, current) => (best === null || Number(current) > Number(best) ? current : best), null);
  return largest(withSign) ?? largest(withWord) ?? largest(plain);
}

const METHOD_HINTS: { re: RegExp; method: PaymentMethodValue }[] = [
  { re: /nequi/i, method: "NEQUI" },
  { re: /wompi/i, method: "WOMPI" },
  { re: /transferencia|bancolombia|davivienda|bbva|banco|ach|pse/i, method: "TRANSFER" },
  { re: /efectivo|recibido en efectivo/i, method: "CASH" },
];

/** Método de pago sugerido a partir del texto del comprobante. */
export function guessPaymentMethod(text: string): PaymentMethodValue | null {
  for (const hint of METHOD_HINTS) {
    if (hint.re.test(text)) return hint.method;
  }
  return null;
}

export type ScannedPayment = {
  amount: string | null;
  method: PaymentMethodValue | null;
  reference: string | null;
};

/**
 * Payload de un QR de pago (Nequi, Wompi, link bancario…). Busca monto en
 * query params o en el texto llano, método por palabras clave y una
 * referencia si el payload la trae. Devuelve todo en null si no se puede
 * interpretar; el usuario igual confirma a mano.
 */
export function parseQrPaymentPayload(raw: string): ScannedPayment {
  const text = raw.trim();
  if (!text) return { amount: null, method: null, reference: null };

  let amount: string | null = null;
  let reference: string | null = null;

  // Query string (nequi://pay?amount=..., https://...?value=...).
  const query = /[?&](?:amount|value|valor|monto|total)=([^&\s]+)/i.exec(text);
  if (query) amount = parseCopAmount(decodeURIComponent(query[1]).replace(/[^\d.,]/g, ""));

  // JSON simple {"amount":50000,...}.
  if (!amount) {
    const json = /"(?:amount|value|valor|monto|total)"\s*:\s*"?([\d.,]+)"?/i.exec(text);
    if (json) amount = parseCopAmount(json[1]);
  }

  // Texto llano del comprobante ("Valor: $ 50.000").
  if (!amount) amount = bestCopAmount(text);

  // Referencia: transId/cod en query o JSON.
  const ref = /[?&](?:ref|reference|id|transaction|txid)=([^&\s]+)/i.exec(text) ?? /"(?:ref|reference|id|transaction|txid)"\s*:\s*"([^"]+)"/i.exec(text);
  if (ref) reference = ref[1].trim().slice(0, 80);

  return { amount, method: guessPaymentMethod(text), reference };
}
