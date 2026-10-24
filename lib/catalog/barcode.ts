/**
 * Códigos de barras. EAN-13, EAN-8 y UPC-A llevan un dígito verificador (GS1):
 * se valida para atrapar errores de digitación y lecturas incompletas. CODE128 e
 * INTERNO son libres (códigos propios del negocio).
 */
export type Symbology = "EAN13" | "EAN8" | "UPCA" | "CODE128" | "INTERNO";

/** Dígito verificador GS1: de derecha a izquierda pesos 3,1,3,1… sobre el cuerpo. */
export function gs1CheckDigit(body: string): number {
  let sum = 0;
  for (let i = 0; i < body.length; i++) sum += Number(body[body.length - 1 - i]) * (i % 2 === 0 ? 3 : 1);
  return (10 - (sum % 10)) % 10;
}

export function isValidGtin(code: string): boolean {
  if (!/^\d+$/.test(code) || ![8, 12, 13].includes(code.length)) return false;
  return gs1CheckDigit(code.slice(0, -1)) === Number(code.slice(-1));
}

export function detectSymbology(code: string): Symbology {
  if (/^\d{13}$/.test(code)) return "EAN13";
  if (/^\d{12}$/.test(code)) return "UPCA";
  if (/^\d{8}$/.test(code)) return "EAN8";
  return "CODE128";
}

export type BarcodeCheck = { ok: true; code: string; symbology: Symbology } | { ok: false; message: string };

/** Limpia lo que escribe o lee el lector (espacios, saltos) y valida. */
export function checkBarcode(raw: string, symbology?: Symbology): BarcodeCheck {
  const code = raw.replace(/[\s\u0000-\u001f]/g, "");
  if (code.length < 3 || code.length > 48 || !/^[A-Za-z0-9._\-]+$/.test(code)) return { ok: false, message: "El código solo puede llevar letras, números, punto, guion y guion bajo (3 a 48 caracteres)." };
  const kind = symbology ?? detectSymbology(code);
  if ((kind === "EAN13" || kind === "EAN8" || kind === "UPCA") && !isValidGtin(code)) {
    return { ok: false, message: "El dígito verificador no coincide: revisa que el código esté completo y bien escrito." };
  }
  return { ok: true, code, symbology: kind };
}
