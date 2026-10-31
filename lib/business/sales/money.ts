/**
 * Dinero en formato colombiano: punto de miles y coma decimal
 * ("1.250.000,50"). Puro: lo usan los campos de precio de toda la app.
 */

/** Texto que escribe la persona → número. Acepta "1.250.000", "1250000,5" o "1,250,000.50". */
export function parseMoney(raw: string): number | null {
  const s = raw.replace(/[^\d.,-]/g, "");
  if (!s || s === "-") return null;
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  let normalized: string;
  if (lastComma > -1 && lastDot > -1) {
    // El separador que aparece último es el decimal.
    normalized = lastComma > lastDot ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  } else if (lastComma > -1) {
    const decimals = s.length - lastComma - 1;
    normalized = decimals > 0 && decimals <= 2 && s.split(",").length === 2 ? s.replace(",", ".") : s.replace(/,/g, "");
  } else if (lastDot > -1) {
    const parts = s.split(".");
    const decimals = s.length - lastDot - 1;
    // "1.250" o "1.250.000" son miles; "12.5" o "12.50" (un solo punto, 1–2 decimales) es decimal.
    normalized = parts.length === 2 && decimals > 0 && decimals <= 2 ? s : s.replace(/\./g, "");
  } else normalized = s;
  const n = Number(normalized);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

/** Número → "1.250.000" o "1.250.000,50" (sin símbolo). */
export function formatMoneyInput(n: number, decimals: 0 | 2 = 0): string {
  const fixed = Math.abs(n).toFixed(decimals);
  const [int, dec] = fixed.split(".");
  const withDots = int.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${n < 0 ? "-" : ""}${withDots}${dec && Number(dec) > 0 ? `,${dec}` : ""}`;
}

/**
 * Formatea mientras se escribe sin mover el cursor del todo: deja la coma y
 * hasta 2 decimales tal como se escriben.
 */
export function liveFormat(raw: string): string {
  const clean = raw.replace(/[^\d,]/g, "");
  const [int, ...rest] = clean.split(",");
  const intDigits = int.replace(/^0+(?=\d)/, "");
  const dotted = intDigits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return rest.length ? `${dotted || "0"},${rest.join("").slice(0, 2)}` : dotted;
}
