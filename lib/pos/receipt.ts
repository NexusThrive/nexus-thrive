/**
 * Tiquete para impresora térmica (58 mm ≈ 32 columnas, 80 mm ≈ 42). Puro: arma las
 * líneas de texto y los bytes ESC/POS; la impresión la hace el navegador (página
 * optimizada) o una app de impresión que reciba los bytes.
 */
export type ReceiptData = {
  business: string;
  taxId?: string | null;
  code: string;
  date: string;
  cashier?: string | null;
  lines: { description: string; quantity: number; unitPrice: number; discountPct?: number; total: number }[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  tip: number;
  payments: { method: string; amount: number }[];
  change: number;
};

const money = (n: number) => Math.round(n).toLocaleString("es-CO");
const METHOD: Record<string, string> = { CASH: "Efectivo", NEQUI: "Nequi", WOMPI: "Wompi", TRANSFER: "Transferencia" };

const center = (t: string, w: number) => (t.length >= w ? t.slice(0, w) : " ".repeat(Math.floor((w - t.length) / 2)) + t);
const pair = (left: string, right: string, w: number) => {
  const room = w - right.length - 1;
  return `${left.length > room ? left.slice(0, Math.max(0, room)) : left.padEnd(room)} ${right}`;
};

export function receiptLines(r: ReceiptData, width: 32 | 42 = 42): string[] {
  const rule = "-".repeat(width);
  const out: string[] = [center(r.business, width)];
  if (r.taxId) out.push(center(`NIT ${r.taxId}`, width));
  out.push(center(r.code, width), center(r.date, width));
  if (r.cashier) out.push(center(`Atendió: ${r.cashier}`, width));
  out.push(rule);
  for (const l of r.lines) {
    out.push(l.description.slice(0, width));
    const detail = `${l.quantity} x ${money(l.unitPrice)}${l.discountPct ? ` (-${l.discountPct}%)` : ""}`;
    out.push(pair(`  ${detail}`, money(l.total), width));
  }
  out.push(rule, pair("Subtotal", money(r.subtotal - r.discountTotal), width));
  if (r.discountTotal) out.push(pair("Descuentos", `-${money(r.discountTotal)}`, width));
  if (r.taxTotal) out.push(pair("Impuestos", money(r.taxTotal), width));
  out.push(pair("TOTAL", money(r.total), width));
  if (r.tip) out.push(pair("Propina", money(r.tip), width));
  out.push(rule);
  for (const p of r.payments) out.push(pair(METHOD[p.method] ?? p.method, money(p.amount), width));
  if (r.change) out.push(pair("Cambio", money(r.change), width));
  out.push(rule, center("¡Gracias por tu compra!", width));
  return out;
}

const strip = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[¡¿]/g, "");

/** Bytes ESC/POS: inicializa, imprime el texto sin tildes (las impresoras básicas no las traen), avanza y corta. */
export function escposBytes(lines: readonly string[]): Uint8Array {
  const body = new TextEncoder().encode(`${lines.map(strip).join("\n")}\n\n\n`);
  const out = new Uint8Array(2 + body.length + 3);
  out.set([0x1b, 0x40], 0); // ESC @: reinicia
  out.set(body, 2);
  out.set([0x1d, 0x56, 0x00], 2 + body.length); // GS V 0: corte total
  return out;
}
